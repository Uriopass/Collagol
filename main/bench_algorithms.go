package main

import (
	"log"
	"math/rand"
	"time"
)

func BenchmarkFlat(gen int) {
	gs := newGolState(config{
		Width:  8192,
		Height: 8192,
	})

	rand.Seed(0)
	tmpGrid := make([]int, gs.height*gs.width)
	for i := 0; i < gs.height*gs.width; i++ {
		tmpGrid[i] = rand.Int() % 2
	}
	for i := 0; i < gen; i++ {
		t := time.Now()
		gs.goForward(1)
		diff := time.Now().Sub(t)
		log.Println(i, diff)
	}
}

func BenchmarkHash(gen int) {
	lvl := uint8(12)

	rand.Seed(0)
	gs := RandomTree(lvl)

	for i := 0; i < gen; i++ {
		t := time.Now()
		gs = gs.NextGen()
		diff := time.Now().Sub(t)
		log.Println(i, diff)
		log.Println(gs.Stats())
	}
}

func runTests() {
	//defer profile.Start(profile.CPUProfile).Stop()
	//BenchmarkHash(10)
	BenchmarkFlat(10)
}
