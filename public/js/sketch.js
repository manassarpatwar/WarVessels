var playerCanvas;
var opponentCanvas;

var battleship;
var player;
var turn;

var boardWidth;
var selectedPiece;
var board;


var attackIntervalID;
var bg;
var readyBtn;

function preload(url, callback) {
    let img = new Image();
    img.src = url;
    img.onload = callback;
    return img;
}



window.onload = setup;

function createCanvas(canvasId) {
    var canvas = document.getElementById(canvasId);
    canvas.width = boardWidth;
    canvas.height = boardWidth;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    return canvas;
}

function setup() {
    select('#game').style.height = window.innerHeight + 'px';
    board = select('#board');
    readyBtn = select('#readyBtn');

    let smallSize = window.innerWidth < 600 ;
    boardWidth = smallSize ? 0.6 * window.innerWidth : Math.min(350, 0.4 * window.innerWidth);

    battleship = new Battleship(gameID, 10, boardWidth);
    player = new Player(playerID, battleship.cellSize);
    Object.values(player.pieces).map(x => x.el.classList.remove('loadingImg'));
    let cellSize = battleship.cellSize;
    let carrier = player.pieces['carrier']
    let btlshp = player.pieces['battleship']
    if(smallSize){
        carrier.rotate();
        btlshp.rotate();
        carrier.transform(boardWidth+cellSize/4-carrier.width/8, boardWidth - carrier.height-cellSize/5);
        btlshp.transform(boardWidth+cellSize/4, boardWidth / 2 - btlshp.height-cellSize/4);
    }else{
        carrier.transform(carrier.height / 2 - cellSize / 4, 3 * (boardWidth + cellSize) / 4 + carrier.width / 4);
        btlshp.transform(boardWidth / 2 + btlshp.height / 2 - cellSize / 4, 3 * boardWidth / 4 + cellSize + btlshp.width / 2);
    }
    let destroyer = player.pieces['destroyer'];
    destroyer.transform(-cellSize, 3 * boardWidth / 4 - cellSize + destroyer.height / 4);
    let submarine = player.pieces['submarine'];
    submarine.transform(-cellSize + submarine.width / 16, boardWidth / 2 - submarine.height / 4 - cellSize / 8);
    let patrol = player.pieces['patrol'];
    patrol.transform(-cellSize + patrol.width / 6, boardWidth / 4 - patrol.height / 4 + cellSize / 8);

    turn = select('#turn');

    html(turn, 'Place pieces');

    if (Object.keys(localStorage).includes(battleship.id)) {
        let json = JSON.parse(localStorage.getItem(battleship.id));
        let keys = Object.keys(json);
        battleship.playerBoard = keys.includes('playerBoard') ? json.playerBoard : battleship.playerBoard;
        battleship.opponentBoard = keys.includes('opponentBoard') ? json.opponentBoard : battleship.opponentBoard;
        battleship.ready = json.ready;
        battleship.started = keys.includes('started') ? json.started : battleship.started;
        player.turn = keys.includes('turn') ? json.turn : player.turn;
        if (battleship.ready) {
            start();
        }
        if (player.turn && battleship.started) {
            html(turn, 'Your turn');
        } else if (!player.turn && battleship.started) {
            html(turn, 'Their turn');
        }
        if (keys.includes('pieces')) {
            for (let p of Object.keys(player.pieces)) {
                let data = json['pieces'][p];
                player.pieces[p].el.classList.remove('interactable');
                player.pieces[p].rotate(data.r);
                player.pieces[p].fit(data, cellSize);
            }
        }
    } else {
        localStorage.setItem(battleship.id, JSON.stringify({ 'ready': false, 'time': Date.now() }));
    }

    bg = preload('../img/bg.png', () => {
        playerCanvas = createCanvas('playerCanvas');
        opponentCanvas = createCanvas('opponentCanvas');

        playerSketch(playerCanvas);
        opponentSketch(opponentCanvas);

        playerSketch.setup();
        opponentSketch.setup();
    })

    document.addEventListener('touchend', mouseUp);
    document.addEventListener('mouseup', mouseUp);
    document.addEventListener('mousemove', mouseDragged);
    document.addEventListener('touchmove', mouseDragged);


    //localStorage cleanup

    var currentTime = Date.now()
    const items = Object.keys(localStorage);

    var maxAge = (1000 * 1) *//s
        (60 * 1) *//m
        (60 * 0.5) //h localStorage will be removed after 30 mins of initialization

    for (let i of items) {
        let timestamp = JSON.parse(localStorage.getItem(i))['time'];
        if ((currentTime - timestamp) > maxAge) {
            localStorage.removeItem(i);
            if (i == gameID) {
                window.location.href = '../../index';
            }
        }
    }
}

