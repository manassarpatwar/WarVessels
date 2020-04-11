class Piece{
    constructor(length){
        this.coords = [];
        // this.rotation = Math.round(Math.random());
        this.rotation = 0;
        for(let i = 0; i < length; i++){
            this.coords[i] = [i*(1-this.rotation),i*this.rotation];
        }
    }

    getLength(){
        return this.coords.length;
    }

    rotate(){
        //flip rotation
        this.rotation = (this.rotation+1)%2;

        this.coords = this.coords.map(([i, j]) => ([j, i]));
    }
} 