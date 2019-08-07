package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	gol := newGolState(50, 50)
	go gol.updateLoop()
	log.SetFlags(0)
	http.HandleFunc("/echo", wsHandler(gol))
	http.Handle("/", http.FileServer(http.Dir("data/")))
	fmt.Println("Init ok")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
