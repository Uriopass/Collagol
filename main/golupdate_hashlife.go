/*Package quadTree implements a quadTree with Game of Life's hashlife algorithm. The quadTree divides space in the following 4 sub-quadtrees:

	NW|NE
	-----
	SW|SE

A quadTree of level l covers an area with side length 2^l. A node with level 0 is a leaf node.
Permitted coordinates are x and y in the range of [- 2^(l-1), 2^(l-1)-1]
Table with first levels

  level  x & y range  side edge Length
	-------------------------------------
	0      [0 , 0]			   1
	1      [-1, 0]             2
	2      [-2, 1]             4
	3      [-4, 3]			   8
	4      [-8, 7] 			  16
	5      [-16, 15]          32


quadTree instances are immutable. Each change can return another instance. All instances are cached with their Childs as hash value.
Only two leaf nodes exist in memory: one life and one dead node.

The hashlife algorithm is inspired by this article: http://www.drdobbs.com/jvm/an-algorithm-for-compressing-space-and-t/184406478
Only the 'space compression' and no 'time compression' is implemented

*/
package main

import (
	"fmt"
	"math/bits"
	"math/rand"
	"sort"
	"strings"
	"runtime"
)

// Dim is the datatype use for the coordinates of the quadTree
type Dim = int32

// Childs contains all sub-quadtrees
type Childs struct {
	SE, SW, NW, NE *quadTree
}

func (ch *Childs) population() Dim {
	return ch.SE.Population + ch.SW.Population + ch.NW.Population + ch.NE.Population
}

// quadTree represents one node and consists itself of quadtrees
type quadTree struct {
	Level      uint // distance from leaf layer.
	Childs          // Childs from the quadtree
	Population Dim
	result     *quadTree // result generation (quadTree half of the size)
}

var (
	liveLeaf = &quadTree{Population: 1}
	deadLeaf = &quadTree{Population: 0}
)

// NodeMap is the cache for quadtrees.
type NodeMap map[Childs]*quadTree

var (
	nodeMap   = make(NodeMap)
	cacheHit  uint
	cacheMiss uint
)

//NewTree returns a tree defined by its Childs. Either an instance from cache or a new one using the supplied Childs.
func NewTree(childs Childs) *quadTree {
	qt, ok := nodeMap[childs]
	if ok {
		cacheHit++
		return qt
	}
	cacheMiss++
	qt = &quadTree{childs.NE.Level + 1, childs, childs.population(), nil}
	if qt.Population == 0 || qt.Level <= 16 {
		nodeMap[childs] = qt
	}
	return qt
}

// EmptyTree returns an complete tree were all leaf nodes are dead cells
func EmptyTree(level uint) *quadTree {
	if level == 0 || level+1 == 0 || level+2 == 0 {
		return deadLeaf
	}
	child := EmptyTree(level - 1)
	return NewTree(Childs{child, child, child, child})
}

func (qt *quadTree) keySet(keys *[]Childs) {
	if qt.Level == 0 {
		return
	}

	*keys = append(*keys, qt.Childs)
	for _, x := range qt.childs() {
		x.keySet(keys)
	}
}

func RandomTree(level uint) *quadTree {
	if level == 0 {
		if rand.Int31()%2 == 0 {
			return deadLeaf
		} else {
			return liveLeaf
		}
	}
	return NewTree(Childs{ RandomTree(level - 1), RandomTree(level - 1), RandomTree(level - 1), RandomTree(level - 1)})
}

// grow returns a quadTree four times as big (adds one more layer)
// old quadTree sub trees are in the center of new quadTree
func (qt *quadTree) grow() *quadTree {
	if qt.Level >= 63 { //this depends on dim, would be better not to hardcode
		panic(fmt.Sprintf("quadTree can't grow beyond level %v", qt.Level))
	}
	if qt.Level < 1 {
		panic(fmt.Sprintf("Can't grow baby tree of level %v (< 1). Use emptyTree(level) to get a grown tree.", qt.Level))
	}

	//fmt.Println(qt)
	emptyChild := EmptyTree(qt.Level - 1)
	return NewTree(Childs{
		SE: NewTree(Childs{emptyChild, emptyChild, qt.SE, emptyChild}),
		SW: NewTree(Childs{emptyChild, emptyChild, emptyChild, qt.SW}),
		NW: NewTree(Childs{qt.NW, emptyChild, emptyChild, emptyChild}),
		NE: NewTree(Childs{emptyChild, qt.NE, emptyChild, emptyChild})})
}

