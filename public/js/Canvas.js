class Canvas{
    constructor(id, bg){
        this.canvas = select('#'+id);
        this.boardLength = global.boardLength;
        this.size = global.size;
        this.canvas.width = this.boardLength;
        this.canvas.height = this.boardLength;
        this.board = this.initBoard(this.size);
        this.showing = false;
        this.cellSize = this.boardLength / global.size;
        this.bg = bg;
        
        this.bg.width = this.canvas.width;
        this.bg.height = this.canvas.height;
        
        this.ctx = this.canvas.getContext('2d');
        this.ctx.drawImage(this.bg, 0, 0, this.bg.width, this.bg.height);
        this.drawBoard();
        this.waterWave = new WaterWave(this.canvas.width, this.canvas.height, this.ctx);

    }

    initBoard(size){
        const board = [];
        for(let i = 0; i < size; i++){ //rows
            board[i] = [];
            for(let j = 0; j < size; j++ ){ //columns
                board[i][j] = 0;
            } 
        }
        return board;
    }

    drawBoard(lines = true){
        this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.board.length; i++) { //rows
            for (let j = 0; j < this.board[i].length; j++) { //columns
                this.ctx.beginPath();
                this.ctx.rect(j * this.cellSize, i * this.cellSize, this.cellSize, this.cellSize);
                if (this.board[i][j] < 0) {
                    this.ctx.fillStyle = 'rgba(255,0,0,0.6)';
                    this.ctx.fill();
                } else if (this.board[i][j] == 'miss') {
                    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    this.ctx.fill();
                }else if(lines){
                    this.ctx.stroke();
                }
            }
        }
    }


    touchWater(x, y){
        this.waterWave.touchWater(Math.floor(x), Math.floor(y));
    }

    loadTexture(){
        this.ctx.clearRect(0,0,this.width, this.height);
        this.ctx.drawImage(this.bg, 0, 0, this.bg.width, this.bg.height);
        this.drawBoard();
        this.waterWave.loadTexture();
    }

}