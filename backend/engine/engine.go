package engine

import (
	"container/heap"
	"math/rand"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Rohan0639/system-design-simulator/backend/models"
)

type EventType string

const (
	RequestArrive EventType = "request_arrive"
	RequestDone   EventType = "request_done"
)

type Event struct {
	Time      int64
	Type      EventType
	NodeID    string
	RequestID string
	index     int
}

type PriorityQueue []*Event

func (pq PriorityQueue) Len() int           { return len(pq) }
func (pq PriorityQueue) Less(i, j int) bool { return pq[i].Time < pq[j].Time }
func (pq PriorityQueue) Swap(i, j int)      { pq[i], pq[j] = pq[j], pq[i]; pq[i].index = i; pq[j].index = j }
func (pq *PriorityQueue) Push(x interface{}) {
	n := len(*pq)
	item := x.(*Event)
	item.index = n
	*pq = append(*pq, item)
}
func (pq *PriorityQueue) Pop() interface{} {
	old := *pq
	n := len(old)
	item := old[n-1]
	old[n-1] = nil
	item.index = -1
	*pq = old[0 : n-1]
	return item
}

// FIX 1: nodeMetrics holds all counters as atomics to prevent race conditions.
// int64 is required for atomic operations.
type nodeMetrics struct {
	currentRPS  int64
	avgLatency  int64
	queueDepth  int64
	cacheHits   int64
	cacheMisses int64
	connections int64
	droppedReqs int64
	statusMu    sync.Mutex // mutex only for string status field
	status      string
}

type SimulationEngine struct {
	Graph   models.Graph
	Config  models.SimulationConfig
	Events  PriorityQueue
	eventMu sync.Mutex // FIX 1: mutex protecting the shared priority queue

	metrics map[string]*nodeMetrics
}

func NewSimulationEngine(graph models.Graph, config models.SimulationConfig) *SimulationEngine {
	metrics := make(map[string]*nodeMetrics)
	for _, node := range graph.Nodes {
		metrics[node.ID] = &nodeMetrics{status: "ok"}
	}
	return &SimulationEngine{
		Graph:   graph,
		Config:  config,
		Events:  make(PriorityQueue, 0),
		metrics: metrics,
	}
}

func (e *SimulationEngine) Run(updateChan chan models.SimulationFrame) {
	defer close(updateChan)

	heap.Init(&e.Events)

	// Generate initial traffic from client nodes
	for _, node := range e.Graph.Nodes {
		if node.Type == models.Client {
			interval := int64(1000000 / e.Config.RPS)
			for t := int64(0); t < int64(e.Config.Duration)*1000000; t += interval {
				heap.Push(&e.Events, &Event{
					Time:   t,
					Type:   RequestArrive,
					NodeID: node.ID,
				})
			}
		}
	}

	currentTime := int64(0)
	lastUpdate := int64(0)
	lastRPSReset := int64(0)

	for e.Events.Len() > 0 {
		event := heap.Pop(&e.Events).(*Event)
		currentTime = event.Time

		// Reset RPS counters every simulated second
		if currentTime-lastRPSReset >= 1000000 {
			for _, m := range e.metrics {
				atomic.StoreInt64(&m.currentRPS, 0)
			}
			lastRPSReset = currentTime
		}

		e.handleEvent(event, currentTime)

		// Send telemetry frame every 100ms of simulated time
		if currentTime-lastUpdate > 100000 {
			frame := models.SimulationFrame{
				Time:  int(currentTime / 1000),
				Nodes: e.getCurrentStatus(),
			}
			updateChan <- frame
			lastUpdate = currentTime
			time.Sleep(10 * time.Millisecond)
		}
	}

	// Send final frame
	updateChan <- models.SimulationFrame{
		Time:  int(currentTime / 1000),
		Nodes: e.getCurrentStatus(),
	}
}

func (e *SimulationEngine) handleEvent(event *Event, currentTime int64) {
	node := e.findNode(event.NodeID)
	if node == nil {
		return
	}
	switch event.Type {
	case RequestArrive:
		e.processArrival(node, event, currentTime)
	case RequestDone:
		m := e.metrics[node.ID]
		if m != nil {
			if node.Type == models.Database || node.Type == models.Storage {
				atomic.AddInt64(&m.connections, -1)
			} else if node.Type == models.Queue {
				atomic.AddInt64(&m.queueDepth, -1)
			}
		}
	}
}

