
var playerCanvas;
var opponentCanvas;
var battleship;
var player;
var turn;

var boardWidth;
var selectedPiece;

function setup() {
    createCanvas(0, 0);
    select('#game').style('height', windowHeight + 'px');

    boardWidth = Math.max(windowWidth * 0.25, 250)

    battleship = new Battleship(gameID, 10, boardWidth);
    player = new Player(playerID, battleship.cellSize);
    turn = select('#turn');
    turn.html('Place pieces')
    if (Object.keys(sessionStorage).includes(gameID)) {
        let json = JSON.parse(sessionStorage.getItem(gameID));
        battleship.playerBoard = json.playerBoard;
        battleship.opponentBoard = json.opponentBoard;
        battleship.ready = json.ready;
        player.attack = json.attack;
        player.nextPiece = json.nextPiece;
    }
    // for (let p of Object.keys(player.pieces)) {
    //     if (Object.keys(sessionStorage).includes(p)) {
    //         let json = JSON.parse(sessionStorage.getItem(p));
    //         player.pieces[p].rotation = json.r/90;
    //         player.pieces[p].transform(json.x, json.y, json.r);
    //     }
    // }

}

function windowResized() {
    for (let p of Object.keys(player.pieces)) {
        if (Object.keys(sessionStorage).includes(p)) {
            sessionStorage.removeItem(p);
        }
    }
}

function update() {
    selectedPiece.isDragging = true;
    if (selectedPiece)
        selectedPiece.transform(selectedPiece.delta.x, selectedPiece.delta.y);
}

function mouseDragged(e) {
    if (e.touches) { e = e.touches[0]; }
    // console.log(e.clientX, e.clientY);
    if (selectedPiece) {
        selectedPiece.dragged = true;

        dx = (e.clientX - selectedPiece.startPosition.x) + selectedPiece.currentPosition.x;
        dy = (e.clientY - selectedPiece.startPosition.y) + selectedPiece.currentPosition.y;
        selectedPiece.delta = { x: dx, y: dy };
        if (selectedPiece.isDragging) {
            selectedPiece.isDragging = false;            // no need to call rAF up until next frame
            requestAnimationFrame(update); // request 60fps animation
        };
    }
}

function mouseReleased() {
    if(selectedPiece){
        sessionStorage.setItem(selectedPiece.name, JSON.stringify(selectedPiece.transform()));
        selectedPiece.isDragging = false;
        selectedPiece.dragged = false;
        selectedPiece = false;
    }
}


function postAttack() {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            var json = JSON.parse(xhr.responseText);
            let attack = json['attack'];

            if (json['ready'] && json['turn'] == null) {
                turn.html('Attack to start playing');
            }
            if (attack) {
                if (json['turn'] !== undefined) {
                    if (json['turn'] == player.id) {
                        turn.html('Their turn');
                    } else {
                        turn.html('Your turn');
                    }
                    if (battleship.lastAttack == null || (battleship.lastAttack[0] != attack[0] &&
                        battleship.lastAttack[1] != attack[1])) {
                        if (attack[2] == 1) {
                            battleship.playerBoard[attack[0]][attack[1]] = -1;
                        } else {
                            battleship.playerBoard[attack[0]][attack[1]] = -2;
                        }
                        battleship.lastAttack = attack;
                    }
                }
            }
        }
    }
    xhr.open('POST', '/requestAttack?game=' + gameID + '&player=' + player.id);
    xhr.send();
}

function start() {
    turn.html('Waiting for other player to be ready');
    let data = {
        player: player.id,
        playerBoard: battleship.playerBoard,
        game: battleship.id
    }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/start', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(data));

    postAttack();
    setInterval(postAttack, 2000);
}

