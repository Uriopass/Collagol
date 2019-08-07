package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

func main() {
	gol := newGolState()
	go gol.updateLoop()
	log.SetFlags(0)
	http.HandleFunc("/echo", wsHandler(gol))
	http.HandleFunc("/config", func(writer http.ResponseWriter, request *http.Request) {
		s, _ := json.Marshal(globalConf)
		_, _ = writer.Write(s)
	})
	http.HandleFunc("/connected", func(writer http.ResponseWriter, request *http.Request) {
		connected := len(gol.updates)
		s, _ := json.Marshal(connected)
		_, _ = writer.Write(s)
	})
	http.Handle("/", http.FileServer(http.Dir("data/")))
	fmt.Println("Init ok")
	log.Fatal(http.ListenAndServe(":80", nil))
}
