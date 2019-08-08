package main

import (
	"log"
	"time"
)

type subType struct {
	id int
	c  chan [][]int
}

type golState struct {
	grid          [][]int
	width, height int
	activateCell  chan [][]point
	updates       map[int]chan [][]int
	unsub         chan int
	sub           chan subType
}

func newGolState() *golState {
	gs := golState{
		grid:         make([][]int, globalConf.Height),
		width:        globalConf.Width,
		height:       globalConf.Height,
		activateCell: make(chan [][]point, 1000),
		unsub:        make(chan int, 1000),
		sub:          make(chan subType, 1000),
		updates:      make(map[int]chan [][]int),
	}
	for i := 0; i < gs.height; i++ {
		gs.grid[i] = make([]int, gs.width)
	}
	return &gs
}

func (gs *golState) nextTimeStep() [][]int {
	tmpGrid := make([][]int, gs.height)
	for i := 0; i < gs.height; i++ {
		tmpGrid[i] = make([]int, gs.width)
		for j := 0; j < gs.width; j++ {
			neighs := gs.countNeighs(i, j)
			if neighs < 2 || neighs > 3 {
				tmpGrid[i][j] = 0
			}
			if neighs == 3 {
				tmpGrid[i][j] = 1
			}
			if neighs == 2 {
				tmpGrid[i][j] = gs.grid[i][j]
			}
		}
	}
	for i := 0; i < gs.height; i++ {
		for j := 0; j < gs.width; j++ {
			gs.grid[i][j] = tmpGrid[i][j]
		}
	}
	return tmpGrid
}

func (gs *golState) subscribe(id int) <-chan [][]int {
	ch := make(chan [][]int, 10)
	gs.sub <- subType{id, ch}
	return ch
}

func (gs *golState) unSubscribe(id int) {
	gs.unsub <- id
}

func (gs *golState) updateLoop() {
	ticker := time.Tick(200 * time.Millisecond)

	var lastGrid [][]int
	for {
		select {
		case <-ticker:
			lastGrid = gs.nextTimeStep()
			for id, ch := range gs.updates {
				select {
				case ch <- lastGrid:
				default:
					log.Println("Channel full, dropping connection")
					close(ch)
					delete(gs.updates, id)
				}
			}
		case id := <-gs.unsub:
			if _, ok := gs.updates[id]; ok {
				close(gs.updates[id])
				delete(gs.updates, id)
			}
		case s := <-gs.sub:
			gs.updates[s.id] = s.c
			if lastGrid != nil {
				s.c <- lastGrid
			}
		case pL := <-gs.activateCell:
			for _, p := range pL[0] {
				x := p.X
				y := p.Y
				if x >= 0 && x < gs.width && y >= 0 && y < gs.height {
					gs.grid[y][x] = 1
				}
			}
			for _, p := range pL[1] {
				x := p.X
				y := p.Y
				if x >= 0 && x < gs.width && y >= 0 && y < gs.height {
					gs.grid[y][x] = 0
				}
			}
		}
	}
}
func (gs *golState) countNeighs(i, j int) int {
	neighs := 0
	for y := -1; y <= 1; y++ {
		for x := -1; x <= 1; x++ {
			if x == 0 && y == 0 {
				continue
			}
			newx := j + x
			newy := i + y

			if newx >= 0 && newx < gs.width && newy >= 0 && newy < gs.height && gs.grid[newy][newx] == 1 {
				neighs++
			}
		}
	}
	return neighs
}