// GrowToFit returns a quadTree big enough to include (x,y)
func (qt *quadTree) GrowToFit(x, y Dim) *quadTree {
	for true {
		maxCoordinate := Dim(1) << (qt.Level - 1)
		// fmt.Printf("growing to %v, %v. Reached maxcoordinate %v\n", x, y, maxCoordinate)
		if x <= maxCoordinate-1 && y <= maxCoordinate-1 && x >= -maxCoordinate && y >= -maxCoordinate {
			break
		}
		qt = qt.grow()
	}
	return qt
}

// SetCell uses findLeaf() to find the corresponding leaf and sets it to value
func (qt *quadTree) SetCell(x, y Dim, value Dim) *quadTree {
	if qt.Level == 0 {
		// assert that coordinates reached one of the four
		if x < -1 || x > 0 || y < -1 || y > 0 {
			panic(fmt.Sprintln("reached leaf node with coordinates to big, probably didn't grow univers to fit (x,y): (", x, y, ")"))
		}
		if value == 0 {
			return deadLeaf
		} else {
			return liveLeaf
		}
	}

	distanceToOrigin := Dim(1) << (qt.Level - 2) // 0 in case of Level 2 and 1

	// south/north east/west quadrant
	if x >= 0 {
		if y >= 0 {
			return NewTree(Childs{qt.SE.SetCell(x-distanceToOrigin, y-distanceToOrigin, value), qt.SW, qt.NW, qt.NE})
		} else {
			return NewTree(Childs{qt.SE, qt.SW, qt.NW, qt.NE.SetCell(x-distanceToOrigin, y+distanceToOrigin, value)})
		}
	} else {
		if y >= 0 {
			return NewTree(Childs{qt.SE, qt.SW.SetCell(x+distanceToOrigin, y-distanceToOrigin, value), qt.NW, qt.NE})
		} else {
			return NewTree(Childs{qt.SE, qt.SW, qt.NW.SetCell(x+distanceToOrigin, y+distanceToOrigin, value), qt.NE})
		}
	}
}

// Cell find the corresponding leaf and returns it's value
func (qt *quadTree) Cell(x, y Dim) Dim {
	leaf := qt.findLeaf(x, y)
	return leaf.Population
}

// findLeaf searches tree for leaf node at x,y.
// If generatePath is true the path for this node will be build in case it didn't exist yet.
// If generatePath is false and cell at x,y was not set, returns nil
func (qt *quadTree) findLeaf(x, y Dim) *quadTree {
	if qt.Level == 0 {
		// assert that coordinates reached one of the four
		if x < -1 || x > 0 || y < -1 || y > 0 {
			panic(fmt.Sprintln("reached leaf node with coordinates to big, probably didn't grow univers to fit (x,y): (", x, y, ")"))
		}
		return qt
	}

	distanceToOrigin := Dim(1) << (qt.Level - 2) // 0 in case of Level 2 and 1

	// south/north east/west quadrant
	if x >= 0 {
		if y >= 0 {
			return qt.SE.findLeaf(x-distanceToOrigin, y-distanceToOrigin)
		} else {
			return qt.NE.findLeaf(x-distanceToOrigin, y+distanceToOrigin)
		}
	} else {
		if y >= 0 {
			return qt.SW.findLeaf(x+distanceToOrigin, y-distanceToOrigin)
		} else {
			return qt.NW.findLeaf(x+distanceToOrigin, y+distanceToOrigin)
		}
	}
}

