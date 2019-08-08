package main

import (
	"log"
	"time"
)

type grid [][]int

type subType struct {
	id int
	c  chan grid
}

type golState struct {
	grid          grid
	width, height int
	activateCell  chan [][]point
	updates       map[int]chan grid
	unsub         chan int
	sub           chan subType
}

func newGolState(config config) *golState {
	gs := golState{
		grid:         make(grid, config.Height),
		width:        config.Width,
		height:       config.Height,
		activateCell: make(chan [][]point, 1000),
		unsub:        make(chan int, 1000),
		sub:          make(chan subType, 1000),
		updates:      make(map[int]chan grid),
	}
	for i := 0; i < gs.height; i++ {
		gs.grid[i] = make([]int, gs.width)
	}
	return &gs
}

func (gs *golState) nextTimeStep() grid {
	tmpGrid := make(grid, gs.height)
	for i := 0; i < gs.height; i++ {
		tmpGrid[i] = make([]int, gs.width)
		for j := 0; j < gs.width; j++ {
			neighs := gs.countNeighs(i, j)
			switch neighs {
			case 3:
				tmpGrid[i][j] = 1
			case 2:
				tmpGrid[i][j] = gs.grid[i][j]
			default:
				tmpGrid[i][j] = 0
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

func (gs *golState) subscribe(id int) <-chan grid {
	ch := make(chan grid, 10)
	gs.sub <- subType{id, ch}
	return ch
}

func (gs *golState) unSubscribe(id int) {
	gs.unsub <- id
}

func (gs *golState) updateLoop() {
	ticker := time.Tick(200 * time.Millisecond)

	var lastGrid grid
	for iter := 0; ; iter++ {
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
				x := p[0]
				y := p[1]
				if x >= 0 && x < gs.width && y >= 0 && y < gs.height {
					gs.grid[y][x] = 1
				}
			}
			for _, p := range pL[1] {
				x := p[0]
				y := p[1]
				if x >= 0 && x < gs.width && y >= 0 && y < gs.height {
					gs.grid[y][x] = 0
				}
			}
		}
	}
}

var dec = [8][2]int{
	{-1, -1},
	{-1, 0},
	{-1, 1},
	{0, 1},
	{0, -1},
	{1, -1},
	{1, 0},
	{1, 1},
}

func (gs *golState) countNeighs(i, j int) int {
	neighs := 0
	for i := 0; i < 8; i++ {
		xy := dec[i]
		newx := (j + xy[0] + gs.width) % gs.width
		newy := (i + xy[1] + gs.height) % gs.height
		if gs.grid[newy][newx] == 1 {
			neighs++
		}
	}
	return neighs
}
