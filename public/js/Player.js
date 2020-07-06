class Player {
    constructor(id, smallSize) {
        this.id = id;

        this.pieces = [
            new Piece(2, 'patrol'),
            new Piece(3, 'submarine'),
            new Piece(3, 'destroyer'),
            new Piece(4, 'battleship', !smallSize),
            new Piece(5, 'carrier', !smallSize)
        ]
        this.turn = false;
    }

    getSelectedPiece(){
        for(const piece of this.pieces){
            if(piece.selected){
                return piece;
            }
        }
        return null;
    }
}

Player.totalPieceLength = 17;