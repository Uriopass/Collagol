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
        if(!initOk)
            return;
        receive(JSON.parse(evt.data));
    };
    ws.onerror = function(evt) {
        console.log("ERROR: " + evt.data);
    };
});

const userAction = async () => {
    const response = await fetch('config');
    return await response.json();
};

const getConnected = async () => {
    const response = await fetch('connected');
    return await response.json();
};

userAction().then(data => init(data))


let height = -1;
let width = -1;
let grid;
let initOk = false;
let cellSize = -1;

function init(config) {
    height = config.height;
    width = config.width;
    cellSize = config.cellSize;

    grid = new Array(height);
    for (let i = 0; i < height; i++) {
        grid[i] = new Array(width);
    }
    initOk = true;
}


function receive(obj) {
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            let val = obj[i][j];
            if (grid[i][j] !== 2) {
                grid[i][j] = val;
            }
        }
    }

    draw();
}

function resetGrids() {
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            if (grid[i][j] === 2) {
                grid[i][j] = 0;
            }
        }
    }
}

// clear the grid
function sendHandler() {
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
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
    let x = Math.floor((pos.x - 2) / 8);
    let y = Math.floor((pos.y - 2) / 8);
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
}

function redrawCell(x, y, color) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
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

setInterval(function () {
    getConnected().then(function(data) {
        document.getElementById("connectedN").innerHTML = data;

    });
}, 1000);

function clearButtonHandler() {
    resetGrids()
}