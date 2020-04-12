const express = require('express')
const session = require('express-session');
const path = require('path')
const { v4: uuidv4 } = require('uuid');
const PORT = process.env.PORT || 5000

var app = express()
var ssn;

const fs = require('fs');

var gameState = require('./game.json');

async function log() {
	fs.writeFile("./game.json", JSON.stringify(gameState), function (err) {
		if (err) {
			return console.log(err);
		}
	});
}

// setInterval(log, 15000);

app.use(express.json());
app.use(session({ secret: 'XASDASDA' }));
app.use(express.static(path.join(__dirname, 'public')))
	.set('views', path.join(__dirname, 'views'))
	.set('view engine', 'ejs')
	.get('/', (req, res) => res.redirect('/index'))
	.get('/index', (req, res) => res.render('pages/index'))
	.listen(PORT, () => console.log(`Listening on ${PORT}`))

app.post('/init', (req, res, next) => {
	const game = uuidv4();
	ssn = req.session;
	const player = uuidv4();
	ssn.player = player;
	gameState[game] = {};
	gameState[game][ssn.player] = {};
	gameState[game][ssn.player]['ready'] = false;

	res.send({game: game});
})

app.get('/play/:game', (req, res, next) => {
	const { game } = req.params;
	let gameExists = Object.keys(gameState).includes(game);
	ssn = req.session;
	if (gameExists) {
		if (Object.keys(gameState[game]).length < 2) {
			if (ssn.player) {
				//Game exists and player has been given a unique id
				res.render('pages/index_multiplayer', { game: game, playerID: ssn.player });
			}else{
				//Another player joins the game, and has not been given a unique id
				const player = uuidv4();
				ssn.player = player;
				gameState[game][ssn.player] = {};
				gameState[game][ssn.player]['ready'] = false;
				res.render('pages/index_multiplayer', { game: game, playerID: ssn.player });
			}
		} else {
			res.status(404).send('404: Page not Found');
		}
	}else{
		//Link to game does not exist
		res.status(404).send('404: Page not Found');
	}
});

app.post('/start', function (req, res) {
	let game = req.body['game'];
	let player = req.body['player'];
	let playerBoard = req.body['playerBoard'];
	gameState[game][player]['ready'] = true;
	gameState[game][player]['playerBoard'] = playerBoard;
	gameState[game][player]['attack'] = null;

});

app.post('/requestAttack', function (req, res) {
	let queries = req.query;
	let game = queries.game;
	let player = queries.player;
	// console.log(gameState);
	if(gameState[game] !== undefined){
		if(Object.keys(gameState[game]).length > 1){ //There are 2 players
			let opponent = Object.fromEntries(Object.entries(gameState[game]).filter(([k, v]) => k != player));
			let opponentID = Object.keys(opponent)[0];
			opponent = opponent[opponentID];
			let turn = null;
			if(gameState[game]['lastAttack'] !== undefined)
				turn = gameState[game]['lastAttack']

			res.send({ attack: opponent['attack'], ready: opponent['ready'], turn: turn});
		}else
			res.send({ attack: null, ready: false, turn: null});
	}
})

app.post('/attack', function (req, res) {

	let game = req.body['game'];
	let player = req.body['player'];
	let attack = req.body['attack'];
	let hit = null;
	if(gameState[game]['lastAttack']  === undefined || gameState[game]['lastAttack'] != player){
		gameState[game]['lastAttack'] = player;
		let opponent = Object.fromEntries(Object.entries(gameState[game]).filter(([k, v]) => k != player));
		let opponentID = Object.keys(opponent)[0]
		opponent = opponent[opponentID];
		hit = opponent['playerBoard'][attack[0]][attack[1]] > 0;
		attack[2] = hit;
		gameState[game][player]['attack'] = attack;
		
	}
	res.send({ hit: hit });
})
