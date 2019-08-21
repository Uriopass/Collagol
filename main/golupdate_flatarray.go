package main

import (
	"math/bits"
	"strconv"
	"strings"
)

type gridType uint16

type grid [][]gridType

func (g grid) encode() encodedGrid {
	encoded := strings.Builder{}

	for y := 0; y < len(g); y++ {
		lastC := 0
		lastB := gridType(0)
		for x := 0; x < len(g[y]); x++ {
			if lastB == g[y][x] {
				lastC++
				continue
			}
			if lastC > 0 {
				if lastC > 1 {
					encoded.WriteString(strconv.Itoa(lastC))
				}
				if lastB == 1 {
					encoded.WriteByte('o')
				} else {
					encoded.WriteByte('b')
				}
			}
			lastC = 1
			lastB = g[y][x]
		}
		if lastC > 1 {
			encoded.WriteString(strconv.Itoa(lastC))
		}

		if lastB == 1 {
			encoded.WriteByte('o')
		} else {
			encoded.WriteByte('b')
		}
		encoded.WriteByte('$')
	}

	return encodedGrid(encoded.String())
}

type golState struct {
	grid          grid
	width, height int
	tmpGrid       grid
}

func newGolState(config config) *golState {
	gs := golState{
		grid:    make(grid, config.Height),
		tmpGrid: make(grid, config.Height),
		width:   config.Width,
		height:  config.Height,
	}
	for i := 0; i < gs.height; i++ {
		gs.grid[i] = make([]gridType, gs.width)
		gs.tmpGrid[i] = make([]gridType, gs.width)
	}
	return &gs
}

func (gs *golState) setPositions(points []point, value int) {
	if len(points) == 1 && points[0][0] == -1 {
		for i := 0; i < gs.height; i++ {
			for j := 0; j < gs.width; j++ {
				gs.grid[i][j] = gridType(value)
			}
		}
		return
	}
	for _, p := range points {
		x := p[0]
		y := p[1]
		if x >= 0 && x < gs.width && y >= 0 && y < gs.height {
			gs.grid[y][x] = gridType(value)
		}
	}
}

func (gs *golState) updateCase(x, y int, neighs gridType, tmpGrid grid) {
	switch neighs {
	case 3:
		tmpGrid[y][x] = 1
	case 2:
		tmpGrid[y][x] = gs.grid[y][x]
	default:
		tmpGrid[y][x] = 0
	}
}

var lookupTable [512]gridType

func init() {
	for i := uint(0); i < 512; i++ {
		middle := i&16 > 0
		other := i & (0xFFFF - 16)
		cnt := bits.OnesCount(other)

		if cnt == 3 || (cnt == 2 && middle) {
			lookupTable[i] = 1
		} else {
			lookupTable[i] = 0
		}
	}
}

func (gs *golState) goForward(generations int) encodedGrid {
	for gen := 0; gen < generations; gen++ {
		// Center
		for y := 1; y < gs.height-1; y++ {
			environment :=
				gs.grid[y-1][0]*32 + gs.grid[y-1][1]*4 +
					gs.grid[y][0]*16 + gs.grid[y][1]*2 +
					gs.grid[y+1][0]*8 + gs.grid[y+1][1]

			a := gs.grid[y-1]
			b := gs.grid[y]
			c := gs.grid[y+1]
			d := gs.tmpGrid[y]

			for x := 2; x < gs.width; x++ {
				environment = (environment%64)*8 +
					a[x]*4 +
					b[x]*2 +
					c[x]

				d[x-1] = lookupTable[environment]
			}
		}

		// Bounds
		for y := 0; y < gs.height; y++ {
			for x := 0; x < gs.width; x += gs.width - 1 {
				neighs := gs.countNeighsTorus(x, y)
				gs.updateCase(x, y, neighs, gs.tmpGrid)
			}
		}
		for y := 0; y < gs.height; y += gs.height - 1 {
			for x := 0; x < gs.width; x++ {
				neighs := gs.countNeighsTorus(x, y)
				gs.updateCase(x, y, neighs, gs.tmpGrid)
			}
		}

		tmp := gs.grid
		gs.grid = gs.tmpGrid
		gs.tmpGrid = tmp
	}
	return gs.tmpGrid.encode()
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

func (gs *golState) countNeighsTorus(x, y int) gridType {
	var neighs gridType = 0
	for i := 0; i < 8; i++ {
		xy := dec[i]
		newx := (x + xy[0] + gs.width) % gs.width
		newy := (y + xy[1] + gs.height) % gs.height
		neighs += gs.grid[newy][newx]
	}
	return neighs
}
