var playerCanvas;
var opponentCanvas;
var playerSketch;
var opponentSketch;

var battleship;
var player;
var turn;

var boardWidth;
var selectedPiece;
var board;


var bg;
var readyBtn;
var playAgainBtn;

var audioCurrentlyPlaying = [];
var soundImg;
var SOUNDON;

window.onload = setup;

function preload(url, callback) {
    let img = new Image();
    img.src = url;
    img.onload = callback;
    return img;
}


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
    playAgainBtn = select('#playAgainBtn');
    soundImg = select('#soundImg');

    let storedSound = localStorage.getItem('sound');
    SOUNDON = storedSound ? JSON.parse(storedSound) : true;
  
    if(!SOUNDON){
        soundImg.classList.remove('on');
    }

    let smallSize = window.innerWidth < 600;
    boardWidth = smallSize ? 0.42 * window.innerHeight : Math.min(350, 0.4 * window.innerWidth);

    battleship = new Battleship(gameID, 10, boardWidth);
    player = new Player(playerID, battleship.cellSize);
    Object.values(player.pieces).map(x => x.el.classList.remove('loadingImg'));
    let cellSize = battleship.cellSize;
    let carrier = player.pieces['carrier']
    let btlshp = player.pieces['battleship']
    if (smallSize) {
        carrier.rotate();
        btlshp.rotate();
        carrier.transform(boardWidth + cellSize / 4 - carrier.width / 8, boardWidth - carrier.height - cellSize / 5);
        btlshp.transform(boardWidth + cellSize / 4, boardWidth / 2 - btlshp.height - cellSize / 4);
    } else {
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
    html(turn, 'Place ships');

    if (data !== null) {
        let json = data;

        battleship.playerBoard = json.playerBoard;
        let attacks = json.attacks;

        for (let a of attacks) {
            battleship.opponentBoard[a[0]][a[1]] = a[2] ? 1 : -1;
        }
        battleship.ready = json.ready;
        battleship.started = json.started;
        player.turn = json.turn;

        if (battleship.ready) {
            start();
        }
        if (player.turn && battleship.started) {
            html(turn, 'Your turn');
        } else if (!player.turn && battleship.started) {
            html(turn, 'Their turn');
        }

        //Fixing pieces to the board
        let pieceData = {};
        for (let i = 0; i < battleship.playerBoard.length; i++) { //rows
            for (let j = 0; j < battleship.playerBoard[i].length; j++) { //columns
                let key = battleship.playerBoard[j][i];
                if (key !== 0) {
                    if (pieceData[key] == undefined) {
                        pieceData[key] = { x: i, y: j }
                    } else if (pieceData[key].x == i) {
                        pieceData[key].r = 0
                    } else if (pieceData[key].y == j) {
                        pieceData[key].r = 1;
                    }
                }
            }
        }

        for (let p of Object.keys(player.pieces)) {
            let data = pieceData[player.pieces[p].id]
            player.pieces[p].el.classList.remove('interactable');
            player.pieces[p].rotate(data.r);
            player.pieces[p].fit(data, battleship.cellSize);
        }



        if (json.result !== -1) {
            turn.classList.add('end');
            html(turn, 'You ' + (json.result == 1 ? 'won!' : 'lost!'));
            json.result == 1 ? select('#player').classList.add('noDisplay') : select('#opponent').classList.add('noDisplay');
            playAgainBtn.classList.remove('noDisplay');
        }
    } 


    socket.emit('join', battleship.id, player.id);


    bg = preload('../public/img/bg2.png', () => {
        playerCanvas = createCanvas('playerCanvas');
        opponentCanvas = createCanvas('opponentCanvas');

        playerSketch = new initPlayerSketch(playerCanvas);
        opponentSketch = new initOpponentSketch(opponentCanvas);

        playerSketch.setup();
        opponentSketch.setup();
    })

    socket.on('opponentReady', function () {
        battleship.opponentReady = true;
        if (battleship.ready && !battleship.started) {
            player.turn = true;
            battleship.started = false;
            html(turn, 'Attack to start playing');
        }
    });


    document.addEventListener('mousedown', mouseDown, { passive: false });
    document.addEventListener('touchstart', mouseDown, { passive: false });
    document.addEventListener('touchend', mouseUp, { passive: false });
    document.addEventListener('mouseup', mouseUp, { passive: false });
    document.addEventListener('mousemove', mouseDragged, { passive: false });
    document.addEventListener('touchmove', mouseDragged, { passive: false });
}

function toggleSound(){
    SOUNDON = !SOUNDON;
    localStorage.setItem('sound', SOUNDON);
    soundImg.classList.toggle('on');
}

