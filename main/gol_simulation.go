package main

import (
	"strings"
)

type grid [][]int

type encodedGrid string

func (g grid) encode() encodedGrid {
	encoded := strings.Builder{}

	for y := 0 ; y < len(g) ; y++ {
		for x := 0 ; x < len(g[y]) ; x++ {
			if g[y][x] == 1 {
				encoded.WriteByte('1')
			} else {
				encoded.WriteByte('0')
			}
		}
	}

	return encodedGrid(encoded.String())
}

type subType struct {
	id int
	c  chan encodedGrid
}

type golState struct {
	grid          grid
	width, height int
}

func newGolState(config config) *golState {
	gs := golState{
		grid:         make(grid, config.Height),
		width:        config.Width,
		height:       config.Height,
	}
	for i := 0; i < gs.height; i++ {
		gs.grid[i] = make([]int, gs.width)
	}
	return &gs
}

func (gs *golState) updateCase(x, y, neighs int, tmpGrid grid) {
	switch neighs {
	case 3:
		tmpGrid[y][x] = 1
	case 2:
		tmpGrid[y][x] = gs.grid[y][x]
	default:
		tmpGrid[y][x] = 0
	}
}

func (gs *golState) nextTimeStep() grid {
	tmpGrid := make(grid, gs.height)
	for i := 0; i < gs.height; i++ {
		tmpGrid[i] = make([]int, gs.width)
	}

	// Center
	for y := 1; y < gs.height-1; y++ {
		for x := 1; x < gs.width-1; x++ {
			neighs := gs.fastNeighs(x, y)
			gs.updateCase(x, y, neighs, tmpGrid)
		}
	}

	// Bounds
	for y := 0; y < gs.height; y++ {
		for x := 0; x < gs.width; x += gs.width - 1 {
			neighs := gs.countNeighsTorus(x, y)
			gs.updateCase(x, y, neighs, tmpGrid)
		}
	}
	for y := 0; y < gs.height; y += gs.height - 1 {
		for x := 0; x < gs.width; x++ {
			neighs := gs.countNeighsTorus(x, y)
			gs.updateCase(x, y, neighs, tmpGrid)
		}
	}

	for i := 0; i < gs.height; i++ {
		copy(gs.grid[i], tmpGrid[i])
	}
	return tmpGrid
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

func (gs *golState) countNeighsTorus(x, y int) int {
	neighs := 0
	for i := 0; i < 8; i++ {
		xy := dec[i]
		newx := (x + xy[0] + gs.width) % gs.width
		newy := (y + xy[1] + gs.height) % gs.height
		if gs.grid[newy][newx] == 1 {
			neighs++
		}
	}
	return neighs
}

func (gs *golState) fastNeighs(x, y int) int {
	neighs := 0
	for i := 0; i < 8; i++ {
		xy := dec[i]
		newx := x + xy[0]
		newy := y + xy[1]
		if gs.grid[newy][newx] == 1 {
			neighs++
		}
	}
	return neighs
}
