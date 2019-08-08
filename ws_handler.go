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

type point [2]int

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
		}()

		go func() {
			defer func() {
				_ = c.Close()
			}()
			for {
				var p [][]point
				_, b, err := c.ReadMessage()
				if err != nil {
					log.Println("read:", err)
					break
				}
				err = json.Unmarshal(b, &p)
				if err != nil {
					log.Println("json err:", err)
					log.Println("with mess: ", b)
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
