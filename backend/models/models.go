package models

type NodeType string

const (
	Client       NodeType = "client"
	LoadBalancer NodeType = "load_balancer"
	APIServer    NodeType = "api_server"
	Database     NodeType = "database"
	Cache        NodeType = "cache"
	CDN          NodeType = "cdn"
	Queue        NodeType = "queue"
	Storage      NodeType = "storage"
)

type Node struct {
	ID       string   `json:"id"`
	Type     NodeType `json:"type"`
	Capacity int      `json:"capacity"` // Requests per second
	Latency  int      `json:"latency"`  // ms
	Status   string   `json:"status"`   // "ok", "warning", "overloaded"

	// FIX 2: Node-type-specific behavior fields
	// Cache: probability of serving from cache (0.0 to 1.0). Miss = fallback to DB.
	HitRatio float64 `json:"hit_ratio,omitempty"` // Cache/CDN only

	// Database: max concurrent connections before hard rejection
	MaxConnections int `json:"max_connections,omitempty"` // Database/Storage only

	// Queue: max backlog depth before dropping requests
	MaxQueueDepth int `json:"max_queue_depth,omitempty"` // Queue only
}

type Edge struct {
	ID     string `json:"id"`
	Source string `json:"source"`
	Target string `json:"target"`
}

type Graph struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

type SimulationConfig struct {
	RPS      int `json:"rps"`
	Duration int `json:"duration"` // seconds
}

type SimulationFrame struct {
	Nodes []NodeStatus `json:"nodes"`
	Time  int          `json:"time"` // relative time in ms
}

type NodeStatus struct {
	ID          string `json:"id"`
	Status      string `json:"status"`
	CurrentRPS  int    `json:"current_rps"`
	PeakRPS     int    `json:"peak_rps"`      // FIX 3: never resets, tracks highest RPS seen
	IsEntryNode bool   `json:"is_entry_node"` // FIX 3: frontend uses this for accurate peak RPS
	AvgLatency  int    `json:"avg_latency"`
	QueueDepth  int    `json:"queue_depth,omitempty"`  // Queue nodes
	CacheHits   int    `json:"cache_hits,omitempty"`   // Cache/CDN nodes
	CacheMisses int    `json:"cache_misses,omitempty"` // Cache/CDN nodes
	Connections int    `json:"connections,omitempty"`  // Database nodes
	DroppedReqs int    `json:"dropped_reqs,omitempty"` // Overloaded nodes
}