function playerReady() {
    if (battleship.ready)
        return;

    let ready = true;
    for (let p of Object.values(player.pieces)) {
        if (!p.ready)
            ready = false;
    }
    if (!ready) {
        html(turn, 'Please place all pieces');
        return;
    }

    let store = JSON.parse(localStorage.getItem(gameID));
    store['playerBoard'] = battleship.playerBoard;
    store['pieces'] = {};
    let pieces = Object.values(player.pieces);
    for (let p of pieces) {
        p.el.classList.remove('interactable');
        store['pieces'][p.name] = { x: p.boardCoords[0][0], y: p.boardCoords[0][1], r: p.rotation };
    }

    battleship.ready = true;
    store['ready'] = true;
    localStorage.setItem(gameID, JSON.stringify(store));
    readyBtn.classList.add('noDisplay');
    turn.classList.remove('noDisplay');
    start();
}

function windowResized() {
    for (let p of Object.keys(player.pieces)) {
        if (Object.keys(localStorage).includes(p)) {
            localStorage.removeItem(p);
        }
    }
}

function update() {
    if (selectedPiece) {
        if (selectedPiece.isDragging) {
            requestAnimationFrame(update);
        }
        selectedPiece.transform(selectedPiece.currentPosition.x + selectedPiece.delta.x, selectedPiece.currentPosition.y + selectedPiece.delta.y);
    }
}

function mouseDragged(e) {
    if (e.touches) { e = e.touches[0]; }

    if (selectedPiece) {
        selectedPiece.dragged = true;

        dx = (e.clientX - selectedPiece.startPosition.x);
        dy = (e.clientY - selectedPiece.startPosition.y);
        selectedPiece.delta = { x: dx, y: dy };
    }
}

function mouseUp(e) {
    if (e.touches) { e = e.touches[0]; }

    if (selectedPiece) {

        playerSketch.mouseReleased(e);
        selectedPiece.delta = { x: 0, y: 0 };
        selectedPiece.isDragging = false;
        selectedPiece.dragged = false;
        selectedPiece = false;
    }
    opponentSketch.mouseReleased(e);
}


function postAttack() {
    if ((!player.turn || !battleship.started) && !battleship.finished) { //don't ping server when it is your turn
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                var json = JSON.parse(xhr.responseText);
                // console.log(json);
                let attack = json['attack'];
                if (json['ready'] && !json['started']) {
                    playerReady.turn = true;
                    html(turn, 'Attack to start playing');
                }

                if (attack !== null && json['started']) {
                    battleship.started = true;
                    player.turn = true;
                    html(turn, 'Your turn');
                    let store = JSON.parse(localStorage.getItem(battleship.id));
                    if (attack[2] == 1) {
                        battleship.playerBoard[attack[0]][attack[1]] = -1;
                    } else {
                        battleship.playerBoard[attack[0]][attack[1]] = -2;
                    }
                    playerSketch.touchWater(attack[1] * battleship.cellSize + battleship.cellSize / 2, attack[0] * battleship.cellSize + battleship.cellSize / 2)

                    result = battleship.done();
                    if (battleship.finished) {
                        setTimeout(() => {
                            board.style.display = 'none';
                            turn.style.fontSize = '40px';
                            html(turn, 'You ' + (result == 1 ? 'won!' : 'lost!'));
                            localStorage.removeItem(battleship.id);
                        }, 1000);
                    }
                    store['playerBoard'] = battleship.playerBoard;
                    store['turn'] = player.turn;
                    localStorage.setItem(battleship.id, JSON.stringify(store));
                }

            }
        }
        xhr.open('POST', '/requestAttack?game=' + battleship.id + '&player=' + player.id);
        xhr.send();
    }else{
        clearInterval(attackIntervalID);
    }
}

