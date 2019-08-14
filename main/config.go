package main

type config struct {
	Width    int `json:"width"`
	Height   int `json:"height"`
	CellSize int `json:"cellSize"`
}

var globalConf = config{
	Width:    800,
	Height:   800,
}
