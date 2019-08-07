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
let lastGrid;
let patternGrid;

function init(config) {
    height = config.height;
    width = config.width;
    cellSize = config.cellSize;

    console.log(config);

    patternGrid = new Array(100);
    for (let i = 0; i < 100; i++) {
        patternGrid[i] = new Array(100);
        for (let j = 0; j < 100; j++) {
            patternGrid[i][j] = 0;
        }
    }

    grid = new Array(height);
    lastGrid = new Array(height);
    for (let i = 0; i < height; i++) {
        grid[i] = new Array(width);
        lastGrid[i] = new Array(width);
    }
    initOk = true;
}


function receive(obj) {
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            lastGrid[i][j] = grid[i][j];
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
    draw()
}


let patterncanvas = document.getElementById('patternDrawer');

document.onmousemove = function(e) {
    patterncanvas.style.left = e.pageX+"px";
    patterncanvas.style.top = e.pageY+"px";
};

let patterncontext = document.getElementById('patternDrawer').getContext('2d');


function drawPattern() {
    patterncontext.beginPath();
    patterncontext.rect(0, 0, 100, 100);
    patterncontext.fillStyle = 'transparent';
    patterncontext.fill();
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
    let x = Math.floor((pos.x - 2) / cellSize);
    let y = Math.floor((pos.y - 2) / cellSize);
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
    context.rect(x * cellSize, y * cellSize, cellSize, cellSize);

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
    for (y = 0 ; y < height ; y++) {
        for (x = 0 ; x < width ; x++) {
            let cell = grid[y][x];
            if (cell === lastGrid[y][x]) {
                continue
            }
            context.beginPath();
            context.rect(x * cellSize, y * cellSize, cellSize, cellSize);
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
        }
    }
}

setInterval(function () {
    getConnected().then(function(data) {
        document.getElementById("connectedN").innerHTML = data;

    });
}, 1000);

function clearButtonHandler() {
    resetGrids()
}