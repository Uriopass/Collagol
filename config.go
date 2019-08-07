package main

type config struct {
	Width    int `json:"width"`
	Height   int `json:"height"`
	cellSize int `json:"cellSize"`
}

var globalConf = config{
	Width:  100,
	Height: 100,
	cellSize: 8,
}
