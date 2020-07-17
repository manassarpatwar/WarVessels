let socket;

const elements = {
    text: '#infoPara', 
    button: '#playButton', 
    dropdown: '#dropdown-info', 
    body: 'body', 
    board: '#board',
    info: '#info', 
    player: '#player', 
    opponent: '#opponent',
    helpInfo: '#help-info'
};
const states = ['text', 'button', 'dropdown']
const global = {
    size: 10, 
    gameID: null,
    player: null,
    boardLength: null, 
    cellSize: null,
    ready: false,
    opponentReady: false,
    started: false,
    finished: false,
    playerCanvas: null,
    opponentCanvas: null,
    tutorialOpen: false
};


function switchState(state, data){
    switch(state){
        case 'on': {
            elements.board.classList.remove('noDisplay');
            elements.info.classList.remove('noDisplay');
            break;
        }
        case 'text': {
            elements.text.classList.remove('noDisplay');
            elements.button.classList.add('noDisplay');
            elements.text.classList.remove('end');
            if(data){
                const text = document.createTextNode(data);
                elements.text.innerHTML = '';
                elements.text.appendChild(text);
            }
            break;
        }
        case 'button': {
            elements.button.classList.remove('noDisplay');
            elements.text.classList.add('noDisplay');
            if(data){
                const tag = document.createElement('p');
                const text = document.createTextNode(data);
                tag.appendChild(text);
                elements.button.innerHTML = '';
                elements.button.appendChild(tag);
            }
            break;
        }
        case 'end': {
            elements.text.classList.remove('noDisplay');
          
            elements.button.classList.remove('noDisplay');
            const result = data === 1 ? 'You won!' : data === -1 ? 'You lost!' : null;
            if(result){
                const text = document.createTextNode(result);
                elements.text.innerHTML = '';
                elements.text.appendChild(text);
                elements.text.classList.add('end');

                const tag = document.createElement('p');
                tag.appendChild(document.createTextNode('Play again?'));
                elements.button.innerHTML = '';
                elements.button.appendChild(tag);
                elements.button.onclick = playAgain;

                if(data === 1){
                    elements.player.classList.add('noDisplay');
                }else if(data === -1){
                    elements.opponent.classList.add('noDisplay');
                };
            }
            break;
        }
        case 'dropdown': {
            elements.dropdown.classList.remove('noDisplay');
            setTimeout(()=>{elements.dropdown.classList.add('active')}, 500);
            elements.body.classList.add('overlay');
            if(data){
                const tag = document.createElement('p');
                for(const d of data){
                    const br = document.createElement('br');
                    const text = document.createTextNode(d);
                    tag.appendChild(text);
                    tag.appendChild(br);
                }
                elements.dropdown.innerHTML = '';
                elements.dropdown.appendChild(tag);
            }
            break
        }
        case 'dropdown-close': {
            elements.dropdown.classList.add('noDisplay');
            elements.dropdown.classList.remove('active');
            elements.body.classList.remove('overlay');
            elements.dropdown.innerHTML = '';
            break
        }
        default:
            break;

    }
    
}


function playAgain() {
    socket.emit('playAgain', global.gameID);
    window.location.reload();
}

function playerReady() {
    if (global.ready)
        return;

    const ready = global.player.pieces.every(x => x.ready);

    if (!ready) {
        return;
    }

    Object.values(global.player.pieces).map(x => x.el.classList.remove('interactable'));
    start();
}

function start() {
    switchState('text', 'Waiting for other player to be ready');
    const data = {
        playerBoard: global.playerCanvas.board,
        gameID: global.gameID,
        totalHits: Player.totalPieceLength,
        playerID: global.player.id
    }

    if(!global.ready){
        socket.emit('ready', data, function(json){
            if(json.error == 'gameDoesNotExist'){
                switchState('dropdown', ['Game session has been terminated.', 'Please return to home page and create a new game.'])
            }else if(json.error == 'playersFull'){
                switchState('dropdown', ['Game session already underway with two players.', 'Please return to home page and create a new game.'])
            }
        });
    }
    global.ready = true;
    if (global.opponentReady && !global.started) {
        global.player.turn = true;
        global.started = false;
        switchState('text', 'Attack to start playing');
    }

    global.playerCanvas.start();
}

function updatePiece(){
    const selectedPiece = global.player.getSelectedPiece();
    if(selectedPiece){
        if (selectedPiece.isDragging) {
            requestAnimationFrame(updatePiece);
        }
        selectedPiece.transform(selectedPiece.currentPosition.x + selectedPiece.delta.x, selectedPiece.currentPosition.y + selectedPiece.delta.y);
    }
}

function renderPlayerCanvas(){
    global.playerCanvas.waterWave.render();

    if (!global.playerCanvas.waterWave.done()) {
        global.playerCanvas.showing = true;
        requestAnimationFrame(renderPlayerCanvas);
    } else {
        global.playerCanvas.showing = false;
    }
}

function renderOpponentCanvas(){
    global.opponentCanvas.waterWave.render();

    if (!global.opponentCanvas.waterWave.done()) {
        global.opponentCanvas.showing = true;
        requestAnimationFrame(renderOpponentCanvas);
    } else {
        global.opponentCanvas.showing = false;
    }
}