function playHitAudio(){
    var hitAudio = new Audio('../public/audio/hit.mp3');
    hitAudio.play();
}

function playMissAudio(){
    var missAudio = new Audio('../public/audio/miss.mp3');    
    missAudio.play();
}

function playShipAudio(){
    var shipPlaceAudio = new Audio('../public/audio/ship_place.mp3');
    shipPlaceAudio.play();
}

function playAgain() {
    socket.emit('playAgain', battleship.id);
    window.location.reload();
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

    let pieces = Object.values(player.pieces);
    for (let p of pieces) {
        p.el.classList.remove('interactable');
    }

    battleship.ready = true;
    readyBtn.classList.add('noDisplay');
    turn.classList.remove('noDisplay');

    start();
}

function start() {
    turn.classList.remove('noDisplay');
    html(turn, 'Waiting for other player to be ready');
    let data = {
        playerBoard: battleship.playerBoard,
        game: battleship.id,
        totalHits: Player.totalPieceLength,
        player: player.id
    }

    socket.emit('ready', data);

    if (battleship.opponentReady && !battleship.started) {
        player.turn = true;
        battleship.started = false;
        html(turn, 'Attack to start playing');
    }

    socket.on('incomingAttack', function (attack) {
        battleship.started = true;
        player.turn = true;
        html(turn, 'Your turn');
        if (attack[2] == 1) {
            if(SOUNDON)
                playHitAudio();
            battleship.playerBoard[attack[0]][attack[1]] = -1;
        } else {
            if(SOUNDON) 
                playMissAudio();
            battleship.playerBoard[attack[0]][attack[1]] = -2;
        }

        if (playerSketch.touchWater) {
            playerSketch.touchWater(attack[1] * battleship.cellSize + battleship.cellSize / 2, attack[0] * battleship.cellSize + battleship.cellSize / 2)
            playerSketch.loadTexture();
            if (!playerSketch.showing)
                playerSketch.show();
        }

        result = battleship.done();
        if (battleship.finished) {
            setTimeout(() => {
                turn.classList.add('end');
                html(turn, 'You ' + (result == 1 ? 'won!' : 'lost!'));
                result == 1 ? select('#player').classList.add('noDisplay') : select('#opponent').classList.add('noDisplay');
                playAgainBtn.classList.remove('noDisplay');
            }, 1000);
            battleship.ready = false;

        }

    })
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
    e.preventDefault();
    if (e.touches) { e = e.touches[0]; }

    if (selectedPiece) {
        selectedPiece.dragged = true;

        dx = (e.clientX - selectedPiece.startPosition.x);
        dy = (e.clientY - selectedPiece.startPosition.y);
        selectedPiece.delta = { x: dx, y: dy };
    }
}

function mouseUp(e) {
    e.preventDefault();
    if (selectedPiece) {
        playerSketch.mouseReleased(e);
        selectedPiece.delta = { x: 0, y: 0 };
        selectedPiece.isDragging = false;
        selectedPiece.dragged = false;
        selectedPiece = false;
    }
}

function mouseDown(e) {
    e.preventDefault();
    if (tutorialOpen) {
        return;
    }
    if (e.touches) { e = e.touches[0]; }
    opponentSketch.mouseDown(e);
}

