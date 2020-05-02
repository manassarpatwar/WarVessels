class WarVessels{
    constructor(gameID, size, boardWidth){
        this.id = gameID;
        this.size = size;
        this.playerBoard = this.initBoard(size);
        this.opponentBoard = this.initBoard(size);
        this.cellSize = boardWidth/size;
        this.boardWidth = boardWidth
        this.ready = false;
        this.opponentReady = false;
        this.started = null;
        this.finished = false;

    }
    
    done(){
        let won = this.opponentBoard.flat().filter(x => x == 'hit').length == Player.totalPieceLength;
        let lost = this.playerBoard.flat().filter(x => x < 0).length == Player.totalPieceLength;
        this.finished = won || lost;
        return won ? 1 : lost ? 0 : -1;
    }


    attackOK(x, y){
        if(!(x >= 0 && x <= this.size &&
            y >= 0 && y <= this.size)){
                return false;
        }

        if(this.opponentBoard[x] === undefined){
            return false;
        }

        if(this.opponentBoard[x][y] != 0){
            return false;
        }

        return true;
    }

    piecePlaceOK(x, y, piece){
        if(!(x >= 0 && x <= this.size &&
            y >= 0 && y <= this.size)){
                return false;
        }

        if(x+piece.getLength()*piece.rotation > this.size ||
        y+piece.getLength()*(1-piece.rotation) > this.size){
            return false;
        }

        let pieceCoordinates = piece.coords.map(([i,j]) => [i+x, j+y]);

        //Out of bounds check
        for(let p of pieceCoordinates){
            if(p[0] > this.size || p[1] > this.size)
                return false;
        }

        //Other pieces overlap check
        for(let p of pieceCoordinates){
            if(this.playerBoard[p[1]] === undefined){
                return false;
            }else if(this.playerBoard[p[1]][p[0]] == undefined){
                return false;
            }else if(this.playerBoard[p[1]][p[0]] > 0)
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