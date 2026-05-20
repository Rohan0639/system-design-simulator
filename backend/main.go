package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/Rohan0639/system-design-simulator/backend/engine"
	"github.com/Rohan0639/system-design-simulator/backend/handlers"
	"github.com/Rohan0639/system-design-simulator/backend/models"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	godotenv.Load()
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	r.GET("/ws", handleWebSocket)
	r.POST("/api/ai/generate", handlers.GenerateDesign)

	port := "8080"
	if p := os.Getenv("PORT"); p != "" {
		port = p
	}

	log.Println("Server starting on :" + port)
	r.Run(":" + port)
}

func handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade to websocket: %v", err)
		return
	}
	defer conn.Close()

	// FIX: cancel context so goroutines stop cleanly when client disconnects
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	for {
		_, p, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Client disconnected: %v", err)
			cancel() // stop any running simulation
			break
		}

		var req struct {
			Graph  models.Graph            `json:"graph"`
			Config models.SimulationConfig `json:"config"`
		}

		if err := json.Unmarshal(p, &req); err != nil {
			log.Printf("Error unmarshaling request: %v", err)
			continue
		}

		if len(req.Graph.Nodes) == 0 {
			log.Printf("Empty graph received, skipping simulation")
			continue
		}

		log.Printf("Starting simulation: %d nodes, %d RPS, %ds duration",
			len(req.Graph.Nodes), req.Config.RPS, req.Config.Duration)

		// Cancel previous simulation if still running
		cancel()
		ctx, cancel = context.WithCancel(context.Background())

		sim := engine.NewSimulationEngine(req.Graph, req.Config)
		updateChan := make(chan models.SimulationFrame, 10) // buffered to avoid blocking engine

		go sim.Run(updateChan)

		// Stream frames to client until simulation ends or client disconnects
		go func(ctx context.Context) {
			for {
				select {
				case frame, ok := <-updateChan:
					if !ok {
						// Simulation complete — send done signal
						doneMsg, _ := json.Marshal(map[string]string{"type": "simulation_complete"})
						conn.WriteMessage(websocket.TextMessage, doneMsg)
						return
					}
					msg, _ := json.Marshal(frame)
					if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
						log.Printf("Error writing to WS: %v", err)
						return
					}
				case <-ctx.Done():
					log.Printf("Simulation cancelled")
					return
				}
			}
		}(ctx)
	}
}
