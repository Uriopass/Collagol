package main

import (
	"math/rand"
	"testing"
)

var result int

func BenchmarkTimestep(t *testing.B) {
	gs := newGolState(config{
		Width:  1000,
		Height: 1000,
	})

	rand.Seed(0)
	tmpGrid := make([]int, gs.height*gs.width)
	for i := 0; i < gs.height*gs.width; i++ {
		tmpGrid[i] = rand.Int() % 2
	}
	for k := 0; k < t.N; k++ {
		gs.nextTimeStep()
	}
	result = gs.grid[0][0]
}