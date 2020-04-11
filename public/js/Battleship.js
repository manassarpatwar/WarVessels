class Battleship{
    constructor(gameID, size){
        this.id = gameID;
        this.size = size;
        this.playerBoard = this.initBoard(size);
        this.opponentBoard = this.initBoard(size);
        this.cellSize = width/size;

        this.ready = false;
        this.lastAttack = Date.now();
    }

    piecePlaceOK(x, y, piece){
        if(x+piece.getLength()*(1-piece.rotation) > this.size 
        || y+piece.getLength()*piece.rotation > this.size ){
            return false;
        }

        let pieceCoordinates = piece.coords.map(([i,j]) => [i+x, j+y]);
        for(let p of pieceCoordinates){
            if(this.playerBoard[p[0]][p[1]] > 0)
                return false;
        }
        return true;
    }

    initBoard(size){
        let board = [];
        for(let i = 0; i < size; i++){ //rows
            board[i] = [];
            for(let j = 0; j < size; j++ ){ //columns
                board[i][j] = 0;
            } 
        }
        return board;
    }
}