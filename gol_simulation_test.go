package main

import (
	"math/rand"
	"testing"
)

func BenchmarkTimestep(t *testing.B) {
	gs := newGolState(config{
		Width:  1000,
		Height: 1000,
	})

	rand.Seed(0)
	tmpGrid := make([][]int, gs.height)
	for i := 0; i < gs.height; i++ {
		tmpGrid[i] = make([]int, gs.width)
		for j := 0; j < gs.width; j++ {
			tmpGrid[i][j] = rand.Int() % 2
		}
	}
	for k := 0; k < t.N; k++ {
		for i := 0; i < gs.height; i++ {
			for j := 0; j < gs.width; j++ {
				gs.grid[i][j] = tmpGrid[i][j]
			}
		}
		for j := 0; j < 600; j++ {
			gs.nextTimeStep()
		}
	}
}
