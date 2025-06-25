package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"text/template"
	"time"

	"github.com/Uriopass/Collagol/messaging"
)

func main() {
	runtime.GOMAXPROCS(1)
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
	http.HandleFunc("/data/index.js", serveJS)
	http.Handle("/data/", http.FileServer(http.Dir(".")))

	// Start
	log.Println("Init ok")
	port := os.Getenv("PORT")
	if port == "" {
		port = "5858"
	}
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

type wsStruct struct {
	WSTYPE string
}

func serveJS(writer http.ResponseWriter, request *http.Request) {
	t := template.New("index.js")
	t, _ = t.ParseFiles("data/index.js")
	log.Println("serving index.js")
	r := wsStruct{
		WSTYPE: "wss",
	}
	_ = t.Execute(writer, r)
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
