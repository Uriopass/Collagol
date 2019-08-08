package main

import (
	"math/rand"
	"testing"
)

func BenchmarkTimestep(t *testing.B) {
	gs := newGolState(config{
		Width:  100,
		Height: 100,
	})

	rand.Seed(0)
	tmpGrid := make([]int, gs.height*gs.width)
	for i := 0; i < gs.height*gs.width; i++ {
		tmpGrid[i] = rand.Int() % 2
	}
	for k := 0; k < t.N; k++ {
		copy(gs.grid, tmpGrid)
		for j := 0; j < 10; j++ {
			gs.nextTimeStep()
		}
	}
}