function start() {
    html(turn, 'Waiting for other player to be ready');
    let data = {
        playerBoard: battleship.playerBoard,
        game: battleship.id
    }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/ready', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));

    postAttack();
    attackIntervalID = setInterval(postAttack, 2000);
}

var playerSketch = (canvas) => {
    let cellSize;
    let waterWave;
    let ctx;

    setup = () => {
        cellSize = (canvas.width - 2) / battleship.size;
        console.log(bg.width)
        bg.width = canvas.width;
        bg.height = canvas.height;

        ctx = canvas.getContext('2d');
        ctx.drawImage(bg, 0, 0, bg.width, bg.height);


        waterWave = new WaterWave(canvas.width, canvas.height, ctx.getImageData(0, 0, bg.width, bg.height).data);

        showPlayer(true);
    }


    touchWater = (x, y) => {
        waterWave.touchWater(Math.floor(x), Math.floor(y), 1000);
    }

    showPlayer = (show = false) => {
        if (!waterWave.done() || show) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = 'rgba(255,255,255,0.07)'
            ctx.strokeWeight = 5;
            var imgDataOut = ctx.getImageData(0, 0, bg.width, bg.height);
            waterWave.init();
            for (let x = 0; x < canvas.width; x++) {
                for (let y = 0; y < canvas.height; y++) {
                    var i = (y * canvas.width + x) * 4;
                    let out = waterWave.render(x, y);
                    if (out) {
                        imgDataOut.data[i] = out.red *= out.strength;
                        imgDataOut.data[i + 1] = out.green *= out.strength;
                        imgDataOut.data[i + 2] = out.blue *= out.strength;
                        imgDataOut.data[i + 3] = 255; // alpha 
                    }
                }
            }

            ctx.putImageData(imgDataOut, 0, 0);
            waterWave.swap();


            for (let i = 0; i < battleship.playerBoard.length; i++) { //rows
                for (let j = 0; j < battleship.playerBoard[i].length; j++) { //columns
                    ctx.beginPath();
                    ctx.rect(j * cellSize + 1, i * cellSize + 1, cellSize + 2 / battleship.size, cellSize + 2 / battleship.size);
                    if (battleship.playerBoard[i][j] == -1) {
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
                        ctx.fill();
                    } else if (battleship.playerBoard[i][j] == -2) {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                        ctx.fill();
                    } else {
                        ctx.stroke();
                    }
                }
            }
        }

        requestAnimationFrame(showPlayer);
    }

    mouseReleased = (e) => {

        if (battleship.ready)
            return;

        if (selectedPiece) {
            releasedPiece = selectedPiece; //really bad as selectedPiece is set to false by global mouseReleased

            if (Math.abs(releasedPiece.delta.x) < 0.5 && Math.abs(releasedPiece.delta.y) < 0.5) {
                releasedPiece.rotate();
            }


            let place = releasedPiece.getPiecePlace();
            place.x = Math.round(place.x / canvas.width * battleship.size);
            place.y = Math.round(place.y / canvas.width * battleship.size);

            if (releasedPiece.ready) {
                releasedPiece.boardCoords.map(c => battleship.playerBoard[c[1]][c[0]] = 0);
                releasedPiece.ready = false;
            }

            if (battleship.piecePlaceOK(place.x, place.y, releasedPiece)) {
                releasedPiece.fit(place, battleship.cellSize);
                let center = releasedPiece.getCenter();

                updatePlayer = true;

                waterWave.touchWater(Math.floor(center.x), Math.floor(center.y), 1000);

                let pieceCoordinates = releasedPiece.coords.map(([i, j]) => [i + place.x, j + place.y]);

                for (let p of pieceCoordinates) {
                    battleship.playerBoard[p[1]][p[0]] = releasedPiece.getLength();
                }
                releasedPiece.boardCoords = pieceCoordinates;
                releasedPiece.ready = true;

                let ready = true;
                for (let p of Object.values(player.pieces)) {
                    if (!p.ready)
                        ready = false;
                }
                if (ready) {
                    readyBtn.classList.remove('noDisplay');
                    turn.classList.add('noDisplay');
                }


            }
        }
    }
    playerSketch.mouseReleased = mouseReleased;
    playerSketch.touchWater = touchWater;
    playerSketch.setup = setup;

}