function initPlayerSketch(canvas) {
    this.cellSize;
    this.waterWave;
    this.ctx;
    this.showing;

    this.setup = () => {
        this.cellSize = (canvas.width - 2) / battleship.size;

        bg.width = canvas.width;
        bg.height = canvas.height;

        this.ctx = canvas.getContext('2d');
        this.ctx.drawImage(bg, 0, 0, bg.width, bg.height);
        this.drawBoard();
        this.waterWave = new WaterWave(canvas.width, canvas.height, this.ctx);

        select('#playerCanvasTutorial').style.transform = 'translate(0px, -' + canvas.height / 2 + 'px)'

        this.show();

    }

    this.drawBoard = () => {
        this.ctx.strokeStyle = 'rgba(255,255,255,0.15)'

        for (let i = 0; i < battleship.playerBoard.length; i++) { //rows
            for (let j = 0; j < battleship.playerBoard[i].length; j++) { //columns
                this.ctx.beginPath();
                this.ctx.rect(j * this.cellSize + 1, i * this.cellSize + 1, this.cellSize + 2 / battleship.size, this.cellSize + 2 / battleship.size);
                if (battleship.playerBoard[i][j] == -1) {
                    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
                    this.ctx.fill();
                } else if (battleship.playerBoard[i][j] == -2) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    this.ctx.fill();
                } else {
                    this.ctx.stroke();
                }
            }
        }
    }


    this.touchWater = (x, y) => {
        this.waterWave.touchWater(Math.floor(x), Math.floor(y));
    }

    this.loadTexture = () => {
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.ctx.drawImage(bg, 0, 0, bg.width, bg.height);
        this.drawBoard();
        this.waterWave.loadTexture();
    }

    this.show = () => {
        this.waterWave.render();

        if (!this.waterWave.done()) {
            this.showing = true;
            requestAnimationFrame(this.show);
        } else {
            this.showing = false;
        }
    }

    this.mouseReleased = (e) => {
        e.preventDefault();
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

                this.waterWave.touchWater(Math.floor(center.x), Math.floor(center.y));
                this.loadTexture();
                if (!this.showing)
                    this.show();

                if(SOUNDON){
                    playShipAudio();
                }

                let pieceCoordinates = releasedPiece.coords.map(([i, j]) => [i + place.x, j + place.y]);

                for (let p of pieceCoordinates) {
                    battleship.playerBoard[p[1]][p[0]] = releasedPiece.id;
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
}

function initOpponentSketch(canvas) {
    this.cellSize;
    this.waterWave;
    this.ctx;
    this.showing;

    this.setup = () => {
        this.cellSize = (canvas.width - 2) / battleship.size;

        bg.width = canvas.width;
        bg.height = canvas.height;

        this.ctx = canvas.getContext('2d');
        this.ctx.drawImage(bg, 0, 0, bg.width, bg.height);

        this.drawBoard();
        this.waterWave = new WaterWave(canvas.width, canvas.height, this.ctx);
        select('#opponentCanvasTutorial').style.transform = 'translate(0px, -' + canvas.height / 2 + 'px)'
        this.show();

    }


    this.drawBoard = () => {
        this.ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        for (let i = 0; i < battleship.opponentBoard.length; i++) { //rows
            for (let j = 0; j < battleship.opponentBoard[i].length; j++) { //columns
                this.ctx.beginPath();
                this.ctx.rect(j * this.cellSize + 1, i * this.cellSize + 1, this.cellSize + 2 / battleship.size, this.cellSize + 2 / battleship.size);
                if (battleship.opponentBoard[i][j] > 0) {
                    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
                    this.ctx.fill();
                } else if (battleship.opponentBoard[i][j] < 0) {
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    this.ctx.fill();
                } else {
                    this.ctx.stroke();
                }
            }
        }

    }

    this.loadTexture = () => {
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.ctx.drawImage(bg, 0, 0, bg.width, bg.height);
        this.drawBoard();
        this.waterWave.loadTexture()
    }

    this.show = () => {
        this.waterWave.render();
        if (!this.waterWave.done()) {
            this.showing = true;
            requestAnimationFrame(this.show);
        } else {
            this.showing = false;
        }
    }

    this.mouseDown = (e) => {
        if (battleship.ready && battleship.started !== null) {
            let attack = [Math.floor((e.clientY - canvas.offsetTop) / canvas.width * battleship.size), Math.floor((e.clientX - canvas.offsetLeft) / canvas.height * battleship.size)];

            if (!battleship.attackOK(attack[0], attack[1]))
                return

            if (player.turn || !battleship.started) {
                battleship.started = true;
                player.turn = false;


                html(turn, "<div class='dot-pulse'><span>.</span><span>.</span><span>.</span></div>")

                let data = {
                    player: player.id,
                    attack: attack,
                    game: battleship.id
                }

                var self = this;
                socket.emit('attack', data, function (hit) {
                    if(SOUNDON){
                        if (hit) {
                            playHitAudio();
                        } else {
                            playMissAudio();
                        }
                    }
                    let value = hit ? 1 : -1;
                    battleship.opponentBoard[attack[0]][attack[1]] = value;
                    html(turn, 'Their turn')

                    result = battleship.done();
                    if (battleship.finished) {
                        battleship.ready = false;

                        setTimeout(() => {
                            turn.classList.add('end');
                            html(turn, 'You ' + (result == 1 ? 'won!' : 'lost!'));
                            result == 1 ? select('#player').classList.add('noDisplay') : select('#opponent').classList.add('noDisplay');
                            playAgainBtn.classList.remove('noDisplay');
                        }, 1000);
                    }

                    self.waterWave.touchWater(Math.floor(e.clientX - canvas.offsetLeft), Math.floor(e.clientY - canvas.offsetTop));
                    self.loadTexture();
                    if (!self.showing)
                        self.show();
                });
            } else {
                html(turn, 'Not your turn');
            }
        }
    }
}

