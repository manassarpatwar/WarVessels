
var playerCanvas;
var opponentCanvas;
var battleship;
var player;

var testing = "TESTING";

function setup(){
    createCanvas(0,0);
    select('main').style('height', windowHeight+'px');
    battleship = new Battleship(gameID, 10);
    player = new Player(playerID);
    if(Object.keys(sessionStorage).includes(gameID)){
        let json = JSON.parse(sessionStorage.getItem(gameID));
        battleship.playerBoard = json.playerBoard;
        battleship.opponentBoard = json.opponentBoard;
        player.attackHistory = json.attackHistory;
        player.nextPiece = json.nextPiece;
        if(player.nextPiece > player.pieces.length-1){
            battleship.ready = true;
            start();
        }
    }
}

function start(){

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/start', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
        player: player.id,
        playerBoard: battleship.playerBoard,
        attackHistory: player.attackHistory,
        game: gameID
    }));

    console.log("started");
    setInterval(() => {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                var json = JSON.parse(xhr.responseText);
                let attack = json['attack'];
                console.log(attack);
                if(attack){
                    if(attack[3] == 1){
                        battleship.playerBoard[attack[0]][attack[1]] = -1;
                    }
                    battleship.lastAttack = attack[2];
                }
                // alert(xhr.responseText);
            }
        }
        xhr.open('POST', '/requestAttack?after='+battleship.lastAttack+'&game='+gameID+'&player='+player.id);
        xhr.send();
    }, 10000);
}

var playerSketch = (can) => {
    let cellSize;

    can.setup = () => {
        playerCanvas = can.createCanvas(300, 300);
        cellSize = (can.width-2)/battleship.size;
    }

    can.draw = () => {
        can.clear();
        can.background(175);
        can.stroke(70);
        can.strokeWeight(2);


        for(let i = 0; i < battleship.playerBoard.length; i++){ //rows
            for(let j = 0; j < battleship.playerBoard[i].length; j++ ){ //columns
                can.noFill();
                if(floor(can.mouseY/can.width*10) == i && floor(can.mouseX/can.height*10) == j)
                    can.fill(255);
                if(battleship.playerBoard[i][j] > 0){
                    can.fill(0, 0, 255);
                }else if(battleship.playerBoard[i][j] < 0){
                    can.fill(255, 0, 0);
                }
                can.rect(j*cellSize+1, i*cellSize+1, cellSize+2/battleship.size, cellSize+2/battleship.size);
            } 
        }
    }

    can.mouseReleased = () => {
        if(battleship.ready)
            return;
        let piece = player.getPiece()

        let mouseVector = createVector(floor(can.mouseY/can.width*10), floor(can.mouseX/can.height*10));
        if(!(mouseVector.x >= 0 && mouseVector.x < battleship.size &&
            mouseVector.y >= 0 && mouseVector.y < battleship.size)){
                return;
        }
        if(!battleship.piecePlaceOK(mouseVector.x, mouseVector.y, piece))
            return

        let pieceCoordinates = piece.coords.map(([i,j]) => [i+mouseVector.x, j+mouseVector.y]);
        for(let p of pieceCoordinates){
            battleship.playerBoard[p[0]][p[1]] = piece.getLength();
        }
        player.nextPiece++;
        let json = {
            playerBoard: battleship.playerBoard,
            opponentBoard: battleship.opponentBoard,
            attackHistory: player.attackHistory,
            nextPiece : player.nextPiece
        }
        sessionStorage.setItem(battleship.id, JSON.stringify(json));
        if(player.nextPiece > player.pieces.length-1){
            battleship.ready = true;
            start();
            return;
        }
    }

}

var opponentSketch = (can) => {
    let cellSize;
    can.setup = () => {
        opponentCanvas = can.createCanvas(300, 300);
        cellSize = (can.width-2)/battleship.size;
    }

    can.draw = () => {
        can.clear();
        can.background(175);
        can.stroke(70);
        can.strokeWeight(2);
        can.noFill();

        for(let i = 0; i < battleship.opponentBoard.length; i++){ //rows
            for(let j = 0; j < battleship.opponentBoard[i].length; j++ ){ //columns
                can.noFill();
               
                can.rect(j*cellSize+1, i*cellSize+1, cellSize+2/battleship.size, cellSize+2/battleship.size);
            } 
        }

        for(let attack of player.attackHistory){
            if(attack[3] == 1){
                can.fill(255, 0, 0);
            }else{
                can.fill(0);
            }
            can.rect(attack[1]*cellSize+1, attack[0]*cellSize+1, cellSize+2/battleship.size, cellSize+2/battleship.size);
        }
    }

    can.mouseReleased = () => {
        if(battleship.ready){
            let mouseVector = createVector(floor(can.mouseY/can.width*10), floor(can.mouseX/can.height*10));
            
            if(mouseVector.x >= 0 && mouseVector.x < battleship.size &&
                mouseVector.y >= 0 && mouseVector.y < battleship.size){
                player.addAttack([mouseVector.x, mouseVector.y, Date.now()]);

                var xhr = new XMLHttpRequest();
                xhr.open('POST', '/attack', true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.onreadystatechange = function() {
                    if (xhr.readyState == XMLHttpRequest.DONE) {
                        var json = JSON.parse(xhr.responseText);
                        let hit = json['hit'];
                        attack = player.attackHistory.pop();
                        if(hit != null){
                            attack.push(hit);
                            player.attackHistory.push(attack);
                        }
                    }
                }
                xhr.send(JSON.stringify({
                    player: player.id,
                    attackHistory: player.attackHistory,
                    game: gameID
                }));

                let json = {
                    playerBoard: battleship.playerBoard,
                    opponentBoard: battleship.opponentBoard,
                    attackHistory: player.attackHistory,
                    nextPiece : player.nextPiece
                }
                sessionStorage.setItem(battleship.id, JSON.stringify(json));
            }
        }
    }

}


new p5(playerSketch, "player");
new p5(opponentSketch, "opponent");