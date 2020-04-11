class Player{
    constructor(id){
        this.id = id;
        this.attack = [];
        this.ships = [];
        this.nextPiece = 0;
        this.pieces = [
            new Piece(2),
            new Piece(3),
            new Piece(3),
            new Piece(4),
            new Piece(5)
        ]

    }
    
    addAttack([x, y]){
        this.attack = [x, y]
    }

    getPiece(){
        return this.nextPiece < this.pieces.length ? this.pieces[this.nextPiece] : null;
    }
}