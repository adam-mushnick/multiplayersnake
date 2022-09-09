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
  client.on('rematch', handleRematch);
  client.on('leaveRoom', handleLeaveRoom);

  async function handleJoinGame(roomName) {
    //grabs room associated with code
    const room = io.sockets.adapter.rooms.get(roomName);

    if (room) {
      //grab number of clients connected(should be 1)
      numClients = room.size;
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
    //sends gamecode to player gamecode display
    client.emit('gameCode', roomName);

    startGameInterval(roomName);
  }

  function handleRematch() {}

  function handleLeaveRoom() {
    // const room = io.sockets.adapter.rooms.get(roomName);
    //reset state of room because game has ended
    // state[roomName] = null;
    // clearInterval(intervalId);
    // console.log('game over');
    // client.emit('leaveRoom');
  }

  function handleNewGame() {
    //use id generator to create room name
    let roomName = makeid(5);
    clientRooms[client.id] = roomName;
    //client function shows gamecode on screen
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
  const room = io.sockets.adapter.rooms.get(roomName);

  const intervalId = setInterval(() => {
    const winner = gameLoop(state[roomName]);
    if (!winner) {
      emitGameState(roomName, state[roomName]);
    } else {
      emitGameOver(roomName, winner);
      //reset state of room because game has ended
      state[roomName] = null;
      clearInterval(intervalId);
      console.log('game over');
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
