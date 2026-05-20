package engine

import (
	"testing"
	"time"

	"github.com/Rohan0639/system-design-simulator/backend/models"
)

// -------------------------------------------------------
// Helper: builds a simple 3-node graph
// Client → Cache → Database
// -------------------------------------------------------
func buildSimpleGraph() models.Graph {
	return models.Graph{
		Nodes: []models.Node{
			{
				ID:       "client-1",
				Type:     models.Client,
				Capacity: 10000,
				Latency:  1,
			},
			{
				ID:       "cache-1",
				Type:     models.Cache,
				Capacity: 5000,
				Latency:  2,
				HitRatio: 0.8, // 80% cache hit rate
			},
			{
				ID:             "db-1",
				Type:           models.Database,
				Capacity:       500,
				Latency:        20,
				MaxConnections: 5, // very low — easy to trigger rejection
			},
		},
		Edges: []models.Edge{
			{ID: "e1", Source: "client-1", Target: "cache-1"},
			{ID: "e2", Source: "cache-1", Target: "db-1"},
		},
	}
}

// -------------------------------------------------------
// TEST 1: Engine runs without panicking
// Most basic sanity check — does it start and finish?
// -------------------------------------------------------
func TestEngineRunsWithoutPanic(t *testing.T) {
	graph := buildSimpleGraph()
	config := models.SimulationConfig{RPS: 100, Duration: 2}

	sim := NewSimulationEngine(graph, config)
	updateChan := make(chan models.SimulationFrame, 50)

	done := make(chan bool)
	go func() {
		sim.Run(updateChan)
		done <- true
	}()

	select {
	case <-done:
		t.Log("PASS: Engine completed without panic")
	case <-time.After(10 * time.Second):
		t.Fatal("FAIL: Engine timed out — simulation never finished")
	}
}

// -------------------------------------------------------
// TEST 2: Race condition test
// Run with: go test -race ./...
// If Go's race detector finds any issue, it will fail here
// -------------------------------------------------------
func TestNoRaceCondition(t *testing.T) {
	graph := buildSimpleGraph()
	config := models.SimulationConfig{RPS: 1000, Duration: 2}

	sim := NewSimulationEngine(graph, config)
	updateChan := make(chan models.SimulationFrame, 100)

	done := make(chan bool)
	go func() {
		sim.Run(updateChan)
		done <- true
	}()

	// Drain frames concurrently — this is what triggers race conditions
	go func() {
		for range updateChan {
		}
	}()

	select {
	case <-done:
		t.Log("PASS: No race condition detected")
	case <-time.After(15 * time.Second):
		t.Fatal("FAIL: Timed out")
	}
}

// -------------------------------------------------------
// TEST 3: Frames are actually being sent
// Engine should stream at least 1 frame back
// -------------------------------------------------------
func TestEngineEmitsFrames(t *testing.T) {
	graph := buildSimpleGraph()
	config := models.SimulationConfig{RPS: 200, Duration: 2}

	sim := NewSimulationEngine(graph, config)
	updateChan := make(chan models.SimulationFrame, 50)

	go sim.Run(updateChan)

	frameCount := 0
	timeout := time.After(10 * time.Second)

	for {
		select {
		case _, ok := <-updateChan:
			if !ok {
				// Channel closed = simulation done
				if frameCount == 0 {
					t.Fatal("FAIL: Engine ran but emitted zero frames")
				}
				t.Logf("PASS: Engine emitted %d frames", frameCount)
				return
			}
			frameCount++
		case <-timeout:
			t.Fatalf("FAIL: Timed out after receiving %d frames", frameCount)
		}
	}
}

// -------------------------------------------------------
// TEST 4: Database hard-rejects when connections exceeded
// MaxConnections = 5, sending 500 RPS → should see overloaded + dropped reqs
// -------------------------------------------------------
func TestDatabaseRejectsOverCapacity(t *testing.T) {
	graph := models.Graph{
		Nodes: []models.Node{
			{ID: "client-1", Type: models.Client, Capacity: 10000, Latency: 1},
			{
				ID:             "db-1",
				Type:           models.Database,
				Capacity:       50,
				Latency:        20,
				MaxConnections: 5, // tiny pool — will overflow fast
			},
		},
		Edges: []models.Edge{
			{ID: "e1", Source: "client-1", Target: "db-1"},
		},
	}
	config := models.SimulationConfig{RPS: 500, Duration: 2}

	sim := NewSimulationEngine(graph, config)
	updateChan := make(chan models.SimulationFrame, 100)

	go sim.Run(updateChan)

	var lastFrame models.SimulationFrame
	for frame := range updateChan {
		lastFrame = frame
	}

	// Check DB node was marked overloaded at some point
	found := false
	for _, node := range lastFrame.Nodes {
		if node.ID == "db-1" && node.DroppedReqs > 0 {
			found = true
			t.Logf("PASS: DB dropped %d requests as expected", node.DroppedReqs)
		}
	}
	if !found {
		t.Fatal("FAIL: DB should have dropped requests but DroppedReqs = 0")
	}
}

// -------------------------------------------------------
// TEST 5: Cache generates hits and misses
// HitRatio = 0.8 → roughly 80% hits, 20% misses
// -------------------------------------------------------
func TestCacheHitMissRatio(t *testing.T) {
	graph := models.Graph{
		Nodes: []models.Node{
			{ID: "client-1", Type: models.Client, Capacity: 10000, Latency: 1},
			{
				ID:       "cache-1",
				Type:     models.Cache,
				Capacity: 5000,
				Latency:  2,
				HitRatio: 0.8,
			},
		},
		Edges: []models.Edge{
			{ID: "e1", Source: "client-1", Target: "cache-1"},
		},
	}
	config := models.SimulationConfig{RPS: 300, Duration: 3}

	sim := NewSimulationEngine(graph, config)
	updateChan := make(chan models.SimulationFrame, 100)

	go sim.Run(updateChan)

	var lastFrame models.SimulationFrame
	for frame := range updateChan {
		lastFrame = frame
	}

	for _, node := range lastFrame.Nodes {
		if node.ID == "cache-1" {
			total := node.CacheHits + node.CacheMisses
			if total == 0 {
				t.Fatal("FAIL: Cache processed zero requests")
			}
			actualHitRatio := float64(node.CacheHits) / float64(total)
			t.Logf("Cache hits: %d, misses: %d, hit ratio: %.2f", node.CacheHits, node.CacheMisses, actualHitRatio)

			// Allow 15% variance from expected 0.8
			if actualHitRatio < 0.65 || actualHitRatio > 0.95 {
				t.Fatalf("FAIL: Hit ratio %.2f is outside expected range [0.65, 0.95]", actualHitRatio)
			}
			t.Log("PASS: Cache hit ratio is within expected range")
		}
	}
}

// -------------------------------------------------------
// TEST 6: Low RPS stays healthy (no overloads)
// -------------------------------------------------------
func TestLowRPSStaysHealthy(t *testing.T) {
	graph := buildSimpleGraph()
	config := models.SimulationConfig{RPS: 10, Duration: 2} // very low load

	sim := NewSimulationEngine(graph, config)
	updateChan := make(chan models.SimulationFrame, 50)

	go sim.Run(updateChan)

	var lastFrame models.SimulationFrame
	for frame := range updateChan {
		lastFrame = frame
	}

	for _, node := range lastFrame.Nodes {
		if node.Status == "overloaded" {
			t.Fatalf("FAIL: Node %s is overloaded under low RPS (10 RPS) — something is wrong", node.ID)
		}
	}
	t.Log("PASS: All nodes healthy under low load")
}
