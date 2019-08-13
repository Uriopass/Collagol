package main

import (
	"log"
	"time"
)

type encodedGrid string

type golAlgorithm interface {
	goForward(generations int) encodedGrid
	setPositions(points []point, value int)
}

type subType struct {
	id int
	c  chan encodedGrid
}

type golHub struct {
	activateCell chan [][]point
	broadcast    map[int]chan encodedGrid
	unsub        chan int
	sub          chan subType
}

func newGolHub() *golHub {
	h := &golHub{
		activateCell: make(chan [][]point, 1000),
		unsub:        make(chan int, 1000),
		sub:          make(chan subType, 1000),
		broadcast:    make(map[int]chan encodedGrid),
	}
	return h
}

func (gh *golHub) subscribe(id int) <-chan encodedGrid {
	ch := make(chan encodedGrid, 10)
	gh.sub <- subType{id, ch}
	return ch
}

func (gh *golHub) unSubscribe(id int) {
	gh.unsub <- id
}

func (gh *golHub) run(simulator golAlgorithm) {
	ticker := time.Tick(200 * time.Millisecond)

	var lastEncoded encodedGrid
	for iter := 0; ; iter++ {
		select {
		case <-ticker:
			lastEncoded = simulator.goForward(1)

			for id, ch := range gh.broadcast {
				select {
				case ch <- lastEncoded:
				default:
					log.Println("Channel full, dropping connection")
					close(ch)
					delete(gh.broadcast, id)
				}
			}
		case id := <-gh.unsub:
			if _, ok := gh.broadcast[id]; ok {
				close(gh.broadcast[id])
				delete(gh.broadcast, id)
			}
		case s := <-gh.sub:
			gh.broadcast[s.id] = s.c
			if lastEncoded != "" {
				s.c <- lastEncoded
			}
		case pL := <-gh.activateCell:
			simulator.setPositions(pL[0], 1)
			simulator.setPositions(pL[1], 0)
		}
	}
}
