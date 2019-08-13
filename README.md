# Collagol

Collagol stands for Collaborative Game of Life is a persistent game of life universe.  

## How it works

The page is just a facade using Canvas in Javascript for the world that is updated using a Go backend.
Front and back communicate through a websocket, each update sends the entire world to every connected user. 

## TODO List

 * Translation and scroll
 * Bigger world
 * Optimized networking
 * Implement Hashlife
 * RLE Sharing
 * Temporary RLE
 * Bigger eraser
 * Identify which cells was placed by player
 * Add send button
 * ~One IP at a time only~
 * ~Optimize draw using Uint32~
 * Redo CSS to support more resolutions
 * Better mobile support 
 * Change /connected endpoint to WS
 
