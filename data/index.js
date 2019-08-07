let ws;
window.addEventListener("load", function(evt) {
    ws = new WebSocket("ws://" + document.location.host + "/echo");
    ws.onopen = function(evt) {
        console.log("OPEN");
    };
    ws.onclose = function(evt) {
        console.log("CLOSE");
        ws = null;
    };
    ws.onmessage = function(evt) {
        receive(JSON.parse(evt.data));
    };
    ws.onerror = function(evt) {
        console.log("ERROR: " + evt.data);
    };
});

let rows = 100;
let cols = 100;

let grid = new Array(rows);

function initializeGrids() {
    for (let i = 0; i < rows; i++) {
        grid[i] = new Array(cols);
    }
}

function receive(obj) {
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let val = obj[i][j];
            if (grid[i][j] !== 2) {
                grid[i][j] = val;
            }
        }
    }

    draw();
}

function resetGrids() {
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 2) {
                grid[i][j] = 0;
            }
        }
    }
}

// Initialize
function initialize() {
    initializeGrids();
    resetGrids();
}

// clear the grid
function sendHandler() {
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 2) {
                ws.send(JSON.stringify({
                    x: j,
                    y: i
                }))
                grid[i][j] = 1;
            }
        }
    }
}

let canvas = document.getElementById('gridContainer');
canvas.onmousedown = onCanvasOver;
canvas.onmousemove = onCanvasOver;

let context = document.getElementById('gridContainer').getContext('2d');
let lastpos = {
    x: -1,
    y: -1
};


function onCanvasOver(e) {
    let pos = getMousePos(canvas, e);
    let x = Math.floor((pos.x - 1) / 8);
    let y = Math.floor((pos.y - 1) / 8);
    redrawCell(lastpos.x, lastpos.y, "")
    lastpos = {
        x: x,
        y: y
    };
    redrawCell(x, y, "black")
    if (!(e.buttons === 1 || e.buttons === 3 || e.type === "mousedown")) {
        return
    }
    let val = grid[y][x];
    if (val < 2 || e.type !== "mousedown") {
        grid[y][x] = 2;
    } else {
        grid[y][x] = 0;
    }
    redrawCell(x, y, "");
}

function redrawCell(x, y, color) {
    if (x < 0 || y < 0 || x >= cols || y >= rows) {
        return
    }
    context.beginPath();
    context.rect(x * 8, y * 8, 8, 8);

    if (color === "") {
        let cell = grid[y][x];
        if (cell === 2) {
            color = 'violet';
        } else if (cell === 1) {
            color = 'cadetblue';
        } else {
            color = 'white';
        }
    }
    context.fillStyle = color;

    context.fill();
}

function getMousePos(canvas, evt) {
    let rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left),
        y: (evt.clientY - rect.top)
    };
}

function draw() {
    context.clearRect(0, 0, 1512, 512);
    grid.forEach(function(row, y) {
        row.forEach(function(cell, x) {
            context.beginPath();
            context.rect(x * 8, y * 8, 8, 8);
            if (x === lastpos.x && y === lastpos.y) {
                context.fillStyle = 'black';
            } else if (cell === 1) {
                context.fillStyle = 'cadetblue';
            } else if (cell === 2) {
                context.fillStyle = 'violet';
            } else {
                context.fillStyle = 'white';
            }
            context.fill();
        });
    });
}

function clearButtonHandler() {
    resetGrids()
}

window.onload = initialize;