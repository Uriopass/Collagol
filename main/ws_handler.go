package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

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

func golWs(state *golHub, banner *banner) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		IP := strings.Split(r.RemoteAddr, ":")
		IP = IP[:len(IP)-1]

		remoteaddr := strings.Join(IP, ":")
		if v, connected := banner.isConnected(remoteaddr) ; connected {
			state.unSubscribe(v)
		}

		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Print("upgrade:", err)
			return
		}
		log.Println("Upgraded conn from ", remoteaddr)

		id := counter.Inc()
		out := state.subscribe(int(id))
		banner.register(remoteaddr, int(id))

		c.SetCloseHandler(func(code int, text string) error {
			log.Println("Unsubscribing")
			banner.disconnect(remoteaddr)
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
			err = c.WriteMessage(websocket.TextMessage, []byte(newCells))
			if err != nil {
				log.Println("Write err: ", err)
				break
			}
		}
		_ = c.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseGoingAway, ""), time.Now().Add(1*time.Second))
	}
}

func connectedWs(state *golHub) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Print("upgrade:", err)
			return
		}

		for {
			err = c.WriteMessage(websocket.TextMessage, []byte(strconv.Itoa(len(state.updates))))
			if err != nil {
				break
			}
			time.Sleep(1*time.Second)
		}
	}
}