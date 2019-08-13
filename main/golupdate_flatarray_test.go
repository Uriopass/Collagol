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
	tmpGrid := make([]int, gs.height*gs.width)
	for i := 0; i < gs.height*gs.width; i++ {
		tmpGrid[i] = rand.Int() % 2
	}
	t.StartTimer()
	for i := 0 ; i < t.N ; i++ {
		gs.goForward(1)
	}
	t.StopTimer()
}