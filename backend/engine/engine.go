package engine

import (
	"container/heap"
	"math/rand"
	"sync"
	"time"

	"github.com/Rohan0639/system-design-simulator/backend/models"
)

type EventType string

const (
	RequestArrive EventType = "request_arrive"
	RequestDone   EventType = "request_done"
)

type Event struct {
	Time       int64     // relative time in microseconds
	Type       EventType
	NodeID     string
	RequestID  string
	TargetNode string
	index      int // for heap
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

type SimulationEngine struct {
	Graph  models.Graph
	Config models.SimulationConfig
	Events PriorityQueue
	mu     sync.Mutex
	
	// Metrics state
	Results map[string]*models.NodeStatus
}

func NewSimulationEngine(graph models.Graph, config models.SimulationConfig) *SimulationEngine {
	return &SimulationEngine{
		Graph:   graph,
		Config:  config,
		Events:  make(PriorityQueue, 0),
		Results: make(map[string]*models.NodeStatus),
	}
}

func (e *SimulationEngine) Run(updateChan chan models.SimulationFrame) {
	heap.Init(&e.Events)

	// Initialize results
	for _, node := range e.Graph.Nodes {
		e.Results[node.ID] = &models.NodeStatus{
			ID:     node.ID,
			Status: "ok",
		}
	}

	// Generate initial traffic from clients
	for _, node := range e.Graph.Nodes {
		if node.Type == models.Client {
			// Basic Poisson distribution or steady RPS
			interval := 1000000 / e.Config.RPS // microseconds per request
			for t := int64(0); t < int64(e.Config.Duration)*1000000; t += int64(interval) {
				heap.Push(&e.Events, &Event{
					Time:   t,
					Type:   RequestArrive,
					NodeID: node.ID,
				})
			}
		}
	}

	// Simulation loop
	currentTime := int64(0)
	lastUpdate := int64(0)
	lastRPSReset := int64(0)

	for e.Events.Len() > 0 {
		event := heap.Pop(&e.Events).(*Event)
		currentTime = event.Time

		// Reset RPS counters every simulated second
		if currentTime-lastRPSReset >= 1000000 {
			for id := range e.Results {
				e.Results[id].CurrentRPS = 0
			}
			lastRPSReset = currentTime
		}

		e.handleEvent(event)

		// Send frames every 100ms of simulated time
		if currentTime-lastUpdate > 100000 {
			frame := models.SimulationFrame{
				Time:  int(currentTime / 1000),
				Nodes: e.getCurrentStatus(),
			}
			updateChan <- frame
			lastUpdate = currentTime
			
			// Slow down the simulation for visual effect (Real-time mode)
			time.Sleep(10 * time.Millisecond)
		}
	}
}

func (e *SimulationEngine) handleEvent(event *Event) {
	node := e.findNode(event.NodeID)
	if node == nil {
		return
	}

	switch event.Type {
	case RequestArrive:
		e.processArrival(node, event)
	}
}

func (e *SimulationEngine) processArrival(node *models.Node, event *Event) {
	// Simple Capacity Check
	// In a real DES, we'd check queue size and process time
	// For this version, let's calculate status based on local window
	
	// Simulation logic: Find next hop
	edges := e.findOutgoingEdges(node.ID)
	if len(edges) == 0 {
		return
	}

	// Distribute to next hop (Round Robin or Random)
	targetEdge := edges[rand.Intn(len(edges))]
	
	// Add delay based on node latency
	heap.Push(&e.Events, &Event{
		Time:   event.Time + int64(node.Latency*1000),
		Type:   RequestArrive,
		NodeID: targetEdge.Target,
	})
	
	// Update node metrics
	e.Results[node.ID].CurrentRPS++
	
	// Base latency
	e.Results[node.ID].AvgLatency = node.Latency

	if e.Results[node.ID].CurrentRPS > node.Capacity {
		e.Results[node.ID].Status = "overloaded"
		// Penalize latency when overloaded (simulating queue backup)
		e.Results[node.ID].AvgLatency = node.Latency * 2
	} else if e.Results[node.ID].CurrentRPS > node.Capacity/2 {
		e.Results[node.ID].Status = "warning"
		e.Results[node.ID].AvgLatency = int(float64(node.Latency) * 1.2)
	} else {
		e.Results[node.ID].Status = "ok"
	}
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
	for _, status := range e.Results {
		statuses = append(statuses, *status)
	}
	return statuses
}
