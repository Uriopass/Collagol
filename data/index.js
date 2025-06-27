let ws;
let messageWs;
let connectedWs;

function initws() {
    ws = new WebSocket("{{.WSTYPE}}://" + document.location.host + "/echo");

    ws.onopen = function () {
        document.getElementById("errorMessage").innerText = "";
        console.log("OPEN");
        userAction().then(data => initConfig(data));
    };
    ws.onclose = function (evt) {
        console.log("CLOSE");
        console.log(evt);
        if (evt.code === 1001) {
            return;
        }
        console.log("Retrying...");
        setTimeout(function () {
            initws()
        }, 1000);
    };
    ws.onmessage = function (evt) {
        if (!initOk)
            return;

        receive(evt.data);
    };
    ws.onerror = function () {
        document.getElementById("errorMessage").innerText = "Couldn't connect to the server"
    };
}

function initChatroom() {
    document.getElementById("usernameText").value = Cookies.get("username", " ");

    let messageDiv = document.getElementById("messages");
    messageWs = new WebSocket("{{.WSTYPE}}://" + document.location.host + "/message");
    messageWs.onopen = function () {
        console.log("OPEN");
        messageDiv.innerHTML = "";
    };
    messageWs.onclose = function () {
        console.log("Lost connection to chat retrying...");
        setTimeout(function () {
            initChatroom()
        }, 1000);
    };
    messageWs.onmessage = function (evt) {
        let ts = evt.data.substring(0, 14);
        let content = evt.data.substring(15);
        messageDiv.innerHTML += `<li class="message"><span class="timestamp">${ts}</span> ${content}</li>`;
        messageDiv.scrollTop = messageDiv.scrollHeight;
    };
    messageWs.onerror = function (evt) {
        console.log("ERROR: " + evt.data);
    };
}

function initConnected() {
    let connectedDiv = document.getElementById("connectedN");

    connectedWs = new WebSocket("{{.WSTYPE}}://" + document.location.host + "/connected");
    connectedWs.onclose = function () {
        setTimeout(function () {
            initConnected()
        }, 2000);
    };
    connectedWs.onmessage = function (evt) {
        connectedDiv.innerHTML = evt.data;
    };
}


function initRLEs() {
    let rleList = loadRLEs();
    for (let i = 0; i < rleList.length; i++) {
        addRLE(rleList[i])
    }
    saveRLEs()
}

function initConfig(config) {
    height = config.height;
    width = config.width;
    console.log(config);
	resize();

    grid = new Array(height);
    for (let i = 0; i < height; i++) {
        grid[i] = new Uint8Array(width);
        for (let j = 0; j < height; j++) {
            grid[i][j] = 0;
        }
    }
    selectPattern(0);
    draw();
    initOk = true;
}

window.addEventListener("load", function () {
    disableFor1Min();
    initChatroom();
    initws();
    initRLEs();
    initConnected();
    readUrl();
});

function setUrlTo(x, y, zoom) {
    window.history.replaceState(window.history.state, "", "?x="+x+"&y="+y+"&zoom="+zoom);
}

function readUrl() {
    let url_string = window.location.href;
    let url = new URL(url_string);
    if (!url.searchParams.has("x")) {
        return;
    }
    viewportX = parseInt(url.searchParams.get("x"));
    viewportY = parseInt(url.searchParams.get("y"));
    zoom = parseInt(url.searchParams.get("zoom"));
}

function sendMessage() {
    let messageTextEl = document.getElementById("messageText");
    let val = messageTextEl.value.trim();
    messageTextEl.value = "";

    let username = document.getElementById("usernameText").value;
    if (val.length > 0) {
        messageWs.send(`${username}: ${val}`);
    }
    Cookies.set("username", username)
}

const userAction = async () => {
    const response = await fetch('config');
    return await response.json();
};

userAction().then(data => initConfig(data));

function resize() {
    initCanvas(window.innerWidth, window.innerHeight);
}

window.onresize = resize;

let height = -1;
let width = -1;
let grid;
let initOk = false;
let canvas = document.getElementById('gridContainer');

