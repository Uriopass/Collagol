package main

import (
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
			log.Println("Unsubscribing")
			state.unSubscribe(int(id))
			return nil
		})

		defer func() {
			_ = c.Close()
			state.unSubscribe(int(id))
		}()

		go func() {
			for {
				var p []point
				err := c.ReadJSON(&p)
				if err != nil {
					log.Println("read:", err)
					break
				}
				state.activateCell <- p
			}
		}()

		for newCells := range out {
			err = c.WriteJSON(newCells)
			if err != nil {
				log.Println("Write err: ", err)
				break
			}
		}
	}
}
