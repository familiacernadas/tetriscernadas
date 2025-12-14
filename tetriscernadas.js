// tetriscernadas.js
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, push, get, child, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ---------------------------
// VARIABLES GLOBALES
// ---------------------------
let playerAlias = "";
let score = 0;
let formedCernadas = false;

// DOM
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const playerNameEl = document.getElementById("player-name");
const achievement = document.getElementById("achievement");
const rankingDiv = document.getElementById("ranking");
const gameDiv = document.getElementById("game");
const canvas = document.getElementById("playfield");
const ctx = canvas.getContext("2d");

// Configuración canvas
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// Tablero
let board = Array.from({length: ROWS}, () => Array(COLS).fill(''));

// Letras para las piezas (Apellido CERNADAS)
const LETTERS = ['C','E','R','N','A','D','A','S'];

// Colores por letra
const COLORS = {
  'C':'#FF4C4C','E':'#FFB84C','R':'#FFE74C','N':'#4CFF4C',
  'A':'#4CFFFF','D':'#4C4CFF','S':'#B84CFF'
};

// Tetrominos clásicos
const TETROMINOS = {
  I:[[1,1,1,1]], J:[[0,1],[0,1],[1,1]], L:[[1,0],[1,0],[1,1]],
  O:[[1,1],[1,1]], S:[[0,1,1],[1,1,0]], T:[[0,1,0],[1,1,1]], Z:[[1,1,0],[0,1,1]]
};

// ---------------------------
// FIREBASE
// ---------------------------
const auth = getAuth();
const db = getDatabase();

// LOGIN / REGISTRO
loginBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if(!email || !password){ alert("Introduce correo y contraseña"); return; }
  try{
    await signInWithEmailAndPassword(auth,email,password);
  }catch(e){
    await createUserWithEmailAndPassword(auth,email,password);
  }
  playerAlias = auth.currentUser.uid;
  playerNameEl.textContent = playerAlias;
  gameDiv.classList.remove("hidden");
  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");
  startGame(playerAlias);
};

logoutBtn.onclick = async () => {
  await signOut(auth);
  location.reload();
};

// ---------------------------
// FUNCIONES FIREBASE
// ---------------------------
async function saveOnlineScore(userId, score, star){
  const refScore = ref(db, 'tetris_ranking/' + userId);
  const snapshot = await get(refScore);
  const best = snapshot.val() || { bestScore:0, star:false };
  const newBest = { bestScore: Math.max(score,best.bestScore), star: best.star || star };
  await set(refScore, newBest);
}

async function saveGame(userId, score){
  const refGames = ref(db, 'tetris_games/' + userId);
  const newGameRef = push(refGames);
  await set(newGameRef, { score, date:Date.now(), formedCernadas });
}

async function showGlobalRanking(){
  const snapshot = await get(ref(db, 'tetris_ranking'));
  if(!snapshot.exists()) return;
  const list = [];
  snapshot.forEach(s => list.push({ userId:s.key, ...s.val() }));
  list.sort((a,b)=>b.bestScore-a.bestScore);
  rankingDiv.innerHTML = list.map((u,i)=>`<p>${i+1}. ${u.userId} – ${u.bestScore} pts ${u.star?"⭐":""}</p>`).join("");
}

// ---------------------------
// UTILIDADES TETRIS
// ---------------------------
function drawBlock(x,y,letter){
  ctx.fillStyle = COLORS[letter] || '#888';
  ctx.fillRect(x*BLOCK_SIZE, y*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  ctx.strokeStyle = '#000';
  ctx.strokeRect(x*BLOCK_SIZE, y*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  ctx.fillStyle = '#000';
  ctx.font = '20px Arial';
  ctx.fillText(letter, x*BLOCK_SIZE + 8, y*BLOCK_SIZE + 22);
}

// ---------------------------
// PIEZA ACTUAL
// ---------------------------
let currentPiece = null;
let currentX = 0;
let currentY = 0;

function newPiece(){
  const keys = Object.keys(TETROMINOS);
  const type = keys[Math.floor(Math.random()*keys.length)];
  const shape = TETROMINOS[type];
  const letters = [];
  for(let i=0;i<shape.flat().filter(x=>x).length;i++){
    letters.push(LETTERS[Math.floor(Math.random()*LETTERS.length)]);
  }
  currentPiece = {type, shape, letters};
  currentX = Math.floor(COLS/2 - shape[0].length/2);
  currentY = 0;
}

// ---------------------------
// COLISION
// ---------------------------
function collide(board, piece, x, y){
  for(let r=0;r<piece.shape.length;r++){
    for(let c=0;c<piece.shape[r].length;c++){
      if(piece.shape[r][c]){
        if(board[y+r] && board[y+r][x+c] !== undefined){
          if(board[y+r][x+c]!=='') return true;
        }else return true;
      }
    }
  }
  return false;
}

// ---------------------------
// PINTAR TABLERO
// ---------------------------
function drawBoard(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(board[r][c]!=='') drawBlock(c,r,board[r][c]);
    }
  }
  if(currentPiece){
    let lIndex=0;
    for(let r=0;r<currentPiece.shape.length;r++){
      for(let c=0;c<currentPiece.shape[r].length;c++){
        if(currentPiece.shape[r][c]){
          drawBlock(currentX+c,currentY+r,currentPiece.letters[lIndex]);
          lIndex++;
        }
      }
    }
  }
}

