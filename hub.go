package main

import "log"

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan []byte

	rc *redisClient

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	history []timeMessage
}

func newHub() *Hub {
	h := &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		rc:         initRedisClient(),
	}
	h.history = h.rc.getHistory()
	log.Println("Parsed ", len(h.history), " messages")
	return h
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			go func(client *Client, history []timeMessage) {
				defer func() {
					if x := recover(); x != nil {
						log.Printf("run time panic: %v", x)
					}
				}()
				if len(history) > 256 {
					history = history[len(history)-256:]
				}
				for _, m := range history {
					client.send <- []byte(m.message)
				}
			}(client, h.history)
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			h.history = append(h.history, h.rc.storeMessage(string(message)))

			for client := range h.clients {
				// log.Printf("Client room: %s message room: %s \n",
				// 	client.room, msg.ChatRoomName)
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}