// FindLifeCells finds all life cells of qt and calulcates their coordinates based
// on the x and y values that denote the min x and min y of qt in the global coordinate system.
// The root qt has its origin at - 2^(l-1)
func (qt *quadTree) FindLifeCells(x, y Dim, callback func(x, y Dim)) {
	if qt.Population == 0 {
		return
	}
	if qt.Level == 0 {
		if qt.Population > 0 {
			callback(x, y)
		}
		return
	}
	distance := Dim(1) << (qt.Level - 1) // 1 in case of Level 1
	//fmt.Println(distance)
	qt.SE.FindLifeCells(x+distance, y+distance, callback)
	qt.SW.FindLifeCells(x, y+distance, callback)
	qt.NW.FindLifeCells(x, y, callback)
	qt.NE.FindLifeCells(x+distance, y, callback)
}

func (qt *quadTree) childs() []*quadTree {
	return []*quadTree{qt.SE, qt.SW, qt.NW, qt.NE}
}

// gol specific functions

/**
 *   Return a new node one level down containing only the
 *   center elements.
 */
func (qt *quadTree) centeredSubnode() *quadTree {
	var se, sw, nw, ne *quadTree
	se = qt.SE.NW
	sw = qt.SW.NE
	nw = qt.NW.SE
	ne = qt.NE.SW
	return NewTree(Childs{se, sw, nw, ne})
}

/**
*   Return a new node one level down from two given nodes
*   that contains the east centered two sub sub nodes from
*   the west node and the west centered two sub sub nodes
*   from the east node.
*
*   w.ne.se | e.nw.sw
    w.se.ne | e.sw.nw
*/
func centeredHorizontal(w, e *quadTree) *quadTree {
	var se, sw, nw, ne *quadTree
	se = e.SW.NW
	ne = e.NW.SW
	sw = w.SE.NE
	nw = w.NE.SE
	return NewTree(Childs{se, sw, nw, ne})
}

/**
 *   Similar, but this does it north/south instead of east/west.
 *
 *   n.SW.SE | n.SE.SW
 *   s.NW.NE | s.NE.NW
 */
func centeredVertical(n, s *quadTree) *quadTree {
	var se, sw, nw, ne *quadTree
	se = s.NE.NW
	sw = s.NW.NE
	nw = n.SW.SE
	ne = n.SE.SW
	return NewTree(Childs{se, sw, nw, ne})
}

/**
 *   Return a new node two levels down containing only the
 *   centered elements.
 */
func (qt *quadTree) centeredSubSubnode() *quadTree {
	var se, sw, nw, ne *quadTree
	se = qt.SE.NW.NW
	sw = qt.SW.NE.NE
	nw = qt.NW.SE.SE
	ne = qt.NE.SW.SW
	return NewTree(Childs{se, sw, nw, ne})
}

/*
*   At level 2, we can use slow simulation to compute the result
*   generation.  We use bitmask tricks.
 */
func (qt *quadTree) slowSimulation() *quadTree {
	if qt.Level != 2 {
		panic(fmt.Sprint("slowSimulation only possible for quadTree of size 2"))
	}
	allbits := uint16(0)
	for y := Dim(-2); y < 2; y++ {
		for x := Dim(-2); x < 2; x++ {
			allbits = (allbits << 1) + uint16(qt.Cell(x, y))
		}
	}

	return NewTree(Childs{oneGen(allbits), oneGen(allbits >> 1), oneGen(allbits >> 5), oneGen(allbits >> 4)})
}

/**
 *   Given an integer with a bitmask indicating which bits are
 *   set in the neighborhood, calculate whether this cell is
 *   alive or dead in the result generation.  The bottom three
 *   bits are the south neighbors; bits 4..6 are the current
 *   row with bit 5 being the cell itself, and bits 9..11
 *   are the north neighbors.
 */
func oneGen(bitmask uint16) *quadTree {
	if bitmask == 0 {
		return deadLeaf
	}
	self := (bitmask >> 5) & 1
	bitmask &= 0x757 // mask out bits we don't care about 0b0111 0101 0111

	neighborCount := bits.OnesCount16(bitmask)
	if neighborCount == 3 || (neighborCount == 2 && self != 0) {
		return liveLeaf
	}
	return deadLeaf
}

