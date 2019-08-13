package main

import (
	"encoding/json"
	"html/template"
	"log"
	"math/rand"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"time"

	"github.com/Uriopass/Collagol/messaging"
)

func main() {
	runtime.GOMAXPROCS(1)
	if len(os.Args) > 1 && os.Args[1] == "test" {
		runTests()
		return
	}
	rand.Seed(time.Now().Unix())
	golState := newGolState(globalConf)
	golHub := newGolHub()
	banner := initBanner()
	hub := messaging.NewHub()

	go golHub.run(golState)
	go hub.Run()

	log.SetFlags(log.LstdFlags)

	// websocket
	http.HandleFunc("/echo", golWs(golHub, banner))
	http.HandleFunc("/message", messaging.WsHandler(hub))
	http.HandleFunc("/connected", connectedWs(golHub))

	// http info
	http.HandleFunc("/config", func(writer http.ResponseWriter, request *http.Request) {
		s, _ := json.Marshal(globalConf)
		_, _ = writer.Write(s)
	})

	// Media
	http.HandleFunc("/", serveIndex)
	http.HandleFunc("/index.html", serveIndex)
	http.Handle("/data/", http.FileServer(http.Dir(".")))

	// Start
	log.Println("Init ok")
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
