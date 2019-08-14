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

var isSecure bool

func redirectToHTTPS(w http.ResponseWriter, req *http.Request) {
	target := "https://" + req.Host + req.URL.Path
	if len(req.URL.RawQuery) > 0 {
		target += "?" + req.URL.RawQuery
	}
	log.Printf("redirect to: %s", target)
	http.Redirect(w, req, target, http.StatusTemporaryRedirect)
}

func mainRedirect() {
	http.HandleFunc("/", redirectToHTTPS)
	log.Fatal(http.ListenAndServe(":80", nil))
}

func main() {
	runtime.GOMAXPROCS(1)
	if len(os.Args) > 1 && os.Args[1] == "test" {
		runTests()
		return
	}
	if len(os.Args) > 1 && os.Args[1] == "redirect" {
		mainRedirect()
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
	http.HandleFunc("/data/index.js", serveJS)
	http.Handle("/data/", http.FileServer(http.Dir(".")))

	// Start
	log.Println("Init ok")
	if len(os.Args) > 1 && os.Args[1] == "nosecure" {
		log.Fatal(http.ListenAndServe(":80", nil))
	} else {
		isSecure = true
		log.Fatal(http.ListenAndServeTLS(":443", "/etc/letsencrypt/live/collagol.douady.paris/fullchain.pem", "/etc/letsencrypt/live/collagol.douady.paris/privkey.pem", nil))
	}
}

type wsStruct struct {
	WSTYPE string
}

func serveJS(writer http.ResponseWriter, request *http.Request) {
	t := template.New("index.js")
	t, _ = t.ParseFiles("data/index.js")
	log.Println("serving index.js")
	r := wsStruct{
		WSTYPE: "ws",
	}
	if isSecure {
		r.WSTYPE = "wss"
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
