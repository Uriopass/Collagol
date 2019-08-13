package main

import (
	"log"
	"time"
)

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type golHub struct {
	activateCell  chan [][]point
	updates       map[int]chan encodedGrid
	unsub         chan int
	sub           chan subType
}

func newGolHub() *golHub {
	h := &golHub{
		activateCell: make(chan [][]point, 1000),
		unsub:        make(chan int, 1000),
		sub:          make(chan subType, 1000),
		updates:      make(map[int]chan encodedGrid),
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

func (gh *golHub) run(golState *golState) {
	ticker := time.Tick(200 * time.Millisecond)

	var lastEncoded encodedGrid
	for iter := 0; ; iter++ {
		select {
		case <-ticker:
			lastGrid := golState.nextTimeStep()
			lastEncoded = lastGrid.encode()

			for id, ch := range gh.updates {
				select {
				case ch <- lastEncoded:
				default:
					log.Println("Channel full, dropping connection")
					close(ch)
					delete(gh.updates, id)
				}
			}
		case id := <-gh.unsub:
			if _, ok := gh.updates[id]; ok {
				close(gh.updates[id])
				delete(gh.updates, id)
			}
		case s := <-gh.sub:
			gh.updates[s.id] = s.c
			if lastEncoded != "" {
				s.c <- lastEncoded
			}
		case pL := <-gh.activateCell:
			for _, p := range pL[0] {
				x := p[0]
				y := p[1]
				if x >= 0 && x < golState.width && y >= 0 && y < golState.height {
					golState.grid[y][x] = 1
				}
			}
			for _, p := range pL[1] {
				x := p[0]
				y := p[1]
				if x >= 0 && x < golState.width && y >= 0 && y < golState.height {
					golState.grid[y][x] = 0
				}
			}
		}
	}
}
