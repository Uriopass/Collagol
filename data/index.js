let ws;
window.addEventListener("load", function(evt) {
    ws = new WebSocket("ws://localhost:8080/echo");
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
            if(grid[i][j] !== 2) {
                grid[i][j] = val;
                let cell = document.getElementById(i + "_" + j);
                if(val === 0) {
                    cell.setAttribute("class", "dead");
                } else if(val === 1) {
                    cell.setAttribute("class", "live");
                }
            }
        }
    }
}

function resetGrids() {
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 2) {
                grid[i][j] = 0;
                let cell = document.getElementById(i + "_" + j);
                cell.setAttribute("class", "dead");
            }
        }
    }
}

// Initialize
function initialize() {
    createTable();
    initializeGrids();
    resetGrids();
}

// Lay out the board
function createTable() {
    let gridContainer = document.getElementById('gridContainer');
    if (!gridContainer) {
        // Throw error
        console.error("Problem: No div for the drid table!");
    }
    let table = document.createElement("table");

    for (let i = 0; i < rows; i++) {
        let tr = document.createElement("tr");
        for (let j = 0; j < cols; j++) {//
            let cell = document.createElement("td");
            cell.setAttribute("id", i + "_" + j);
            cell.setAttribute("class", "dead");
            cell.onmouseover = cellClickHandler;
            cell.onclick = cellClickHandler;
            tr.appendChild(cell);
        }
        table.appendChild(tr);
    }
    gridContainer.appendChild(table);
}

function cellClickHandler(e) {
    if(!(e.buttons === 1 || e.buttons === 3 || e.type === "click")) {
        return
    }
    let rowcol = this.id.split("_");
    let row = rowcol[0];
    let col = rowcol[1];

    if(grid[row][col] === 2) {
        grid[row][col] = 1;
        this.setAttribute("class", "dead");
        return
    }
    this.setAttribute("class", "activate");
    grid[row][col] = 2;
}

// clear the grid
function sendHandler() {
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 2) {
                ws.send(JSON.stringify({x: j, y: i}))
                let cell = document.getElementById(i + "_" + j);
                cell.setAttribute("class", "live");
                grid[i][j] = 1;
            }
        }
    }
}

// clear the grid
function clearButtonHandler() {
    console.log("Clear the game: stop playing, clear the grid");

    resetGrids()
}

// Start everything
window.onload = initialize;