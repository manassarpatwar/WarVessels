class OpponentCanvas extends Canvas{
    constructor(id, bg){
        super(id, bg);
    }

    done(){
        const won = this.board.flat().filter(x => x < 0).length == Player.totalPieceLength;
        global.finished = won;
        return won ? 1 : 0;
    }

    attackOK(x, y){
        if(!(x >= 0 && x <= this.size &&
            y >= 0 && y <= this.size)){
                return false;
        }

        if(this.board[x] === undefined){
            return false;
        }

        if(this.board[x][y] != 0){
            return false;
        }

        return true;
    }

    mouseDown(e){
        if (global.ready && global.opponentReady) {
            const rect = this.canvas.getBoundingClientRect()
            const attack = [Math.floor((e.clientY - rect.top) / this.canvas.width * this.size), Math.floor((e.clientX - rect.left) / this.canvas.height * this.size)];
            
            if (!this.attackOK(attack[0], attack[1]))
                return

            if (global.player.turn) {
                global.started = true
                global.player.turn = false;


                // switchState('text', "<div class='dot-pulse'><span>.</span><span>.</span><span>.</span></div>")

                const data = {
                    playerID: global.player.id,
                    attack: attack,
                    gameID: global.gameID
                }

                const self = this;
                socket.emit('attack', data, function (json) {
                    if(json.error){
                        if(data.error == 'gameDoesNotExist'){
                            switchState('dropdown', ['Game session has been terminated.', 'Please return to home page and create a new game.'])
                        }
                    }else{
                        if(json.hit){
                            self.board[attack[0]][attack[1]] = -1;
                        }else{
                            self.board[attack[0]][attack[1]] = 'miss';
                        }
                        switchState('text', 'Their turn');

                        const result = self.done();
                        if (global.finished) {
                        global.ready = false;
                            setTimeout(() => {
                            switchState('end', result);
                            }, 1000);
                        }
                        self.loadTexture();
                        self.waterWave.touchWater(Math.floor(e.clientX - rect.left), Math.floor(e.clientY - rect.top));
                        
                        if (!self.showing)
                            renderOpponentCanvas();
                    }
                });
            } 
        }
    }
}