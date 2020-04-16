const express = require('express')
const session = require('express-session');
const path = require('path')
const { v4: uuidv4 } = require('uuid');
const PORT = process.env.PORT || 5000
const redirectToHTTPS = require('express-http-to-https').redirectToHTTPS

var app = express();
 
// Don't redirect if the hostname is `localhost:port` or the route is `/insecure`
app.use(redirectToHTTPS([/localhost:(\d{4})/], 301));

var ssn;

const fs = require('fs');

var gameState = require('./game.json');
gameState['changed'] = false;

var maxAge = (1000 * 1) *//s
			(60 * 1)* //m
			(60 * 0.5) //h remove game from gameState after 30 mins of initialization

async function write() {
	var currentTime = Date.now()
	const items = Object.keys(gameState);

	for (let i of items) {
		if(gameState[i]['time'] !== undefined){
			let timestamp = gameState[i]['time'];
			if ((currentTime - timestamp) > maxAge) {
				delete gameState[i];
			}
		}
	}
	if(gameState['changed']){
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
	res.send({ game: game });
})

app.post('/start', (req, res, next) => {
	let game = req.body['game'];
	gameState[game] = {};
	gameState[game]['started'] = false;
	gameState[game]['time'] = Date.now();
	gameState[game]['players'] = {};
})

app.get('/play/:game', (req, res, next) => {
	const { game } = req.params;
	let gameExists = Object.keys(gameState).includes(game);
	ssn = req.session;
	if (gameExists) {
		if (ssn.player) {
			//Game exists and player has been given a unique id
			res.render('pages/index_multiplayer', { game: game, playerID: ssn.player });
		} else if (gameState[game]['players'] === undefined || Object.keys(gameState[game]['players']).length < 2) {
			//Another player joins the game, and has not been given a unique id
			const player = uuidv4();
			ssn.player = player;
			res.render('pages/index_multiplayer', { game: game, playerID: ssn.player });
		} else {
			res.status(404).send('404: Page not Found');
		}
	} else {
		//Link to game does not exist
		res.status(404).send('404: Page not Found');
	}
});

app.post('/ready', function (req, res) {
	ssn = req.session;
	let game = req.body['game'];
	let playerBoard = req.body['playerBoard'];
	
	gameState[game]['players'][ssn.player] = {};
	gameState[game]['players'][ssn.player]['playerBoard'] = playerBoard;
	gameState[game]['players'][ssn.player]['attack'] = [];
	gameState['changed'] = true;
});

app.post('/requestAttack', function (req, res) {
	let queries = req.query;
	let game = queries.game;
	let player = queries.player;
	// console.log(gameState);
	if (gameState[game] !== undefined) {
		if (Object.keys(gameState[game]['players']).length > 1) { //There are 2 players
			let lastAttack = gameState[game]['lastAttack'];
			let attack = lastAttack == null ? null : (lastAttack['player'] == player ? null : lastAttack['attack']);
			let started = gameState[game]['started'];
			res.send({ attack: attack, ready: true, started: started });
		} else
			res.send({ attack: null, ready: false, started: false });
	}
})

app.post('/attack', function (req, res) {

	let game = req.body['game'];
	let player = req.body['player'];
	let attack = req.body['attack'];
	let hit = null;

	gameState[game]['started'] = true;
	let opponent = Object.fromEntries(Object.entries(gameState[game]['players']).filter(([k, v]) => k != player));
	let opponentID = Object.keys(opponent)[0]
	opponent = opponent[opponentID];
	hit = opponent['playerBoard'][attack[0]][attack[1]] > 0;
	attack[2] = hit;
	gameState[game]['players'][player]['attack'] = attack;
	gameState[game]['lastAttack'] = {player: player, attack : attack};
	gameState['changed'] = true;

	res.send({ hit: hit });
})
