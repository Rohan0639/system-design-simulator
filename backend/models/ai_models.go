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
}

type XPosition struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type AIEdge struct {
	Source string `json:"source"`
	Target string `json:"target"`
}
