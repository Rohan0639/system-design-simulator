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

type nodeMetrics struct {
	currentRPS  int64
	peakRPS     int64 // FIX 3: track peak separately, never reset
	avgLatency  int64
	queueDepth  int64
	cacheHits   int64
	cacheMisses int64
	connections int64
	droppedReqs int64
	statusMu    sync.Mutex
	status      string
}

type SimulationEngine struct {
	Graph   models.Graph
	Config  models.SimulationConfig
	Events  PriorityQueue
	eventMu sync.Mutex

	metrics     map[string]*nodeMetrics
	entryNodeID string // FIX 3: track entry point for accurate peak RPS
}

func NewSimulationEngine(graph models.Graph, config models.SimulationConfig) *SimulationEngine {
	metrics := make(map[string]*nodeMetrics)
	entryNodeID := ""

	for _, node := range graph.Nodes {
		metrics[node.ID] = &nodeMetrics{status: "ok"}
		// FIX 3: load_balancer is the real entry point for measuring throughput
		if node.Type == models.LoadBalancer {
			entryNodeID = node.ID
		}
	}

	return &SimulationEngine{
		Graph:       graph,
		Config:      config,
		Events:      make(PriorityQueue, 0),
		metrics:     metrics,
		entryNodeID: entryNodeID,
	}
}

func (e *SimulationEngine) Run(updateChan chan models.SimulationFrame) {
	defer close(updateChan)

	heap.Init(&e.Events)

	// Generate initial traffic from client nodes
	// FIX 1: Also count client events in metrics so client shows correct RPS
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

		// FIX 2: Smooth RPS reset — keep 20% of previous value instead of hard zero
		// This eliminates the spike-to-zero pattern every simulated second
		if currentTime-lastRPSReset >= 1000000 {
			for _, m := range e.metrics {
				current := atomic.LoadInt64(&m.currentRPS)
				atomic.StoreInt64(&m.currentRPS, current/5)
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
	if event.Type == RequestArrive {
		e.processArrival(node, event, currentTime)
	}
}

func (e *SimulationEngine) processArrival(node *models.Node, event *Event, currentTime int64) {
	m := e.metrics[node.ID]

	// FIX 1: Increment RPS for ALL node types including Client and Queue
	// before type-specific logic so no node shows 0 incorrectly
	rps := atomic.AddInt64(&m.currentRPS, 1)

	// FIX 3: Update peak RPS atomically — never reset this
	for {
		current := atomic.LoadInt64(&m.peakRPS)
		if rps <= current {
			break
		}
		if atomic.CompareAndSwapInt64(&m.peakRPS, current, rps) {
			break
		}
	}

	switch node.Type {

	case models.Cache, models.CDN:
		hitRatio := node.HitRatio
		if hitRatio == 0 {
			hitRatio = 0.8
		}
		if rand.Float64() < hitRatio {
			atomic.AddInt64(&m.cacheHits, 1)
			atomic.StoreInt64(&m.avgLatency, int64(node.Latency))
			// Cache hit — serve locally, do NOT forward
			e.updateStatus(m, rps, node)
			return
		}
		// Cache miss — penalize latency and forward to next node
		atomic.AddInt64(&m.cacheMisses, 1)
		atomic.StoreInt64(&m.avgLatency, int64(node.Latency*3))
		e.updateStatus(m, rps, node)
		e.forwardToNextNode(node, event, currentTime, node.Latency*3)
		return

	case models.Database, models.Storage:
		maxConn := node.MaxConnections
		if maxConn == 0 {
			maxConn = node.Capacity
		}
		currentConn := atomic.AddInt64(&m.connections, 1)
		defer atomic.AddInt64(&m.connections, -1)

		if currentConn > int64(maxConn) {
			atomic.AddInt64(&m.droppedReqs, 1)
			m.statusMu.Lock()
			m.status = "overloaded"
			m.statusMu.Unlock()
			atomic.StoreInt64(&m.avgLatency, int64(node.Latency*4))
			return
		}

	case models.Queue:
		maxDepth := node.MaxQueueDepth
		if maxDepth == 0 {
			maxDepth = node.Capacity
		}
		depth := atomic.AddInt64(&m.queueDepth, 1)
		if depth > int64(maxDepth) {
			atomic.AddInt64(&m.droppedReqs, 1)
			atomic.AddInt64(&m.queueDepth, -1)
			m.statusMu.Lock()
			m.status = "overloaded"
			m.statusMu.Unlock()
			return
		}
		atomic.StoreInt64(&m.avgLatency, int64(node.Latency)+(depth*2))

	case models.LoadBalancer:
		atomic.StoreInt64(&m.avgLatency, int64(node.Latency))

	default:
		// Client, APIServer
		atomic.StoreInt64(&m.avgLatency, int64(node.Latency))
	}

	e.updateStatus(m, rps, node)
	e.forwardToNextNode(node, event, currentTime, int(atomic.LoadInt64(&m.avgLatency)))
}

// updateStatus sets ok/warning/overloaded based on current RPS vs capacity
func (e *SimulationEngine) updateStatus(m *nodeMetrics, rps int64, node *models.Node) {
	m.statusMu.Lock()
	defer m.statusMu.Unlock()
	if rps > int64(node.Capacity) {
		m.status = "overloaded"
		atomic.StoreInt64(&m.avgLatency, int64(node.Latency*2))
	} else if rps > int64(node.Capacity/2) {
		m.status = "warning"
		atomic.StoreInt64(&m.avgLatency, int64(float64(node.Latency)*1.2))
	} else {
		m.status = "ok"
	}
}

func (e *SimulationEngine) forwardToNextNode(node *models.Node, event *Event, currentTime int64, latencyMs int) {
	edges := e.findOutgoingEdges(node.ID)
	if len(edges) == 0 {
		return
	}

	var targetEdge models.Edge
	if node.Type == models.LoadBalancer {
		rps := atomic.LoadInt64(&e.metrics[node.ID].currentRPS)
		targetEdge = edges[rps%int64(len(edges))]
	} else {
		targetEdge = edges[rand.Intn(len(edges))]
	}

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

		// FIX 3: Tag which node is the entry point for frontend peak RPS calculation
		isEntryNode := id == e.entryNodeID

		statuses = append(statuses, models.NodeStatus{
			ID:          id,
			Status:      status,
			CurrentRPS:  int(atomic.LoadInt64(&m.currentRPS)),
			PeakRPS:     int(atomic.LoadInt64(&m.peakRPS)),
			IsEntryNode: isEntryNode,
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
