package main

type config struct {
	Width    int `json:"width"`
	Height   int `json:"height"`
	CellSize int `json:"cellSize"`
}

var globalConf = config{
	Width:    200,
	Height:   200,
	CellSize: 4,
}
