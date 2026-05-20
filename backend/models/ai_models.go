package models

type AIGeneratedGraph struct {
	Nodes       []AINode `json:"nodes"`
	Edges       []AIEdge `json:"edges"`
	Explanation string   `json:"explanation"`
	Suggestions []string `json:"suggestions"`
}

type AINode struct {
	ID       string    `json:"id"`
	Type     string    `json:"type"`
	Label    string    `json:"label"`
	Capacity int       `json:"capacity"`
	Latency  int       `json:"latency"`
	Position XPosition `json:"position"`

	// FIX 2: Node-type-specific fields the AI can now set
	HitRatio       float64 `json:"hit_ratio,omitempty"`       // Cache/CDN
	MaxConnections int     `json:"max_connections,omitempty"` // Database/Storage
	MaxQueueDepth  int     `json:"max_queue_depth,omitempty"` // Queue
}

type XPosition struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type AIEdge struct {
	Source string `json:"source"`
	Target string `json:"target"`
}
