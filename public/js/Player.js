class Player{
    constructor(id){
        this.id = id;
        this.attackHistory = [];
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
    
    addAttack([x, y, _]){
        if(this.attackHistory.filter(([i,j, _]) => i == x && j == y ).length == 1){
            return
        }
        this.attackHistory.push([x,y, _]);
    }

    getPiece(){
        return this.nextPiece < this.pieces.length ? this.pieces[this.nextPiece] : null;
    }
}