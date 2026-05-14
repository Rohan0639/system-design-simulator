package main

import (
	"encoding/json"
	"log"
	"net/http"

	"os"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
	"github.com/user/system-design-simulator/engine"
	"github.com/user/system-design-simulator/handlers"
	"github.com/user/system-design-simulator/models"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	godotenv.Load()
	r := gin.Default()

	// CORS Middleware
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

	for {
		_, p, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message: %v", err)
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

		log.Printf("Starting simulation for %d nodes", len(req.Graph.Nodes))

		// Initialize engine
		sim := engine.NewSimulationEngine(req.Graph, req.Config)
		updateChan := make(chan models.SimulationFrame)

		// Run simulation in a separate goroutine
		go sim.Run(updateChan)

		// Stream frames back to client
		go func() {
			for frame := range updateChan {
				msg, _ := json.Marshal(frame)
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					log.Printf("Error writing frame to WS: %v", err)
					return
				}
			}
		}()
	}
}
