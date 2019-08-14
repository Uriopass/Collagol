package main

type config struct {
	Width    int `json:"width"`
	Height   int `json:"height"`
	CellSize int `json:"cellSize"`
}

var globalConf = config{
	Width:  1600,
	Height: 1600,
}
