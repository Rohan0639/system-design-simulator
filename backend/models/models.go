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
	ID         string `json:"id"`
	Status     string `json:"status"`
	CurrentRPS int    `json:"current_rps"`
	AvgLatency int    `json:"avg_latency"`
}
