# Collagol

Collagol stands for Collaborative Game of Life is a persistent game of life universe.  

## How it works

The page is just a facade using Canvas2D in Javascript for the world that is updated using a Go backend.
Front and back communicate through a websocket, each update sends the entire world to every connected user. 

## TODO

Sorted by priority:
 * Bigger world (requires hashlife or a sufficient design)
 * Implement Hashlife/Fast updater
 * Translation and scroll
 * Better mobile support / responsive design
 * RLE Sharing
 * Temporary RLE
 * Identify which cells was placed by player

Done:
 * ~Optimized networking~
 * ~One IP at a time only~
 * ~Redo CSS to support more resolutions~
 * ~Shortcuts for rotation and flipping~
 * ~Bigger eraser~
 * ~Add send button~
 * ~Change /connected endpoint to WS~
 * ~Optimize draw using Uint32~
 
