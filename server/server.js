const http = require('http');
const server = http.createServer();
const { initGame, gameLoop, getUpdatedVelocity } = require('./game');
const { FRAME_RATE } = require('./constants');
const { makeid } = require('./utils');

const state = {};
const clientRooms = {};

const io = require('socket.io')(server, {
  //CORS configuration is required to allow certain requests
  cors: {
    //must allow sources or will get net err_connection_refused
    origin: ['http://localhost:3000', 'http://127.0.0.1:8080'],
    methods: ['GET', 'POST'],
    transports: ['websocket', 'polling'],
    credentials: true,
  },
  allowEIO3: true,
});

//calling io  gives us access to the io object
io.on('connection', (client) => {
  //creates client object
  //allows communication back to client that has connected

  console.log('a user connected');
  //listening for events emitted from the client
  client.on('keydown', handleKeyDown);
  client.on('newGame', handleNewGame);
  client.on('joinGame', handleJoinGame);

  function handleJoinGame(roomName) {
    const room = io.sockets.adapter.rooms[roomName];
    let allUsers;
    if (room) {
      //object is client, key is id for that user
      allUsers = room.sockets;
      console.log(allUsers);
    }
    let numClients = 0;
    if (allUsers) {
      numClients = Object.keys(allUsers).length;
    }
    if (numClients === 0) {
      //this is an unknown room with no one waiting
      client.emit('unknownCode');
      return;
    } else if (numClients > 1) {
      //too many players in room
      client.emit('tooManyPlayers');
      return;
    }
    clientRooms[client.id] = roomName;
    client.join(roomName);
    client.number = 2;
    client.emit('init', 2);

    startGameInterval(roomName);
  }

  function handleNewGame() {
    //use id generator to create room name
    let roomName = makeid(5);
    // console.log(roomName);
    clientRooms[client.id] = roomName;
    client.emit('gameCode', roomName);

    state[roomName] = initGame();

    client.join(roomName);
    client.number = 1;
    client.emit('init', 1);
  }

  function handleKeyDown(keyCode) {
    const roomName = clientRooms[client.id];

    if (!roomName) {
      return;
    }

    //parsing the keyCode int as a string
    try {
      keyCode = parseInt(keyCode);
    } catch (e) {
      console.error(e);
      return;
    }
    const vel = getUpdatedVelocity(keyCode);

    if (vel) {
      //-1 to correct from base 1 to index 0
      state[roomName].players[client.number - 1].vel = vel;
    }
  }
});

function startGameInterval(roomName) {
  const intervalId = setInterval(() => {
    const winner = gameLoop(state[roomName]);
    if (!winner) {
      emitGameState(roomName, state[roomName]);
    } else {
      emitGameOver(roomName, winner);
      //reset state of room because game has ended
      state[roomName] = null;
      clearInterval(intervalId);
    }
  }, 1000 / FRAME_RATE);
}

function emitGameState(room, gameState) {
  //emit to all clients in roomName
  io.sockets.in(room).emit('gameState', JSON.stringify(gameState));
}

function emitGameOver(room, winner) {
  io.sockets.in(room).emit('gameOver', JSON.stringify({ winner }));
}

io.listen(3000);
