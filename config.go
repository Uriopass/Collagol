package main

type config struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

var globalConf = config{
	Width:  100,
	Height: 100,
}
