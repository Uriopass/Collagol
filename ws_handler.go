package main

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	EnableCompression: true,
}

type point struct {
	X int `json:"x"`
	Y int `json:"y"`
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("upgrade:", err)
		return
	}
	defer c.Close()
	for {
		var p point
		err := c.ReadJSON(&p)
		if err != nil {
			log.Println("read:", err)
			break
		}
		log.Printf("recv: %v", p)
		err = c.WriteJSON(p)
		if err != nil {
			log.Println("write:", err)
			break
		}
	}
}
