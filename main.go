package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"time"
)



func main() {
	rand.Seed(time.Now().Unix())
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
	http.HandleFunc("/", serveIndex)
	http.HandleFunc("/index.html", serveIndex)
	http.Handle("/data/", http.FileServer(http.Dir(".")))
	fmt.Println("Init ok")
	log.Fatal(http.ListenAndServe(":80", nil))
}

type rStruct struct {
	R1 string
	R2 string
}

func serveIndex(writer http.ResponseWriter, request *http.Request) {
	t := template.New("index.html")
	t, _ = t.ParseFiles("data/index.html")

	r := rStruct{
		R1: strconv.Itoa(rand.Int()),
		R2: strconv.Itoa(rand.Int()),
	}

	_ = t.Execute(writer, r)
}