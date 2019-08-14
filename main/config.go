package main

type config struct {
	Width    int `json:"width"`
	Height   int `json:"height"`
	CellSize int `json:"cellSize"`
}

var globalConf = config{
	Width:  2048,
	Height: 2048,
}
