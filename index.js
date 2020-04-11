const express = require('express')
const session = require('express-session');
const path = require('path')
const { v4: uuidv4 } = require('uuid');
const PORT = process.env.PORT || 5000

var app = express()
var ssn;

const fs = require('fs');


app.use(express.json());
app.use(session({secret:'XASDASDA'}));
app.use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.redirect('/index'))
  .get('/index', (req, res) => res.render('pages/index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

app.post('/init', (req, res, next) => {
	const game  = uuidv4();
	ssn = req.session; 

  let id = uuidv4();
  ssn.player = id;
  fs.readFile('game.json', 'utf8', function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);

    if(obj[game] == undefined)
      obj[game] = {};

    obj[game][id] = {}
    obj[game][id]['ready'] = false;

    fs.writeFile("./game.json", JSON.stringify(obj), function(err) {
      if(err) {
          return console.log(err);
      }
    }); 
  });
  res.send({game: game});
})

app.get('/play/:game', (req, res, next) => {
  const { game } = req.params;
  let gameExists = false;
  ssn = req.session;

  let obj;
  fs.readFile('game.json', 'utf8', function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);
    if(Object.keys(obj).includes(game)){
      gameExists = true;
    }

    if(gameExists && ssn.player){
      //Game exists and player has been given a unique id
      res.render('pages/index_multiplayer', { game: game, playerID: ssn.player});
    }else if(gameExists){
      //Another player joins the game, and has not been given a unique id
      if(Object.keys(obj[game]).length < 2){
        let id = uuidv4();
        ssn.player = id;
        obj[game][id] = {}
        obj[game][id] = {}
        obj[game][id]['ready'] = false;
        fs.writeFile("./game.json", JSON.stringify(obj), function(err) {
          if(err) {
              return console.log(err);
          }
          console.log("The file was saved!");
        }); 
        res.render('pages/index_multiplayer', { game: game, playerID: ssn.player});
      }else{
        //More than 2 players cannot play at once
        res.status(404).send('404: Page not Found');
      }
    }else{
      //Link to game does not exist
      res.status(404).send('404: Page not Found');
    }
  });
});

app.post('/start', function(req, res){
  let gameID = req.body['game'];
  let playerID = req.body['player'];
  let playerBoard = req.body['playerBoard'];
  let attackHistory = req.body['attackHistory'];

  fs.readFile('game.json', 'utf8', function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);
    obj[gameID][playerID]['ready'] = true;
    obj[gameID][playerID]['attackHistory'] = attackHistory;
    obj[gameID][playerID]['playerBoard'] = playerBoard;

    // console.log(obj[gameID]);
    fs.writeFile("./game.json", JSON.stringify(obj), function(err) {
      if(err) {
          return console.log(err);
      }
    }); 
  });
});

app.post('/requestAttack', function(req, res){
  let queries = req.query;
  let gameID = queries.game;
  let playerID = queries.player;
  let after = queries.after;
  fs.readFile('game.json', 'utf8', function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);

    if(obj[gameID]){
      let opponent = Object.fromEntries(Object.entries(obj[gameID]).filter(([k,v]) => k != playerID));
      opponentID = Object.keys(opponent)[0]
      if(opponentID){
        opponent = opponent[opponentID];
        if(opponent['ready']){
          attackHistory = opponent['attackHistory']
          if(attackHistory.length > 0){
            attackHistory = attackHistory.filter(([x, y, t, _]) => t > after)
            attack = attackHistory[0]
            res.send({attack: attack});
          }else
            res.send({attack: null});
        }else{
          res.send({attack: null});
        }
      }
    }
  });
})

// POST method route
app.post('/attack', function (req, res) {

  let gameID = req.body['game'];
  let playerID = req.body['player'];
  let attackHistory = req.body['attackHistory'];
  let attack = attackHistory.pop();
  fs.readFile('game.json', 'utf8', function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);
    if(obj[gameID]['lastAttack'] == undefined || obj[gameID]['lastAttack'] != playerID){
      obj[gameID]['lastAttack'] = playerID;

      let opponent = Object.fromEntries(Object.entries(obj[gameID]).filter(([k,v]) => k != playerID));
      opponentID = Object.keys(opponent)[0]
      if(opponentID){
        opponent = opponent[opponentID];
        hit = opponent['playerBoard'][attack[0]][attack[1]] > 0;

        attack.push(hit)
        attackHistory.push(attack);
        obj[gameID][playerID]['attackHistory'] = attackHistory;
        fs.writeFile("./game.json", JSON.stringify(obj), function(err) {
          if(err) {
              return console.log(err);
          }
        });
        res.send({hit: hit});
      }
    }else{
      res.send({hit: null});
    }
  });
})