// FIX 2: Each node type has its own processing logic
func (e *SimulationEngine) processArrival(node *models.Node, event *Event, currentTime int64) {
	m := e.metrics[node.ID]

	switch node.Type {

	case models.Cache, models.CDN:
		// Cache: check hit ratio. Hit = serve fast. Miss = pass to next node with penalty.
		hitRatio := node.HitRatio
		if hitRatio == 0 {
			hitRatio = 0.8 // default 80% cache hit rate
		}
		if rand.Float64() < hitRatio {
			atomic.AddInt64(&m.cacheHits, 1)
			atomic.StoreInt64(&m.avgLatency, int64(node.Latency))
		} else {
			atomic.AddInt64(&m.cacheMisses, 1)
			// Cache miss: higher latency, still forward to next node
			atomic.StoreInt64(&m.avgLatency, int64(node.Latency*3))
			e.forwardToNextNode(node, event, currentTime, node.Latency*3)
			return
		}

	case models.Database, models.Storage:
		// Database: connection pool limit. Exceeding = hard rejection, not just slowdown.
		maxConn := node.MaxConnections
		if maxConn == 0 {
			maxConn = node.Capacity // fallback
		}
		
		currentConn := atomic.LoadInt64(&m.connections)
		if currentConn >= int64(maxConn) {
			// Hard reject — connection pool exhausted
			atomic.AddInt64(&m.droppedReqs, 1)
			m.statusMu.Lock()
			m.status = "overloaded"
			m.statusMu.Unlock()
			atomic.StoreInt64(&m.avgLatency, int64(node.Latency*4))
			return
		}
		
		// Occupy a connection
		atomic.AddInt64(&m.connections, 1)
		
		// Schedule virtual connection release when request processing finishes
		e.eventMu.Lock()
		heap.Push(&e.Events, &Event{
			Time:   currentTime + int64(node.Latency*1000),
			Type:   RequestDone,
			NodeID: node.ID,
		})
		e.eventMu.Unlock()

	case models.Queue:
		// Queue: accumulate backlog. Drop when full.
		maxDepth := node.MaxQueueDepth
		if maxDepth == 0 {
			maxDepth = node.Capacity
		}
		
		depth := atomic.LoadInt64(&m.queueDepth)
		if depth >= int64(maxDepth) {
			atomic.AddInt64(&m.droppedReqs, 1)
			m.statusMu.Lock()
			m.status = "overloaded"
			m.statusMu.Unlock()
			return
		}
		
		// Occupy a slot in queue
		atomic.AddInt64(&m.queueDepth, 1)
		
		// Schedule queue depth drain/release in future
		e.eventMu.Lock()
		heap.Push(&e.Events, &Event{
			Time:   currentTime + int64(node.Latency*1000),
			Type:   RequestDone,
			NodeID: node.ID,
		})
		e.eventMu.Unlock()
		
		// Queue drains slowly — simulate processing delay
		atomic.StoreInt64(&m.avgLatency, int64(node.Latency)+(depth*2))

	case models.LoadBalancer:
		// Load balancer: distribute evenly, very low latency overhead
		atomic.StoreInt64(&m.avgLatency, int64(node.Latency))

	default:
		// API Server, Client: standard RPS-based capacity check
		atomic.StoreInt64(&m.avgLatency, int64(node.Latency))
	}

	// FIX 1: Atomic increment — safe across goroutines
	rps := atomic.AddInt64(&m.currentRPS, 1)

	// Update status based on load
	m.statusMu.Lock()
	if rps > int64(node.Capacity) {
		m.status = "overloaded"
		atomic.StoreInt64(&m.avgLatency, int64(node.Latency*2))
	} else if rps > int64(node.Capacity/2) {
		m.status = "warning"
		atomic.StoreInt64(&m.avgLatency, int64(float64(node.Latency)*1.2))
	} else {
		m.status = "ok"
	}
	m.statusMu.Unlock()

	e.forwardToNextNode(node, event, currentTime, int(atomic.LoadInt64(&m.avgLatency)))
}

func (e *SimulationEngine) forwardToNextNode(node *models.Node, event *Event, currentTime int64, latencyMs int) {
	edges := e.findOutgoingEdges(node.ID)
	if len(edges) == 0 {
		return
	}

	// Load balancer distributes round-robin style; others pick random
	var targetEdge models.Edge
	if node.Type == models.LoadBalancer {
		rps := atomic.LoadInt64(&e.metrics[node.ID].currentRPS)
		targetEdge = edges[rps%int64(len(edges))]
	} else {
		targetEdge = edges[rand.Intn(len(edges))]
	}

	// FIX 1: Lock the priority queue before pushing new event
	e.eventMu.Lock()
	heap.Push(&e.Events, &Event{
		Time:   currentTime + int64(latencyMs*1000),
		Type:   RequestArrive,
		NodeID: targetEdge.Target,
	})
	e.eventMu.Unlock()
}

func (e *SimulationEngine) findNode(id string) *models.Node {
	for i := range e.Graph.Nodes {
		if e.Graph.Nodes[i].ID == id {
			return &e.Graph.Nodes[i]
		}
	}
	return nil
}

func (e *SimulationEngine) findOutgoingEdges(nodeID string) []models.Edge {
	var result []models.Edge
	for _, edge := range e.Graph.Edges {
		if edge.Source == nodeID {
			result = append(result, edge)
		}
	}
	return result
}

func (e *SimulationEngine) getCurrentStatus() []models.NodeStatus {
	var statuses []models.NodeStatus
	for id, m := range e.metrics {
		m.statusMu.Lock()
		status := m.status
		m.statusMu.Unlock()

		statuses = append(statuses, models.NodeStatus{
			ID:          id,
			Status:      status,
			CurrentRPS:  int(atomic.LoadInt64(&m.currentRPS)),
			AvgLatency:  int(atomic.LoadInt64(&m.avgLatency)),
			QueueDepth:  int(atomic.LoadInt64(&m.queueDepth)),
			CacheHits:   int(atomic.LoadInt64(&m.cacheHits)),
			CacheMisses: int(atomic.LoadInt64(&m.cacheMisses)),
			Connections: int(atomic.LoadInt64(&m.connections)),
			DroppedReqs: int(atomic.LoadInt64(&m.droppedReqs)),
		})
	}
	return statuses
}
