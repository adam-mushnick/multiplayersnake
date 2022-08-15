const BG_COLOR = '#231f20';
const SNAKE_COLOR = '#c2c2c2';
const FOOD_COLOR = '#e66916';

//can access because we are accessing socket library in html file
const socket = io('http://localhost:3000');

socket.on('connect_error', (err) => {
  console.log(`connect_error due to ${err.message}`);
});

//run fn when client receives input from server
socket.on('init', handleInit);
socket.on('gameState', handleGameState);
socket.on('gameOver', handleGameOver);
socket.on('gameCode', handleGameCode);
socket.on('unknownCode', handleUnknownCode);
socket.on('tooManyPlayers', handleTooManyPlayers);

const gameScreen = document.getElementById('gameScreen');
const initialScreen = document.getElementById('initialScreen');
const newGameBtn = document.getElementById('newGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const gameCodeInput = document.getElementById('gameCodeInput');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');

newGameBtn.addEventListener('click', newGame);
joinGameBtn.addEventListener('click', joinGame);

function newGame() {
  socket.emit('newGame');
  init();
}

function joinGame() {
  //grab entered game code
  const code = gameCodeInput.value;
  //emit joinGame event and send game code back to server
  socket.emit('joinGame', code);
  init();
}

let canvas, ctx;
let playerNumber;
let gameActive = false;

//initial game start function
function init() {
  //hide home screen and show game
  initialScreen.style.display = 'none';
  gameScreen.style.display = 'block';

  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');

  canvas.width = canvas.height = 600;

  ctx.fillStyle = BG_COLOR;
  //filling canvas with bg_color
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  document.addEventListener('keydown', keydown);
}
gameActive = true;

//event function accepts event 'e' as argument
function keydown(e) {
  0;
  socket.emit('keydown', e.keyCode);
}

function paintGame(state) {
  //paint canvas bg_color
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  //sets variables based on passed in game state
  const food = state.food;
  const gridsize = state.gridsize;
  const size = canvas.width / gridsize; //relating canvas size and grid size
  //how many pixels make up one square of game space

  //painting food
  ctx.fillStyle = FOOD_COLOR;
  ctx.fillRect(food.x * size, food.y * size, size, size);

  //call paint players fn
  paintPlayer(state.players[0], size, SNAKE_COLOR);
  paintPlayer(state.players[1], size, 'red');
}

function paintPlayer(playerState, size, color) {
  const snake = playerState.snake;

  //fill snake
  ctx.fillStyle = color;
  for (let cell of snake) {
    ctx.fillRect(cell.x * size, cell.y * size, size, size);
  }
}

function handleInit(number) {
  playerNumber = number;
  // console.log(playerNumber);
}

//every time server sends gameState message with the new gameState object
//browser will receive it and paint game with paintGame fn
function handleGameState(gameState) {
  if (!gameActive) {
    return;
  }
  //comes out as a string from server
  gameState = JSON.parse(gameState);
  //requestAnimationFrame expects a function
  requestAnimationFrame(() => paintGame(gameState));
}

//displays alert when player loses
function handleGameOver(data) {
  if (!gameActive) {
    return;
  }

  data = JSON.parse(data);

  gameActive = false;

  if (data.winner === playerNumber) {
    alert('You win!!!');
  } else {
    alert('You Lose!');
  }
}

function handleGameCode(gameCode) {
  gameCodeDisplay.innerText = gameCode;
}

function handleUnknownCode() {
  reset();
  alert('Unknown Game Code');
}

function handleTooManyPlayers() {
  reset();
  alert('This game is already in progress');
}

function reset() {
  playerNumber = null;
  gameCodeInput.value = '';
  initialScreen.style.display = 'block';
  gameScreen.style.display = 'none';
}