// RGBA format
let bgcolor = 0x000000FF;
let fgcolor = 0xFFFFFFFF;
let activatecolor = 0xEE82EEff; // violet
let erasecolor = 0xFF0000FF;
let holdcolor = 0x00FF00FF;

let bgcolorendian = bgcolor;
let fgcolorendian = fgcolor;
let activatecolorendian = activatecolor;
let erasecolorendian = erasecolor;
let holdcolorendian = holdcolor;

function swap32(val) {
    return ((val & 0xFF) << 24) |
        ((val & 0xFF00) << 8) |
        ((val >> 8) & 0xFF00) |
        ((val >> 24) & 0xFF);
}

let test32 = new Uint32Array(1);
test32[0] = 0x1;
let isLittleEndian = new Uint8Array(test32.buffer)[0] > 0;

if (isLittleEndian) {
    bgcolorendian = swap32(bgcolorendian) >>> 0;
    fgcolorendian = swap32(fgcolorendian) >>> 0;
    activatecolorendian = swap32(activatecolorendian) >>> 0; // violet
    erasecolorendian = swap32(erasecolorendian) >>> 0;
    holdcolorendian = swap32(holdcolorendian) >>> 0;
}


patterns = [
    [],
    [
        [1]
    ],
    [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0],
        [0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0],
        [0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0],
        [0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0],
        [0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0],
        [0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0],
        [0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        [0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        [0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        [0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        [0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        [0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        [0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        [0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        [0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        [0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        [0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        [0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0],
        [0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0],
        [0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0],
        [0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0],
        [0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0],
        [0, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    [
        [1, 1, 1],
        [1, 0, 0],
        [0, 1, 0]
    ],
    [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    [
        [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
        [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0],
        [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0]
    ],
    [
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0]
    ],
    [
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
];

lastTime = 0
// sleep time expects milliseconds
function sleep (time) {
	  return new Promise((resolve) => setTimeout(resolve, time));
}

function receive(obj) {
    let C = 0;
    let x = 0;
    let y = 0;

    for (let i = 0, len = obj.length; i < len; i++) {
        let val = obj.charAt(i);
        if ('0' <= val && val <= '9') {
            C = C * 10 + (val - '0')
        } else if (val === 'o') {
            if (C === 0) {
                C = 1
            }
            while (C > 0) {
                if (grid[y][x] < 2) {
                    grid[y][x] = 1;
                }
                x++;
                C--;
            }
        } else if (val === 'b') {
            if (C === 0) {
                C = 1
            }
            while (C > 0) {
                if (grid[y][x] < 2) {
                    grid[y][x] = 0;
                }
                x++;
                C--;
            }
        } else if (val === '$') {
            y++;
            x = 0;
        }
    }
    
   
    let d = new Date();
    let n = d.getTime();
    let diff = n-lastTime;
    lastTime = n;
    if (diff < 200) {
        sleep(200-diff).then(() => draw());
    } else {
        draw();
    }
}

function resetGrids() {
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            if (grid[i][j] === 2) {
                grid[i][j] = 0;
            } else if (grid[i][j] === 3) {
                grid[i][j] = 0;
            }
        }
    }
}

function sendHandler() {
    let tosend = [];
    let todel = [];

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            if (grid[i][j] === 2) {
                tosend.push([j, i]);
                grid[i][j] = 1;
            }
            if (grid[i][j] === 3) {
                todel.push([j, i]);
                grid[i][j] = 0;
            }
        }
    }
    ws.send(JSON.stringify([tosend, todel]));
    draw()
}

function mouseUpHandler() {
    if (document.getElementById("sendOnRelease").checked) {
        sendHandler();
        return
    }

    let tosend = [];
    let todel = [];

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            if (grid[i][j] === 3) {
                todel.push([j, i]);
                grid[i][j] = 0;
            }
        }
    }

    if (todel.length === 0) {
        return;
    }

    ws.send(JSON.stringify([tosend, todel]));
}

function disableFor1Min() {
    document.getElementById("clearBoard").disabled = true;
    let counter = 60;
    document.getElementById("clearBoard").innerText = "Clear the board - " + counter + "s";
    let t = setInterval(function () {
        counter--;
        document.getElementById("clearBoard").innerText = "Clear the board - " + counter + "s";
        if (counter === 0) {
            clearTimeout(t);
            document.getElementById("clearBoard").disabled = false;
            document.getElementById("clearBoard").innerText = "Clear the board";
        }
    }, 1000);
}

function sendClear() {
    disableFor1Min();
    ws.send(JSON.stringify([[], [[-1, -1]]]));
}

let patterncanvas = document.getElementById('patternDrawer');

let lastPageX = 0, lastPageY = 0;

function repositionPatternCanvas(e) {
    if (e.pageX === undefined) {
        e.pageX = lastPageX;
    }
    if (e.pageY === undefined) {
        e.pageY = lastPageY;
    }

    patterncanvas.style.left = (e.pageX - Math.floor(patterncanvas.width / 2)) + "px";
    patterncanvas.style.top = (e.pageY - Math.floor(patterncanvas.height / 2)) + "px";

    lastPageX = e.pageX;
    lastPageY = e.pageY;
}

document.onmousemove = repositionPatternCanvas;
document.onkeypress = keypresshandler;

function keypresshandler(e) {
    if (e.path !== undefined) {
        if (e.path[0].type !== undefined) {
            if (e.path[0].type.startsWith("text")) {
                return
            }
        }
    }
    switch (e.code) {
        case "KeyY":
            flipPatternY(patternSelectedId);
            break;
        case "KeyX":
            flipPatternX(patternSelectedId);
            break;
        case "KeyR":
            rotatePattern(patternSelectedId);
            break;
    }
    repositionPatternCanvas({});
}

let patterncontext = document.getElementById('patternDrawer').getContext('2d');
let patternSelectedId = 0;

function selectPattern(id) {
    patterncontext.clearRect(0, 0, 800, 800);
    patternSelectedId = id;

    if (id <= 0) {
        patterncanvas.width = 0;
        patterncanvas.height = 0;
        return;
    }

    let pattern = patterns[id];
    patterncanvas.width = pattern[0].length * zoom;
    patterncanvas.height = pattern.length * zoom;
    for (let y = 0; y < pattern.length; y++) {
        for (let x = 0; x < pattern[y].length; x++) {
            patterncontext.fillStyle = 'transparent';
            if (pattern[y][x] === 1) {
                patterncontext.fillStyle = `#${activatecolor.toString(16)}`
            } else if (pattern[y][x] === -1) {
                patterncontext.fillStyle = `#${erasecolor.toString(16)}`;
            }
            patterncontext.fillRect(x * zoom, y * zoom, zoom, zoom);
        }
    }
    repositionPatternCanvas({});
}

function applyPattern(pos_x, pos_y) {
    let pattern = patterns[patternSelectedId];
    for (let y = 0; y < pattern.length; y++) {
        for (let x = 0; x < pattern[y].length; x++) {
            let X = ((x + pos_x) % width + width) % width;
            let Y = ((y + pos_y) % height + height) % height;
            if (X < 0 || X >= width || Y < 0 || Y >= height) {
                continue;
            }
            if (pattern[y][x] === 1) {
                grid[Y][X] = 2;
            } else if (pattern[y][x] === -1) {
                grid[Y][X] = 3;
                redrawCell(X, Y, '#' + erasecolor.toString(16).padStart(8, '0'));
            }
        }
    }
}

canvas.onwheel = function (e) {
    if (e.deltaY < 0) {
        zoom++;
    }
    if (e.deltaY > 0) {
        zoom--;
        if (zoom <= 1) {
            zoom = 1;
        }
    }
    lastYMove = -1;
    lastXMove = -1;
    setUrlTo(~~viewportX, ~~viewportY, zoom);
    selectPattern(patternSelectedId);
    e.preventDefault();
    draw();
};

canvas.ontouchstart = onCanvasOver;
canvas.ontouchmove = onCanvasOver;
canvas.onmousedown = onCanvasOver;
canvas.onmousemove = onCanvasOver;
canvas.onmouseup = mouseUpHandler;
canvas.oncontextmenu = function (e) {
    return false;
};

let context = document.getElementById('gridContainer').getContext('2d');
let image, data32;

function initCanvas(width, height) {
    canvas.width = width;
    canvas.height = height;

    image = context.createImageData(canvas.width, canvas.height);
    data32 = new Uint32Array(image.data.buffer);
}

function colorOf(value) {
    if (value === 0) {
        return '#' + bgcolor.toString(16).padStart(8, '0')
    }
    if (value === 1) {
        return '#' + fgcolor.toString(16).padStart(8, '0')
    }
    if (value === 2) {
        return '#' + activatecolor.toString(16).padStart(8, '0')
    }
    if (value === 3) {
        return '#' + erasecolor.toString(16).padStart(8, '0')
    }
    return '#' + bgcolor.toString(16).padStart(8, '0')
}

initCanvas(screen.width, screen.height);

let lastXMove = -1, lastYMove = -1;

function onCanvasOver(e) {
    e.preventDefault();

    let mouseEv = e;
    if (e.type === "touchmove" || e.type === "touchstart") {
        mouseEv = e.touches[0];
    }

    let pos = getMousePos(canvas, mouseEv);
    let x = Math.floor(pos.x);
    let y = Math.floor(pos.y);

    //console.log(e);

    if (patternSelectedId === 0 || e.buttons === 2 || e.buttons === 4 || (patternSelectedId === 0 && (e.type === "touchmove" || e.type === "touchstart"))) {
        let messageTextEl = document.getElementById("messageText");
        messageTextEl.blur();

        handleMovement(e, x, y);
        return;
    }

    let isClick = e.buttons === 1 || e.buttons === 3 || e.type === "touchstart";

    if (!isClick) {
        if (lastYMove >= 0 && lastXMove >= 0) {
            redrawCell(lastXMove, lastYMove, colorOf(grid[lastYMove][lastXMove]));
        }
        let projected = projectOnMap(x, y);
        x = projected.x;
        y = projected.y;
        lastXMove = x;
        lastYMove = y;
        redrawCell(x, y, '#' + holdcolor.toString(16).padStart(8, '0'));
    }

    if (isClick && e.type === "mousedown" && patternSelectedId === 1) {
        let projected = projectOnMap(x, y);
        x = projected.x;
        y = projected.y;

        let val = grid[y][x];
        if (val < 2) {
            grid[y][x] = 2;
        } else {
            grid[y][x] = 0;
        }
        return
    }

    if ((e.type === "mousedown" || e.type === "touchstart") || (isClick && patternSelectedId <= 2)) {
        let decx = x - patterncanvas.width / 2 + zoom / 2;
        let decy = y - patterncanvas.height / 2 + zoom / 2;
        let projected = projectOnMap(decx, decy);

        applyPattern(projected.x, projected.y);
    }
}

let lastx, lasty;

function handleMovement(e, x, y) {
    if (e.type === "mousedown" || e.type === "touchstart") {
        lastx = x;
        lasty = y;
        return
    }
    if (e.type === "touchmove" || (e.type === "mousemove" && e.buttons !== 0)) {
        viewportX += (x - lastx) / zoom;
        viewportY += (y - lasty) / zoom;
        if (viewportX > 0) {
            viewportX -= width;
        }
        if(viewportY > 0) {
            viewportY -= height;
        }
        lastx = x;
        lasty = y;
        setUrlTo(~~viewportX, ~~viewportY, zoom);
    }
    draw();
}

function redrawCell(x, y, color) {
    let fuckx = (((-viewportX - canvas.width / (2 * zoom)) % width) + width) % width;
    let fucky = (((-viewportY - canvas.height / (2 * zoom)) % height) + height) % height;

    let upperLeftX = ~~fuckx;
    let upperLeftY = ~~fucky;

    let zoomscanx = ~~((fuckx - ~~fuckx) * zoom);
    let zoomscany = ~~((fucky - ~~fucky) * zoom);

    if (x < upperLeftX) {
        x += width;
    }
    if (y < upperLeftY) {
        y += height;
    }
    let decx = x - upperLeftX;
    let decy = y - upperLeftY;

    let starty = decy * zoom - zoomscany;
    let startx = decx * zoom - zoomscanx;

    context.fillStyle = color;
    context.fillRect(startx, starty, zoom, zoom);
}

function changeAutoSendHandler() {
    let d = document.getElementById('sendPattern');
    d.disabled = !d.disabled;
    let d2 = document.getElementById('clearPattern');
    d2.disabled = !d2.disabled;
}

function getMousePos(canvas, evt) {
    let rect = canvas.getBoundingClientRect();
    let scaleX = canvas.width / rect.width;    // relationship bitmap vs. element for X
    let scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY,
    };
}

function projectOnMap(x, y) {
    return {
        x: (~~((x - canvas.width / 2) / zoom - viewportX) % width + width) % width,
        y: (~~((y - canvas.height / 2) / zoom - viewportY) % height + height) % height,
    }
}

function unproject(x, y) {
    return {
        x: ((x + viewportX) % width + width) % width,
        y: ((y + viewportY) % height + height) % height,
    }
}

let viewportX = -400;
let viewportY = -400;
let zoom = 1;

function draw() {
    if (!initOk) {
        return
    }
    context.fillStyle = 'transparent';
    context.fillRect(0, 0, canvas.width, canvas.height);

    let fuckx = (((-viewportX - canvas.width / (2 * zoom)) % width) + width) % width;
    let fucky = (((-viewportY - canvas.height / (2 * zoom)) % height) + height) % height;

    let x = ~~fuckx;
    let startx = x;
    let y = ~~fucky;
    let color;
    let scan = 0;
    let zoomscanx = ~~((fuckx - x) * zoom);
    let startzoomscanx = zoomscanx;
    let zoomscany = ~~((fucky - y) * zoom);
    let W = canvas.width;

    for (let i = 0, l = data32.length; i < l; i++, scan++, zoomscanx++) {
        if (zoomscanx === zoom) {
            x++;
            zoomscanx = 0;
        }
        if (x >= width) {
            x -= width;
        }
        if (scan === W) {
            scan = 0;
            x = startx;
            zoomscany++;
            zoomscanx = startzoomscanx;
            if (zoomscany === zoom) {
                y++;
                zoomscany = 0;
            }
            y = y % height;
        }

        /*
        if (x < 0 || x >= width || y < 0 || y >= height) {
            data32[i] = 0xFF555555;
            continue;
        }
         */

        let cell = grid[y][x];
        if (cell === 1) {
            color = fgcolorendian;
        } else if (cell === 2) {
            color = activatecolorendian;
        } else if (cell === 3) {
            color = erasecolorendian;
        } else if (y === lastYMove && x === lastXMove) {
            color = holdcolorendian;
        } else {
            color = bgcolorendian;
        }

        data32[i] = color;
    }

    // let y1 = unproject(0, 0).y;
    // context.fillStyle = "#aaaaaa";
    //
    // for (let i = 0 ; i < height / 100 ; i++) {
    //     let y1 = unproject(0, i*100).y;
    //     context.fillRect(0, y1 % height, canvas.width, 1);
    // }
    //
    // for (let i = 0 ; i < width / 100 ; i++) {
    //     let x1 = unproject(i*100, 0).x;
    //     context.fillRect(x1 % width, 0, 1, canvas.height);
    // }
    context.putImageData(image, 0, 0);
}

function decode(string) {
    let cells = [];
    let ignore = false;
    let step = 1;
    let x = 0;
    let y = 0;
    let match, number;
    let width = 0,
        height = 0;
    let name = "";
    let naming = false;
    let firstletter = false;

    for (let i = 0; i < string.length; i++) {
        if (ignore) {
            if (string[i] === "\n") {
                ignore = false;
                naming = false;
            }
            if (naming) {
                name += string[i];
            }
            if (firstletter) {
                if (string[i] === "N") {
                    naming = true;
                }
                firstletter = false;
            }
            continue
        }
        switch (string[i]) {
            case "#":
            case "x":
            case "!":
                firstletter = true;
                ignore = true;
                continue;
            case "$":
                x = 0;
                y += step;
                step = 1;
                height = y > height ? y : height;
                continue;
            case "b":
                x += step;
                step = 1;
                continue;
            case "o":
                for (let j = 0; j < step; j++) {
                    cells.push([x++, y]);
                    width = x > width ? x : width;
                }
                step = 1;
                continue
        }
        match = string.slice(i).match(/[0-9]+/);
        if (match && !match.index) {
            number = match[0];
            step = parseInt(number);
            i += number.length - 1
        }
    }

    let grid = new Array(height + 1);
    for (let i = 0; i < grid.length; i++) {
        grid[i] = new Uint8Array(width);
        for (let j = 0; j < grid[i].length; j++) {
            grid[i][j] = 0;
        }
    }
    for (let i = 0; i < cells.length; i++) {
        let cell = cells[i];
        grid[cell[1]][cell[0]] = 1
    }
    return [grid, name.trim()]
}

let customCounter = 1;

let brushes = [];

function parseRLEClickHandler() {
    let rlestr = document.getElementById("rletext").value;
    document.getElementById("rletext").value = "";
    addRLE(rlestr);
    saveRLEs();
    selectPattern(patterns.length - 1)
}

function addRLE(rlestr, temporary) {
    if (temporary === undefined) {
        temporary = false;
    }

    let res = decode(rlestr);
    let decodedpattern = res[0];
    let name = res[1];
    if (decodedpattern.length === 1 && decodedpattern[0].length <= 1) {
        return
    }
    patterns.push(decodedpattern);

    if (temporary) {
        selectPattern(patterns.length - 1);
        return
    }

    let brush_id = brushes.length;
    brushes.push(rlestr);

    if (name === "") {
        name = `Custom brush #${customCounter}`;
        customCounter++
    }

    let custombrushdiv = document.getElementById("customBrushes");
    custombrushdiv.innerHTML += `
<div class="brush" id="brush_${brush_id}">
    <button class="minimal" onclick="selectPattern(${patterns.length - 1})">${name}</button>
    <div class="deleteButton" onclick="removeBrush(${brush_id})"></div>
</div>`;
}

function saveRLEs() {
    Cookies.set("brushes", JSON.stringify(brushes));
}

function loadRLEs() {
    let gotten = Cookies.get("brushes");
    if (gotten === undefined) {
        return []
    }
    return JSON.parse(gotten);
}

function flipPatternY(id) {
    let pattern = patterns[id];
    for (let y = 0; y < pattern.length / 2; y++) {
        let tmp = pattern[y];
        pattern[y] = pattern[pattern.length - 1 - y];
        pattern[pattern.length - 1 - y] = tmp;
    }
    selectPattern(id)
}

function flipPatternX(id) {
    let pattern = patterns[id];
    for (let y = 0; y < pattern.length; y++) {
        let len = pattern[y].length;
        for (let x = 0; x < len / 2; x++) {
            let tmp = pattern[y][x];
            pattern[y][x] = pattern[y][len - 1 - x];
            pattern[y][len - 1 - x] = tmp;
        }
    }
    selectPattern(id)
}

function rotatePattern(id) {
    let pattern = patterns[id];

    let patCopy = new Array(pattern[0].length);
    for (let y = 0; y < patCopy.length; y++) {
        patCopy[y] = new Uint8Array(pattern.length);
        for (let x = 0; x < patCopy[y].length; x++) {
            patCopy[y][x] = pattern[patCopy[y].length - 1 - x][y];
        }
    }

    patterns[id] = patCopy;
    selectPattern(id)
}

function removeBrush(id) {
    document.getElementById(`brush_${id}`).remove();
    brushes[id] = "";
    saveRLEs();
}

function clearButtonHandler() {
    resetGrids()
}
