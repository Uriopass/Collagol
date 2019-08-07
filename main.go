package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	gol := newGolState(100, 100)
	go gol.updateLoop()
	log.SetFlags(0)
	http.HandleFunc("/echo", wsHandler(gol))
	http.Handle("/", http.FileServer(http.Dir("data/")))
	fmt.Println("Init ok")
	log.Fatal(http.ListenAndServe(":80", nil))
}