/*NextGeneration returns cached result from qt.result or recursivly computes the result generation.
    It works
    by constructing nine subnodes that are each a quarter the size
    of the current node in each dimension, and combining these in
    groups of four, building subnodes from these, and then
    recursively invoking the NextGeneration function and combining
    those final results into a single return value that is one
    half the size of the current node and advanced one generation in
    time.
    qt.result will contain the result after the call

	Check NextGen(), that keeps the tree level constant.
*/
func (qt *quadTree) NextGeneration() *quadTree {
	if qt.result != nil {
		return qt.result
	}

	if qt.Level == 2 {
		return qt.slowSimulation()
	}

	n00 := qt.NW.centeredSubnode()
	n01 := centeredHorizontal(qt.NW, qt.NE)
	n02 := qt.NE.centeredSubnode()
	n10 := centeredVertical(qt.NW, qt.SW)
	n11 := qt.centeredSubSubnode()
	n12 := centeredVertical(qt.NE, qt.SE)
	n20 := qt.SW.centeredSubnode()
	n21 := centeredHorizontal(qt.SW, qt.SE)
	n22 := qt.SE.centeredSubnode()

	nextGen := NewTree(Childs{
		NW: NewTree(Childs{NW: n00, NE: n01, SW: n10, SE: n11}).NextGeneration(),
		NE: NewTree(Childs{NW: n01, NE: n02, SW: n11, SE: n12}).NextGeneration(),
		SW: NewTree(Childs{NW: n10, NE: n11, SW: n20, SE: n21}).NextGeneration(),
		SE: NewTree(Childs{NW: n11, NE: n12, SW: n21, SE: n22}).NextGeneration(),
	})

	qt.result = nextGen

	return nextGen
}


// NextGen should be used to calulate result generation, grows the tree and changes the Quadree to new one with new state
func (qt *quadTree) NextGen() *quadTree {
	lul := make(NodeMap)
	var keys []Childs
	qt.keySet(&keys)
	for _, x := range keys {
		lul[x] = nodeMap[x]
	}
	nodeMap = lul
	runtime.GC()
	return qt.grow().NextGeneration()
}

type buckets map[int]uint

func (b *buckets) sortedKeys() []int {
	keys := make([]int, len(*b))
	i := 0
	for k := range *b {
		keys[i] = k
		i++
	}
	sort.Ints(keys)
	return keys
}

// Stats about the quadTree and its cache
func (qt *quadTree) Stats() string {
	s := fmt.Sprintln("Level:", qt.Level)
	s += fmt.Sprintln("Population:", qt.Population)
	s += fmt.Sprintln("Cache Size:", len(nodeMap))
	s += fmt.Sprintln("Cache Hit:", cacheHit)
	s += fmt.Sprintln("Cache Miss:", cacheMiss)

	cacheHit = 0
	cacheMiss = 0
	buckets := make(buckets)

	for _, v := range nodeMap {
		buckets[int(v.Level)]++
	}

	for k := range buckets.sortedKeys() {
		s += fmt.Sprintln(k, buckets[k])
	}
	return s
}

func (qt *quadTree) String() string {
	if qt.Level == 0 {
		return fmt.Sprintf("Leaf %v", qt.Population)
	}
	spaces := strings.Repeat("  ", int(10-qt.Level))
	return fmt.Sprintf("(L: %v)\n%vSE: %v\n%vSW: %v\n%vNW: %v\n%vNE: %v", qt.Level, spaces, qt.SE, spaces, qt.SW, spaces, qt.NW, spaces, qt.NE)
}

// Print to console a tree representation, only for small trees suitable
func (qt *quadTree) Print() {
	maxCoord := Dim(1) << (qt.Level - 1)
	for y := -maxCoord; y < maxCoord; y++ {
		fmt.Printf("%3d: ", y)
		for x := -maxCoord; x < maxCoord; x++ {
			fmt.Print(qt.Cell(x, y), " ")
		}
		fmt.Print("\n")
	}
}