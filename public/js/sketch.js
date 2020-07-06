let PLAYERSKETCH
let OPPONENTSKETCH;

let WARVESSELS;
let PLAYER;
var turn;

var readyBtn;
var playAgainBtn;

window.onload = setup;

function preload(url, callback) {
    const img = new Image();
    img.src = url;
    img.addEventListener('load', () => {callback(img)});
    return img;
}

function createCanvas(canvasId, size) {
    var canvas = document.getElementById(canvasId);
    canvas.width = size;
    canvas.height = size;
    return canvas;
}

function setup() {
    
    const game = select('#game');
    game.style.height = window.innerHeight + 'px';
    readyBtn = select('#readyBtn');
    playAgainBtn = select('#playAgainBtn');

    const smallSize = window.innerWidth < 600;
    const boardWidth = smallSize ? 0.42 * window.innerHeight : Math.min(350, 0.4 * window.innerWidth);

    WARVESSELS = new WarVessels(gameID, 10, boardWidth);
    const root = document.documentElement;
    const percentage = ((WARVESSELS.cellSize/boardWidth)*100).toFixed(2);
    root.style.setProperty("--cellsize", percentage+"%");
    root.style.setProperty("--cellsizepx", WARVESSELS.cellSize+"px");
    root.style.setProperty("--canvas-size", boardWidth+"px");
    
    PLAYER = new Player(playerID, smallSize);

    Object.values(PLAYER.pieces).map(x => {
        x.el.classList.remove('loadingImg');
        x.transform(null,null,x.rotation*90);
    });

    turn = select('#turn');
    html(turn, 'Place ships');

    if (json !== null) {

        WARVESSELS.playerBoard = json.playerBoard;
        const attacks = json.attacks;

        for (const a of attacks) {
            WARVESSELS.opponentBoard[a[0]][a[1]] = a[2] ? 'hit' : 'miss';
        }
        WARVESSELS.ready = json.ready;
        WARVESSELS.started = json.started;
        PLAYER.turn = json.turn;

        if (WARVESSELS.ready) {
            start();
        }
        if (PLAYER.turn && WARVESSELS.started) {
            html(turn, 'Your turn');
        } else if (!PLAYER.turn && WARVESSELS.started) {
            html(turn, 'Their turn');
        }

        //Fixing pieces to the board
        const pieceData = {};
        for (let i = 0; i < WARVESSELS.playerBoard.length; i++) { //rows
            for (let j = 0; j < WARVESSELS.playerBoard[i].length; j++) { //columns
                let key = WARVESSELS.playerBoard[j][i];
                if (Number.isInteger(key) && key !== 0) {
                    key = Math.abs(key);
                    if (pieceData[key] == undefined) {
                        pieceData[key] = { x: i, y: j }
                    } else if (pieceData[key].x == i) {
                        pieceData[key].r = false;
                    } else if (pieceData[key].y == j) {
                        pieceData[key].r = true;
                    }
                }
            }
        }

        for (const p of Object.keys(PLAYER.pieces)) {
            const data = pieceData[PLAYER.pieces[p].id]
            PLAYER.pieces[p].el.classList.remove('interactable');
            PLAYER.pieces[p].rotate(data.r);
            PLAYER.pieces[p].fit(data, WARVESSELS.cellSize);
        }



        if (json.result !== -1) {
            turn.classList.add('end');
            html(turn, 'You ' + (json.result == 1 ? 'won!' : 'lost!'));
            json.result == 1 ? select('#PLAYER').classList.add('noDisplay') : select('#opponent').classList.add('noDisplay');
            playAgainBtn.classList.remove('noDisplay');
        }
    } 


    socket.emit('join', WARVESSELS.id, PLAYER.id, function(id){
        if(id != socket.id){
            select("#multiple-sessions").classList.remove('noDisplay');
            setTimeout(()=>{select("#multiple-sessions").classList.add('active')}, 500);
            select('body').classList.add('has-overlay');
        }
    });


    preload('../public/img/bg2.png', (bg) => {
        const playerCanvas = createCanvas('playerCanvas', boardWidth);
        const opponentCanvas = createCanvas('opponentCanvas', boardWidth);

        PLAYERSKETCH = new initPlayerSketch(playerCanvas);
        OPPONENTSKETCH = new initOpponentSketch(opponentCanvas);

        PLAYERSKETCH.setup(bg);
        OPPONENTSKETCH.setup(bg);
        game.classList.remove('noDisplay');
    })

    socket.on('opponentReady', function () {
        WARVESSELS.opponentReady = true;
        if (WARVESSELS.ready && !WARVESSELS.started) {
            PLAYER.turn = true;
            WARVESSELS.started = false;
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

function playAgain() {
    socket.emit('playAgain', WARVESSELS.id);
    window.location.reload();
}

function playerReady() {
    if (WARVESSELS.ready)
        return;

    let ready = true;
    for (let p of Object.values(PLAYER.pieces)) {
        if (!p.ready)
            ready = false;
    }

    if (!ready) {
        html(turn, 'Please place all pieces');
        return;
    }

    let pieces = Object.values(PLAYER.pieces);
    for (let p of pieces) {
        p.el.classList.remove('interactable');
    }

    readyBtn.classList.add('noDisplay');
    turn.classList.remove('noDisplay');
    start();
}

function start() {
    turn.classList.remove('noDisplay');
    html(turn, 'Waiting for other player to be ready');
    const data = {
        playerBoard: WARVESSELS.playerBoard,
        gameID: WARVESSELS.id,
        totalHits: Player.totalPieceLength,
        playerID: PLAYER.id
    }

    if(!WARVESSELS.ready){
        socket.emit('ready', data);
    }
    WARVESSELS.ready = true;
    if (WARVESSELS.opponentReady && !WARVESSELS.started) {
        PLAYER.turn = true;
        WARVESSELS.started = false;
        html(turn, 'Attack to start playing');
    }

    socket.on('incomingAttack', function (attack) {
        if(attack[3] == PLAYER.id){
            WARVESSELS.started = true;
            PLAYER.turn = true;
            html(turn, 'Your turn');
            if (attack[2] == 1) {
                WARVESSELS.playerBoard[attack[0]][attack[1]] *= -1;
            } else {
                WARVESSELS.playerBoard[attack[0]][attack[1]] = 'miss';
            }

            if (PLAYERSKETCH.touchWater) {
                PLAYERSKETCH.touchWater(attack[1] * WARVESSELS.cellSize + WARVESSELS.cellSize / 2, attack[0] * WARVESSELS.cellSize + WARVESSELS.cellSize / 2)
                PLAYERSKETCH.loadTexture();
                if (!PLAYERSKETCH.showing)
                    PLAYERSKETCH.show();
            }

            result = WARVESSELS.done();
            if (WARVESSELS.finished) {
                setTimeout(() => {
                    turn.classList.add('end');
                    html(turn, 'You ' + (result == 1 ? 'won!' : 'lost!'));
                    result == 1 ? select('#PLAYER').classList.add('noDisplay') : select('#opponent').classList.add('noDisplay');
                    playAgainBtn.classList.remove('noDisplay');
                }, 1000);
                WARVESSELS.ready = false;

            }
        }
    })
}


function update() {
    const selectedPiece = PLAYER.getSelectedPiece();
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
    const selectedPiece = PLAYER.getSelectedPiece();
    if (selectedPiece) {
        selectedPiece.dragged = true;

        dx = (e.clientX - selectedPiece.startPosition.x);
        dy = (e.clientY - selectedPiece.startPosition.y);
        selectedPiece.delta = { x: dx, y: dy };
    }
}

function mouseUp(e) {
    e.preventDefault();
    const selectedPiece = PLAYER.getSelectedPiece();
    if (selectedPiece) {
        PLAYERSKETCH.mouseReleased(selectedPiece);
        selectedPiece.delta = { x: 0, y: 0 };
        selectedPiece.isDragging = false;
        selectedPiece.dragged = false;
        selectedPiece.selected = false;
        selectedPiece.el.classList.remove('pickedup');
    }
}

function mouseDown(e) {
    e.preventDefault();
    if (tutorialOpen) {
        return;
    }
    if (e.touches) { e = e.touches[0]; }
    OPPONENTSKETCH.mouseDown(e);
}

function initPlayerSketch(canvas) {
    this.cellSize;
    this.waterWave;
    this.ctx;
    this.showing;
    this.bg;

    this.setup = (bg) => {
        this.cellSize = (canvas.width - 2) / WARVESSELS.size;
        this.bg = bg;
        this.bg.width = canvas.width;
        this.bg.height = canvas.height;

        this.ctx = canvas.getContext('2d');
        this.ctx.drawImage(this.bg, 0, 0, this.bg.width, this.bg.height);
        this.drawBoard();
        this.waterWave = new WaterWave(canvas.width, canvas.height, this.ctx);

        this.show();

    }

    this.drawBoard = () => {
        this.ctx.strokeStyle = 'rgba(255,255,255,0.15)'

        for (let i = 0; i < WARVESSELS.playerBoard.length; i++) { //rows
            for (let j = 0; j < WARVESSELS.playerBoard[i].length; j++) { //columns
                this.ctx.beginPath();
                this.ctx.rect(j * this.cellSize + 1, i * this.cellSize + 1, this.cellSize + 2 / WARVESSELS.size, this.cellSize + 2 / WARVESSELS.size);
                if (WARVESSELS.playerBoard[i][j] < 0) {
                    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
                    this.ctx.fill();
                } else if (WARVESSELS.playerBoard[i][j] == 'miss') {
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
        this.ctx.drawImage(this.bg, 0, 0, this.bg.width, this.bg.height);
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

    this.mouseReleased = (piece) => {

        if (WARVESSELS.ready)
            return;

        if (Math.abs(piece.delta.x) < 0.5 && Math.abs(piece.delta.y) < 0.5) {
            piece.rotate();
        }


        const place = WARVESSELS.getPiecePlace(piece);
        place.x = Math.round(place.x / canvas.width * WARVESSELS.size);
        place.y = Math.round(place.y / canvas.width * WARVESSELS.size);
        
        if (piece.ready) {
            piece.boardCoords.map(c => WARVESSELS.playerBoard[c[1]][c[0]] = 0);
            piece.ready = false;
        }

        if (WARVESSELS.piecePlaceOK(place, piece)) {
            
            WARVESSELS.placePiece(piece, place);
            const center = WARVESSELS.getCenter(piece);

            this.waterWave.touchWater(Math.floor(center.x), Math.floor(center.y));
            this.loadTexture();
            if (!this.showing)
                this.show();

            const pieceCoordinates = piece.coords.map(([i, j]) => [i + place.x, j + place.y]);

            for (const p of pieceCoordinates) {
                WARVESSELS.playerBoard[p[1]][p[0]] = piece.id;
            }
            piece.boardCoords = pieceCoordinates;
            piece.ready = true;

            let ready = true;
            for (const p of Object.values(PLAYER.pieces)) {
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

function initOpponentSketch(canvas) {
    this.cellSize;
    this.waterWave;
    this.ctx;
    this.showing;
    this.bg;

    this.setup = (bg) => {
        this.cellSize = (canvas.width - 2) / WARVESSELS.size;

        this.bg = bg;
        this.bg.width = canvas.width;
        this.bg.height = canvas.height;

        this.ctx = canvas.getContext('2d');
        this.ctx.drawImage(this.bg, 0, 0, this.bg.width, this.bg.height);

        this.drawBoard();
        this.waterWave = new WaterWave(canvas.width, canvas.height, this.ctx);
        this.show();

    }


    this.drawBoard = () => {
        this.ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        for (let i = 0; i < WARVESSELS.opponentBoard.length; i++) { //rows
            for (let j = 0; j < WARVESSELS.opponentBoard[i].length; j++) { //columns
                this.ctx.beginPath();
                this.ctx.rect(j * this.cellSize + 1, i * this.cellSize + 1, this.cellSize + 2 / WARVESSELS.size, this.cellSize + 2 / WARVESSELS.size);
                if (WARVESSELS.opponentBoard[i][j] == 'hit') {
                    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
                    this.ctx.fill();
                } else if (WARVESSELS.opponentBoard[i][j] == 'miss') {
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
        this.ctx.drawImage(this.bg, 0, 0, this.bg.width, this.bg.height);
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
        if (WARVESSELS.ready && WARVESSELS.opponentReady) {
            const attack = [Math.floor((e.clientY - canvas.offsetTop) / canvas.width * WARVESSELS.size), Math.floor((e.clientX - canvas.offsetLeft) / canvas.height * WARVESSELS.size)];

            if (!WARVESSELS.attackOK(attack[0], attack[1]))
                return

            if (PLAYER.turn) {
                WARVESSELS.started = true
                PLAYER.turn = false;


                html(turn, "<div class='dot-pulse'><span>.</span><span>.</span><span>.</span></div>")

                const data = {
                    playerID: PLAYER.id,
                    attack: attack,
                    gameID: WARVESSELS.id
                }

                var self = this;
                socket.emit('attack', data, function (hit) {
                    const value = hit ? 'hit' : 'miss';
                    WARVESSELS.opponentBoard[attack[0]][attack[1]] = value;
                    html(turn, 'Their turn')

                    result = WARVESSELS.done();
                    if (WARVESSELS.finished) {
                        WARVESSELS.ready = false;

                        setTimeout(() => {
                            turn.classList.add('end');
                            html(turn, 'You ' + (result == 1 ? 'won!' : 'lost!'));
                            result == 1 ? select('#PLAYER').classList.add('noDisplay') : select('#opponent').classList.add('noDisplay');
                            playAgainBtn.classList.remove('noDisplay');
                        }, 1000);
                    }

                    self.waterWave.touchWater(Math.floor(e.clientX - canvas.offsetLeft), Math.floor(e.clientY - canvas.offsetTop));
                    self.loadTexture();
                    if (!self.showing)
                        self.show();
                });
            } 
        }
    }
}

