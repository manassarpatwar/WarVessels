const express = require('express')
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const PORT = process.env.PORT || 5000;
const sslRedirect = require('heroku-ssl-redirect');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

io.on('connection', (client) => {
	client.on('join', function (gameID, playerID, callback) {
		const gameExists = Object.keys(gameState).includes(gameID);
		const room = io.sockets.adapter.rooms[gameID];
		let tabOpen = false;

		if(room !== undefined){
			const clients = room.sockets
			for(const id in clients){
				const c = io.sockets.connected[id].playerID;
				if(playerID === c){
					tabOpen = true;
					break;
				};
			}
		}
		if(gameExists){
			if(tabOpen){
				callback({error: 'anotherTabOpen'});
			}else{
				client.playerID = playerID;
				client.join(gameID);
				const opponentID = Object.keys(gameState[gameID]['players']).find(k => k !== playerID);
				const opponent = gameState[gameID]['players'][opponentID];
				if(opponent && opponent['ready'])
					client.emit('opponentReady', playerID);
			}
		}else{
			callback({error: 'gameDoesNotExist'});
		}

	});

	client.on('ready', function (data, callback) {
		const gameID = data.gameID;
		const playerID = data.playerID;
		const gameExists = gameState[gameID] !== undefined;
		if(gameExists){
			if(gameState[gameID]['players'][playerID] === undefined){
				const totalHits = data.totalHits;
				const playerBoard = data.playerBoard;
				gameState[gameID]['players'][playerID] = {};
				gameState[gameID]['players'][playerID]['hits'] = totalHits;
				gameState[gameID]['players'][playerID]['result'] = -1;
				gameState[gameID]['players'][playerID]['ready'] = true;
				gameState[gameID]['players'][playerID]['attacks'] = [];
				gameState[gameID]['players'][playerID]['playerBoard'] = playerBoard;
				gameState['changed'] = true;
				client.to(gameID).emit('opponentReady');
			}else{
				callback({error: 'playersFull'});
			}
		}else{
			callback({error: 'gameDoesNotExist'});
		}
	});

	client.on('attack', function (data, callback) {
		const gameID = data.gameID;
		const playerID = data.playerID;
		const attack = data.attack;
		const gameExists = gameState[gameID] !== undefined;
		if(gameExists){
			const opponentID = Object.keys(gameState[gameID]['players']).find(k => k !== playerID);
			const opponent = gameState[gameID]['players'][opponentID];
			const player = gameState[gameID]['players'][playerID];
			if (opponent && (gameState[gameID]['lastAttack'] === null || gameState[gameID]['lastAttack']['playerID'] !== playerID)) {
				const hit = opponent['playerBoard'][attack[0]][attack[1]] > 0;
				opponent['playerBoard'][attack[0]][attack[1]] = hit ? -opponent['playerBoard'][attack[0]][attack[1]] : 'miss';
				opponent['hits'] -= hit;
				if(opponent['hits'] === 0){
					player['result'] = 1;
					opponent['result'] = 0;
				}
				attack[2] = hit;
				attack[3] = opponentID;
				gameState[gameID]['lastAttack'] = { playerID: playerID, attack: attack };
				gameState['changed'] = true;
				player['attacks'].push(attack);

				client.to(gameID).emit('incomingAttack', attack);
				callback({hit: hit, error: false});
			}
		}else{
			callback({hit: null, error: 'gameDoesNotExist'});
		}
	});

	client.on('playAgain', function(gameID){
		if (gameState[gameID]['lastAttack'] !== null) {
			gameState[gameID] = {};
			gameState[gameID]['time'] = Date.now();
			gameState[gameID]['players'] = {};
			gameState[gameID]['lastAttack'] = null;
			gameState['changed'] = true;
		}
	});
});

app.use(sslRedirect());

const fs = require('fs');

const gameState = require('./game.json');
gameState['changed'] = false;

const maxAge = (1000 * 1) *//s
	(60 * 1) *
	(60 * 0.5) //h remove game from gameState after 30 mins of initialization

async function write() {
	const currentTime = Date.now()
	const items = Object.keys(gameState);

	for (let i of items) {
		if (gameState[i]['time'] !== undefined) {
			let timestamp = gameState[i]['time'];
			if ((currentTime - timestamp) > maxAge) {
				delete gameState[i];
			}
		}
	}
	if (gameState['changed']) {
		console.log("writing...");
		fs.writeFile("./game.json", JSON.stringify(gameState), function (err) {
			if (err) {
				return console.log(err);
			}
		});
		gameState['changed'] = false;
	}
}

setInterval(write, 15000);


const maxSessions = 3;

app.use(express.json());

app.use(session({ secret: 'XASDASDA' }));
app.use(express.static(__dirname))
	.set('view engine', 'ejs')
	.get('/', (req, res) => {
		const ssn = req.session;
		if (ssn.gamesID !== undefined) {
			for (let i = 0; i < ssn.gamesID.length; i++) {
				if (gameState[ssn.gamesID[i]] === undefined) {
					ssn.gamesID.splice(i, 1);
					i--;
				}
			}
		}
		res.render('pages/index', {gamesID: ssn.gamesID ? ssn.gamesID : [], maxSessions: maxSessions});
	})
	.get('/index', (req, res) => res.redirect('/'))

http.listen(PORT, () => {
	console.log('listening on *:' + PORT);
});


app.post('/init', (req, res, next) => {
	const ssn = req.session;

	if (ssn.gamesID === undefined || ssn.gamesID && ssn.gamesID.length < maxSessions) {
		const gameID = uuidv4();
		if (ssn.gamesID === undefined) {
			ssn.gamesID = [gameID];
		} else {
			ssn.gamesID.push(gameID);
		}
		gameState[gameID] = {};
		gameState[gameID]['time'] = Date.now();
		gameState[gameID]['players'] = {};
		gameState[gameID]['active'] = {};
		gameState[gameID]['lastAttack'] = null;
		gameState['changed'] = true;
	}

	res.send({gamesID: ssn.gamesID });
})

app.get('/play/:gameID', (req, res, next) => {
	const { gameID } = req.params;
	const gameExists = gameState[gameID] !== undefined;
	const ssn = req.session;

	if (gameExists) {
		if (ssn.playerID) {
			if(gameState[gameID]['players'][ssn.playerID] !== undefined){
				//Game exists and player has been given a unique id
				const player = gameState[gameID]['players'][ssn.playerID];
				res.render('pages/index_multiplayer', {
					gameID: gameID,
					playerID: ssn.playerID,
					data: player ? {
						playerBoard: player.playerBoard,
						ready: player.ready,
						started: gameState[gameID]['lastAttack'] !== null,
						turn: gameState[gameID]['lastAttack'] ? gameState[gameID]['lastAttack']['playerID'] !== ssn.playerID : true,
						result: player.result,
						attacks: player.attacks
					} : null
				});
			}else{
				res.render('pages/index_multiplayer', { gameID: gameID, playerID: ssn.playerID, data: null });
			}
		} else if(Object.keys(gameState[gameID]['players']).length < 2){
			//Another player joins the game, and has not been given a unique id
			const playerID = uuidv4();
			ssn.playerID = playerID;
			res.render('pages/index_multiplayer', { gameID: gameID, playerID: ssn.playerID, data: null });
		} else{
			res.redirect('/')
		}
	} else {
		//Link to game does not exist
		res.redirect('/')
	}
});