package main

type golState struct {
	grid          [][]int
	tmpGrid       [][]int
	width, height int
}

func newGolState(width, height int) *golState {
	gs := golState{
		grid:    make([][]int, height),
		tmpGrid: make([][]int, height),
		width:   width,
		height:  height,
	}
	for i := 0; i < height; i++ {
		gs.grid[i] = make([]int, width)
		gs.tmpGrid[i] = make([]int, width)
	}
	return &gs
}

func (gs *golState) nextTimeStep() {
	newGrid := make([][]int, gs.height)
	for i := 0; i < gs.height; i++ {
		for j := 0; j < gs.width; j++ {
			neighs := gs.countNeighs(i, j)
			if neighs < 2 || neighs > 3 {
				newGrid[i][j] = 0
			}
			if neighs == 3 {
				newGrid[i][j] = 1
			}
			if neighs == 2 {
				newGrid[i][j] = gs.grid[i][j]
			}
		}
	}
	for i := 0; i < gs.height; i++ {
		for j := 0; j < gs.width; j++ {
			gs.grid[i][j] = newGrid[i][j]
		}
	}
}

func (gs *golState) turnOn(x, y int) {
	if x >= 0 && x < gs.width && y >= 0 && y < gs.height {
		gs.grid[y][x] = 1
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