var playerSketch = (can) => {
    let cellSize;

    can.setup = () => {
        playerCanvas = can.createCanvas(boardWidth, boardWidth);
        cellSize = (can.width - 2) / battleship.size;
        let carrier = player.pieces['carrier']
        carrier.transform(carrier.height/2-cellSize/4, 3*(can.width+cellSize)/4+carrier.width/4);
        let btlshp = player.pieces['battleship']
        btlshp.transform(can.width/2+btlshp.height/2-cellSize/4, 3*can.width/4+cellSize+btlshp.width/2);
        let destroyer = player.pieces['destroyer'];
        destroyer.transform(-cellSize, 3*can.width/4-cellSize+destroyer.height/4);
        let submarine = player.pieces['submarine'];
        submarine.transform(-cellSize+submarine.width/16, can.width/2-submarine.height/4-cellSize/8);
        let patrol = player.pieces['patrol'];
        patrol.transform(-cellSize+patrol.width/6, can.width/4-patrol.height/4+cellSize/8);
    }

    can.draw = () => {
        can.clear();
        can.background(175);
        can.stroke(70);
        can.strokeWeight(2);


        for (let i = 0; i < battleship.playerBoard.length; i++) { //rows
            for (let j = 0; j < battleship.playerBoard[i].length; j++) { //columns
                can.noFill();
                // if(floor(can.mouseY/can.width*10) == i && floor(can.mouseX/can.height*10) == j)
                //     can.fill(255);
                if (battleship.playerBoard[i][j] > 0) {
                    can.fill(0, 0, 255);
                } else if (battleship.playerBoard[i][j] == -1) {
                    can.fill(255, 0, 0);
                } else if (battleship.playerBoard[i][j] == -2) {
                    can.fill(0, 0, 0);
                }
                can.rect(j * cellSize + 1, i * cellSize + 1, cellSize + 2 / battleship.size, cellSize + 2 / battleship.size);
            }
        }
    }


    can.mouseReleased = () => {
        if (battleship.ready)
            return;

        if(selectedPiece){
            releasedPiece = selectedPiece; //really bad as selectedPiece is set to false by global mouseReleased

            if (!releasedPiece.dragged) {
                releasedPiece.rotate();
            }


            let place = releasedPiece.getPiecePlace();
            place.x = Math.round(place.x/can.width*10);
            place.y = Math.round(place.y/can.width*10);

            if(releasedPiece.ready){
                releasedPiece.boardCoords.map(c => battleship.playerBoard[c[1]][c[0]] = 0);
                releasedPiece.ready = false;
            }

            if(battleship.piecePlaceOK(place.x, place.y, releasedPiece)){
                releasedPiece.fit(place, battleship.cellSize);

                let pieceCoordinates = releasedPiece.coords.map(([i,j]) => [i+place.x, j+place.y]);

                for(let p of pieceCoordinates){
                    battleship.playerBoard[p[1]][p[0]] = releasedPiece.getLength();
                }
                releasedPiece.boardCoords = pieceCoordinates;
                releasedPiece.ready = true;

            }
        }

    }

}

var opponentSketch = (can) => {
    let cellSize;
    can.setup = () => {
        opponentCanvas = can.createCanvas(boardWidth, boardWidth);
        cellSize = (can.width - 2) / battleship.size;
    }

    can.draw = () => {
        can.clear();
        can.background(175);
        can.stroke(70);
        can.strokeWeight(2);
        can.noFill();

        for (let i = 0; i < battleship.opponentBoard.length; i++) { //rows
            for (let j = 0; j < battleship.opponentBoard[i].length; j++) { //columns
                can.noFill();
                if (floor(can.mouseY / can.width * 10) == i && floor(can.mouseX / can.height * 10) == j)
                    can.fill(255);
                if (battleship.opponentBoard[i][j] > 0) {
                    can.fill(255, 0, 0);
                } else if (battleship.opponentBoard[i][j] < 0) {
                    can.fill(0, 0, 0);
                }
                can.rect(j * cellSize + 1, i * cellSize + 1, cellSize + 2 / battleship.size, cellSize + 2 / battleship.size);
            }
        }
    }

    can.mouseReleased = async () => {
        if (battleship.ready) {
            let attack = [floor(can.mouseY / can.width * 10), floor(can.mouseX / can.height * 10)];
            if (!battleship.attackOK(attack[0], attack[1], player.attack))
                return

            let data = {
                player: player.id,
                attack: attack,
                game: gameID
            }

            var json = await request('POST', '/attack', data, true);
            let hit = json['hit']
            if (hit !== null) {
                console.log(hit);
                let value = hit ? 1 : -1;
                console.log(hit);
                battleship.opponentBoard[attack[0]][attack[1]] = value;
                let store = {
                    playerBoard: battleship.playerBoard,
                    opponentBoard: battleship.opponentBoard,
                    attack: player.attack,
                    ready : battlship.ready,
                    nextPiece: player.nextPiece
                }
                turn.html('Their turn');
                player.addAttack(attack);
                sessionStorage.setItem(battleship.id, JSON.stringify(store));
            } else {
                turn.html('Not your turn');
            }
        }
    }

}


new p5(playerSketch, "player");
new p5(opponentSketch, "opponent");