# Collagol

Collagol stands for Collaborative Game of Life is a persistent game of life universe.  

## How it works

The page is just a facade using Canvas2D in Javascript for the world that is updated using a Go backend.
Front and back communicate through a websocket, each update sends the entire world to every connected user. 

## TODO

Sorted by priority:
 * RLE Sharing
 * Smarter zoom on region
 * Show messages once they are downloaded
 * Rename brushes
 * Change eraser size dynamically
 * Optimize update & network using tiles
 * Temporary RLE
 * Identify which cells was placed by player

Done:
 * ~Fix cursor not aligned (overhaul projection/unprojection)~
 * ~Bigger world~
 * ~Implement Hashlife/Fast updater~
 * ~Translation and scroll~
 * ~Optimized networking~
 * ~Better mobile support / responsive design~
 * ~5 clients per IP at a time~
 * ~Redo CSS to support more resolutions~
 * ~Shortcuts for rotation and flipping~
 * ~Bigger eraser~
 * ~Add send button~
 * ~Change /connected endpoint to WS~
 * ~Optimize draw using Uint32~
 * ~Add timestamps for messages~
 
