
var playerCanvas;
var opponentCanvas;
var battleship;
var player;

var testing = "TESTING";
var turn;

function setup(){
    createCanvas(0,0);
    select('main').style('height', windowHeight+'px');
    battleship = new Battleship(gameID, 10);
    player = new Player(playerID);
    turn = select('#turn');
    turn.html('Place pieces')
    if(Object.keys(sessionStorage).includes(gameID)){
        let json = JSON.parse(sessionStorage.getItem(gameID));
        battleship.playerBoard = json.playerBoard;
        battleship.opponentBoard = json.opponentBoard;
        player.attack = json.attack;
        player.nextPiece = json.nextPiece;
        if(player.nextPiece > player.pieces.length-1){
            battleship.ready = true;
            start();
        }
    }
}

function postAttack(){
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            var json = JSON.parse(xhr.responseText);
            let attack = json['attack'];

            if(json['ready'] && player.attack.length == 0){
                turn.html('Attack to start playing');
            }
            if(attack){
                if(json['turn'] == player.id){
                    turn.html('Their turn');
                }else{
                    turn.html('Your turn');
                }
                if(battleship.playerBoard[attack[0]][attack[1]] >= 0){
                    if(attack[2] == 1){
                        battleship.playerBoard[attack[0]][attack[1]] = -1;
                    }else{
                        battleship.playerBoard[attack[0]][attack[1]] = -2;
                    }
                }

            }
        }
    }
    xhr.open('POST', '/requestAttack?after='+battleship.lastAttack+'&game='+gameID+'&player='+player.id);
    xhr.send();
}

function start(){
    turn.html('Waiting for other player to be ready');
    let data = {
        player: player.id,
        playerBoard: battleship.playerBoard,
        game: gameID
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
        playerCanvas = can.createCanvas(250, 250);
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

        let place = [floor(can.mouseY/can.width*10), floor(can.mouseX/can.height*10)];
        
        if(!battleship.piecePlaceOK(place[0], place[1], piece))
            return

        let pieceCoordinates = piece.coords.map(([i,j]) => [i+place[0], j+place[1]]);
        for(let p of pieceCoordinates){
            battleship.playerBoard[p[0]][p[1]] = piece.getLength();
        }
        player.nextPiece++;
        let store = {
            playerBoard: battleship.playerBoard,
            opponentBoard: battleship.opponentBoard,
            attack: player.attack,
            nextPiece : player.nextPiece
        }
        sessionStorage.setItem(battleship.id, JSON.stringify(store));
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
        opponentCanvas = can.createCanvas(250, 250);
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
                if(floor(can.mouseY/can.width*10) == i && floor(can.mouseX/can.height*10) == j)
                    can.fill(255);
                if(battleship.opponentBoard[i][j] > 0){
                    can.fill(255, 0, 0);
                }else if(battleship.opponentBoard[i][j] < 0){
                    can.fill(0, 0, 0);
                }
                can.rect(j*cellSize+1, i*cellSize+1, cellSize+2/battleship.size, cellSize+2/battleship.size);
            } 
        }
    }

    can.mouseReleased = async () => {
        if(battleship.ready){
            let attack = [floor(can.mouseY/can.width*10), floor(can.mouseX/can.height*10)];
            if(!battleship.attackOK(attack[0], attack[1], player.attack))
                return

            let data = {
                player: player.id,
                attack: attack,
                game: gameID
            }

            var json = await request('POST', '/attack', data, true);
            let hit = json['hit']
            if(hit){
                let value = json['hit'] == true ? 1 : -1;
                battleship.opponentBoard[attack[0]][attack[1]] = value;
                let store = {
                    playerBoard: battleship.playerBoard,
                    opponentBoard: battleship.opponentBoard,
                    attack: player.attack,
                    nextPiece : player.nextPiece
                }
                turn.html('Their turn');
                player.addAttack(attack);
                sessionStorage.setItem(battleship.id, JSON.stringify(store));
            }else{
                turn.html('Not your turn');
            }
        }
    }

}


new p5(playerSketch, "player");
new p5(opponentSketch, "opponent");