package main

type config struct {
	Width    int `json:"width"`
	Height   int `json:"height"`
	CellSize int `json:"cellSize"`
}

var globalConf = config{
	Width:    300,
	Height:   300,
	CellSize: 3,
}