var opponentSketch = (canvas) => {
    let cellSize;
    let waterWave;
    let ctx;

    setup = () => {
        cellSize = (canvas.width - 2) / battleship.size;

        bg.width = canvas.width;
        bg.height = canvas.height;

        ctx = canvas.getContext('2d');
        ctx.drawImage(bg, 0, 0, bg.width, bg.height);


        waterWave = new WaterWave(canvas.width, canvas.height, ctx.getImageData(0, 0, bg.width, bg.height).data);

        showOpponent(true);
    }

    showOpponent = (show = false) => {
        if (!waterWave.done() || show) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = 'rgba(255,255,255,0.07)'
            ctx.strokeWeight = 5;
            var imgDataOut = ctx.getImageData(0, 0, bg.width, bg.height);
            waterWave.init();
            for (let x = 0; x < canvas.width; x++) {
                for (let y = 0; y < canvas.height; y++) {
                    var i = (y * canvas.width + x) * 4;
                    let out = waterWave.render(x, y);
                    if (out) {
                        imgDataOut.data[i] = out.red *= out.strength;
                        imgDataOut.data[i + 1] = out.green *= out.strength;
                        imgDataOut.data[i + 2] = out.blue *= out.strength;
                        imgDataOut.data[i + 3] = 255; // alpha 
                    }
                }
            }

            ctx.putImageData(imgDataOut, 0, 0);
            waterWave.swap();

            for (let i = 0; i < battleship.playerBoard.length; i++) { //rows
                for (let j = 0; j < battleship.playerBoard[i].length; j++) { //columns
                    ctx.beginPath();
                    ctx.rect(j * cellSize + 1, i * cellSize + 1, cellSize + 2 / battleship.size, cellSize + 2 / battleship.size);
                    if (battleship.opponentBoard[i][j] > 0) {
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
                        ctx.fill();
                    } else if (battleship.opponentBoard[i][j] < 0) {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                        ctx.fill();
                    } else {
                        ctx.stroke();
                    }
                }
            }

        }
        requestAnimationFrame(showOpponent);
    }

    mouseReleased = (e) => {
        console.log(e);
        if (e === undefined)
            return;

        if (battleship.ready) {
            let attack = [Math.floor((e.clientY - canvas.offsetTop) / canvas.width * battleship.size), Math.floor((e.clientX - canvas.offsetLeft) / canvas.height * battleship.size)];

            if (!battleship.attackOK(attack[0], attack[1], player.attack))
                return


            console.log("aaa")
            if (player.turn || !battleship.started) {
                let data = {
                    player: player.id,
                    attack: attack,
                    game: gameID
                }

                var xhr = new XMLHttpRequest();
                xhr.open('POST', '/attack', false);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState == XMLHttpRequest.DONE) {
                        var json = JSON.parse(xhr.responseText);
                        let hit = json['hit']
                        let value = hit ? 1 : -1;
                        battleship.opponentBoard[attack[0]][attack[1]] = value;
                        battleship.started = true;
                        player.turn = false;
                        html(turn, 'Their turn');
                        player.addAttack(attack);

                        attackIntervalID = setInterval(postAttack, 2000);

                        result = battleship.done();
                        if (battleship.finished) {
                            setTimeout(() => {
                                board.style.display = 'none';
                                turn.style.fontSize = '40px';
                                html(turn, 'You ' + (result == 1 ? 'won!' : 'lost!'));
                                localStorage.removeItem(battleship.id);
                            }, 1000);
                        }
                        let store = JSON.parse(localStorage.getItem(battleship.id));
                        store['opponentBoard'] = battleship.opponentBoard;
                        store['turn'] = player.turn;
                        store['started'] = battleship.started;
                        localStorage.setItem(battleship.id, JSON.stringify(store));

                        updateOpponent = true;
                        waterWave.touchWater(Math.floor(e.clientX - canvas.offsetLeft), Math.floor(e.clientY - canvas.offsetTop), 1000);
                    }
                }
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(data));
            } else {
                html(turn, 'Not your turn');
            }
        }
    }

    opponentSketch.mouseReleased = mouseReleased;
    opponentSketch.setup = setup;
}

