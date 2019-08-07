package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"go.uber.org/atomic"
)

var upgrader = websocket.Upgrader{
	EnableCompression: true,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type point struct {
	X int `json:"x"`
	Y int `json:"y"`
}

var counter atomic.Int32

func wsHandler(state *golState) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Print("upgrade:", err)
			return
		}
		log.Println("Upgraded conn from ", r.RemoteAddr)

		id := counter.Inc()
		out := state.subscribe(int(id))

		c.SetCloseHandler(func(code int, text string) error {
			state.unSubscribe(int(id))
			return nil
		})

		defer func() { _ = c.Close() }()

		go func() {
			for {
				var p point
				log.Println("Waiting")
				err := c.ReadJSON(&p)
				if err != nil {
					log.Println("read:", err)
					break
				}
				log.Printf("recv: %v\n", p)

				state.activateCell <- p
			}
		}()

		go func() {
			for newCells := range out {
				s, err := json.Marshal(newCells)
				if err != nil {
					log.Println("Error during json marschal ", err)
					continue
				}
				err = c.WriteJSON(s)
				if err != nil {
					log.Println("Write err: ", err)
					continue
				}
			}
		}()

	}
}