// ---------------------------
// MOVER PIEZA
// ---------------------------
function movePiece(dx){ if(!collide(board,currentPiece,currentX+dx,currentY)) currentX+=dx; }
function dropPiece(){ if(!collide(board,currentPiece,currentX,currentY+1)){ currentY++; } else { placePiece(); newPiece(); } }
function hardDrop(){ while(!collide(board,currentPiece,currentX,currentY+1)) currentY++; placePiece(); newPiece(); }

// ---------------------------
// COLOCAR PIEZA
// ---------------------------
function placePiece(){
  let lIndex=0;
  for(let r=0;r<currentPiece.shape.length;r++){
    for(let c=0;c<currentPiece.shape[r].length;c++){
      if(currentPiece.shape[r][c]){
        if(currentY+r>=0 && currentY+r<ROWS && currentX+c>=0 && currentX+c<COLS){
          board[currentY+r][currentX+c] = currentPiece.letters[lIndex];
        }
        lIndex++;
      }
    }
  }
  clearLines();
}

// ---------------------------
// LIMPIAR FILAS
// ---------------------------
function clearLines(){
  let linesCleared=0;
  for(let r=ROWS-1;r>=0;r--){
    if(board[r].every(cell=>cell!=='')){
      board.splice(r,1);
      board.unshift(Array(COLS).fill(''));
      linesCleared++;
      r++;
    }
  }
  score += linesCleared*10;
  document.getElementById("score").textContent = score;
  checkCernadas();
}

// ---------------------------
// DETECTAR "CERNADAS"
function checkCernadas(){
  const word = "CERNADAS";
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<=COLS-word.length;c++){
      if(board[r].slice(c,c+word.length).join('')===word){
        formedCernadas=true;
        achievement.textContent = "⭐ Has formado CERNADAS!";
        saveOnlineScore(playerAlias,score,true);
      }
    }
  }
}

// ---------------------------
// ROTAR PIEZA
// ---------------------------
function rotatePiece(){
  const temp = currentPiece.shape.map((_,i)=>currentPiece.shape.map(row=>row[i]).reverse());
  if(!collide(board,{...currentPiece, shape: temp},currentX,currentY)){
    currentPiece.shape = temp;
  }
}

// ---------------------------
// TECLADO
// ---------------------------
document.addEventListener("keydown", e=>{
  if(!currentPiece) return;
  switch(e.key){
    case "ArrowLeft": movePiece(-1); break;
    case "ArrowRight": movePiece(1); break;
    case "ArrowDown": dropPiece(); break;
    case "ArrowUp": rotatePiece(); break;
    case " ": hardDrop(); break;
  }
});

// ---------------------------
// CONTROLES TÁCTILES
// ---------------------------
document.querySelectorAll("#touch-controls button").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    if(!currentPiece) return;
    const act = btn.dataset.act;
    if(act==="left") movePiece(-1);
    else if(act==="right") movePiece(1);
    else if(act==="down") dropPiece();
    else if(act==="rotate") rotatePiece();
    else if(act==="drop") hardDrop();
  });
});

// ---------------------------
// BUCLE DEL JUEGO
// ---------------------------
let dropCounter=0;
let dropInterval=500;
let lastTime=0;

function update(time=0){
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  if(dropCounter > dropInterval){ dropPiece(); dropCounter=0; }
  drawBoard();
  requestAnimationFrame(update);
}

// ---------------------------
// INICIAR JUEGO
// ---------------------------
function startGame(alias){
  playerAlias = alias;
  board = Array.from({length: ROWS}, () => Array(COLS).fill(''));
  score = 0;
  formedCernadas = false;
  newPiece();
  update();
  showGlobalRanking();
}