function mouseDragged(e){
    e.preventDefault();
    if (e.touches) { e = e.touches[0]; }
    const selectedPiece = global.player.getSelectedPiece();
    if (selectedPiece) {
        selectedPiece.dragged = true;
        selectedPiece.isDragging = true;
        dx = (e.clientX - selectedPiece.startPosition.x);
        dy = (e.clientY - selectedPiece.startPosition.y);
        selectedPiece.delta = { x: dx, y: dy };
    }
}

function mouseUp(e){
    e.preventDefault();
    const selectedPiece = global.player.getSelectedPiece();
    if (selectedPiece) {
        global.playerCanvas.mouseReleased(selectedPiece);
        selectedPiece.delta = { x: 0, y: 0 };
        selectedPiece.isDragging = false;
        selectedPiece.dragged = false;
        selectedPiece.selected = false;
        selectedPiece.el.classList.remove('pickedup');
    }
}

function mouseDown(e){
    e.preventDefault();
    if (global.tutorialOpen) {
        return;
    }
    if (e.touches) { e = e.touches[0]; }
    global.opponentCanvas.mouseDown(e);
}


window.onload = setup;

function setup() {
    const smallSize = window.innerWidth < 600;
    global.boardLength = smallSize ? 0.42 * window.innerHeight : Math.min(350, 0.4 * window.innerWidth);
    global.cellSize = global.boardLength/global.size;

    const root = document.documentElement;
    const percentage = ((global.cellSize/global.boardLength)*100).toFixed(2);
    root.style.setProperty("--cellsize", percentage+"%");
    root.style.setProperty("--cellsizepx", global.cellSize+"px");
    root.style.setProperty("--canvas-size", global.boardLength+"px");
    
    global.player = new Player(global.playerID, smallSize);

    Object.values(global.player.pieces).map(x => {
        x.el.classList.remove('loadingImg');
        x.transform(null,null,x.rotation*90);
    });

    Object.keys(elements).map(x => elements[x] = select(elements[x]));

    elements.button.onclick = playerReady;

    socket = io();
    switchState('text', 'Place ships')

    const preload = (url, callback) => {
        const img = new Image();
        img.src = url;
        img.addEventListener('load', () => {callback(img)});
        return img;
    }

    preload('../public/img/bg2.png', (bg) => {
        global.playerCanvas = new PlayerCanvas('playerCanvas', bg);
        global.opponentCanvas = new OpponentCanvas('opponentCanvas', bg);   

        if (json !== null) {

            global.playerCanvas.board = json.playerBoard;
            const attacks = json.attacks;

            for (const a of attacks) {
                if(a[2]){
                    global.opponentCanvas.board[a[0]][a[1]] = -1;
                }else{
                    global.opponentCanvas.board[a[0]][a[1]] = 'miss'; 
                };
            }
            global.ready = json.ready;
            global.started = json.started;
            global.player.turn = json.turn;

            if (global.ready && json.result == -1) {
                start();
            }
            if (global.player.turn && global.started) {
                switchState('text', 'Your turn');
            } else if (!global.player.turn && global.started) {
                switchState('text', 'Their turn');
            }

            //Fixing pieces to the board
            const pieceData = {};
            for (let i = 0; i < global.playerCanvas.board.length; i++) { //rows
                for (let j = 0; j < global.playerCanvas.board[i].length; j++) { //columns
                    let key = global.playerCanvas.board[j][i];
                    if (Number.isInteger(key) && key !== 0) {
                        key = Math.abs(key);
                        if (pieceData[key] == undefined) {
                            pieceData[key] = { x: i, y: j }
                        } else if (pieceData[key].x == i) {
                            pieceData[key].r = false;
                        } else if (pieceData[key].y == j) {
                            pieceData[key].r = true;
                        }
                    }
                }
            }

            for (const p of Object.keys(global.player.pieces)) {
                const data = pieceData[global.player.pieces[p].id]
                global.player.pieces[p].el.classList.remove('interactable');
                global.player.pieces[p].rotate(data.r);
                global.player.pieces[p].fit(data, global.cellSize);
            }



            if (json.result !== -1) {
                switchState('end', json.result ? 1 : -1)
            }

            global.playerCanvas.loadTexture();
            global.opponentCanvas.loadTexture();
        } 
        switchState('on');
        if (!localStorage.getItem('tutorialDone')) {
            setTimeout(() => {
                if(!global.tutorialOpen)tutorial();
                localStorage.setItem('tutorialDone', true);
            }, 1000);
        }
    });

    socket.emit('join', global.gameID, global.player.id, function(json){
        if(json.error == 'gameDoesNotExist'){
            switchState('dropdown', ['Game session has been terminated.', 'Please return to home page and create a new game.'])
        }else if(json.error == 'anotherTabOpen'){
            switchState('dropdown', ['Another session of the same game is running on your browser. ',
            'Please return to that session to continue playing.'])
        }
    });

    socket.on('opponentReady', function () {
        global.opponentReady = true;
        if (global.ready && !global.started) {
            global.player.turn = true;
            global.started = false;
            switchState('text', 'Attack to start playing');
        }
    });

    document.addEventListener('mousedown', mouseDown, { passive: false });
    document.addEventListener('touchstart', mouseDown, { passive: false });
    document.addEventListener('touchend', mouseUp, { passive: false });
    document.addEventListener('mouseup', mouseUp, { passive: false });
    document.addEventListener('mousemove', mouseDragged, { passive: false });
    document.addEventListener('touchmove', mouseDragged, { passive: false });
}