package main

import (
	"context"
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/Rohan0639/system-design-simulator/backend/engine"
	"github.com/Rohan0639/system-design-simulator/backend/handlers"
	"github.com/Rohan0639/system-design-simulator/backend/models"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var rdb *redis.Client

func initRedis() {
	redisUrl := os.Getenv("REDIS_URL")
	if redisUrl == "" {
		redisUrl = "localhost:6379"
	}
	rdb = redis.NewClient(&redis.Options{
		Addr: redisUrl,
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Printf("Warning: Failed to connect to Redis at %s: %v. Running in local fallback mode.", redisUrl, err)
		rdb = nil
	} else {
		log.Printf("Connected to Redis at %s", redisUrl)
	}
}

func main() {
	godotenv.Load()

	role := flag.String("role", "api", "Role to run: api or worker")
	flag.Parse()

	envRole := os.Getenv("ROLE")
	if envRole != "" {
		*role = envRole
	}

	initRedis()

	if *role == "worker" {
		runWorker()
	} else {
		runAPI()
	}
}

func runAPI() {
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
		c.JSON(200, gin.H{"status": "ok", "mode": "scalable-api"})
	})

	r.GET("/ws", handleWebSocket)
	r.POST("/api/ai/generate", handlers.GenerateDesign)

	port := "8080"
	if p := os.Getenv("PORT"); p != "" {
		port = p
	}

	log.Println("API Server starting on :" + port)
	r.Run(":" + port)
}

type SimulationRequest struct {
	SimID  string                  `json:"sim_id"`
	Graph  models.Graph            `json:"graph"`
	Config models.SimulationConfig `json:"config"`
}

func handleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade to websocket: %v", err)
		return
	}
	defer conn.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var pubsub *redis.PubSub

	for {
		_, p, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Client disconnected: %v", err)
			cancel()
			if pubsub != nil {
				pubsub.Close()
			}
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

		simID := uuid.New().String()
		log.Printf("Starting simulation request %s: %d nodes", simID, len(req.Graph.Nodes))

		cancel() // Cancel previous subscription/simulation
		ctx, cancel = context.WithCancel(context.Background())
		if pubsub != nil {
			pubsub.Close()
		}

		if rdb != nil {
			// Scalable Distributed mode
			simReq := SimulationRequest{
				SimID:  simID,
				Graph:  req.Graph,
				Config: req.Config,
			}
			payload, _ := json.Marshal(simReq)

			// Subscribe first to ensure we don't miss the start
			pubsub = rdb.Subscribe(ctx, "sim_updates:"+simID)
			ch := pubsub.Channel()

			// Publish to worker queue
			rdb.Publish(ctx, "simulation_jobs", payload)

			go func(ctx context.Context, ch <-chan *redis.Message) {
				for {
					select {
					case msg := <-ch:
						if msg.Payload == "DONE" {
							doneMsg, _ := json.Marshal(map[string]string{"type": "simulation_complete"})
							conn.WriteMessage(websocket.TextMessage, doneMsg)
							return
						}
						conn.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
					case <-ctx.Done():
						return
					}
				}
			}(ctx, ch)

		} else {
			// Local fallback mode
			sim := engine.NewSimulationEngine(req.Graph, req.Config)
			updateChan := make(chan models.SimulationFrame, 10)

			go sim.Run(updateChan)

			go func(ctx context.Context) {
				for {
					select {
					case frame, ok := <-updateChan:
						if !ok {
							doneMsg, _ := json.Marshal(map[string]string{"type": "simulation_complete"})
							conn.WriteMessage(websocket.TextMessage, doneMsg)
							return
						}
						msg, _ := json.Marshal(frame)
						conn.WriteMessage(websocket.TextMessage, msg)
					case <-ctx.Done():
						log.Printf("Simulation %s cancelled", simID)
						return
					}
				}
			}(ctx)
		}
	}
}

func runWorker() {
	if rdb == nil {
		log.Fatal("Worker mode requires a running Redis instance")
	}

	log.Println("Starting Simulation Worker... waiting for jobs")
	ctx := context.Background()
	pubsub := rdb.Subscribe(ctx, "simulation_jobs")
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		var req SimulationRequest
		if err := json.Unmarshal([]byte(msg.Payload), &req); err != nil {
			log.Printf("Worker error parsing job: %v", err)
			continue
		}

		log.Printf("Worker picked up simulation %s", req.SimID)

		sim := engine.NewSimulationEngine(req.Graph, req.Config)
		updateChan := make(chan models.SimulationFrame, 10)

		go sim.Run(updateChan)

		for frame := range updateChan {
			framePayload, _ := json.Marshal(frame)
			rdb.Publish(ctx, "sim_updates:"+req.SimID, framePayload)
		}

		rdb.Publish(ctx, "sim_updates:"+req.SimID, "DONE")
		log.Printf("Worker finished simulation %s", req.SimID)
	}
}
