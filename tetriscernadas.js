// ==================================================
// TETRIS CERNADAS – JS ESTABLE (MEJOR SCORE)
// ==================================================

// ---------------------------
// VARIABLES GLOBALES
// ---------------------------
let playerAlias = "";
let score = 0;
let formedCernadas = false;
let gameActive = false;
let animationId = null;

// ---------------------------
// DOM
// ---------------------------
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const finishBtn = document.getElementById("finish-btn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const playerNameEl = document.getElementById("player-name");
const achievement = document.getElementById("achievement");
const rankingList = document.getElementById("ranking-list");
const gameDiv = document.getElementById("game");
const canvas = document.getElementById("playfield");
const ctx = canvas.getContext("2d");

// ---------------------------
// CANVAS
// ---------------------------
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;

// ---------------------------
// TABLERO
// ---------------------------
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(""));

// ---------------------------
// PIEZAS
// ---------------------------
const LETTERS = ["C", "E", "R", "N", "A", "D", "A", "S"];
const COLORS = {
  C: "#FF4C4C", E: "#FFB84C", R: "#FFE74C",
  N: "#4CFF4C", A: "#4CFFFF",
  D: "#4C4CFF", S: "#B84CFF"
};

const TETROMINOS = {
  I: [[1,1,1,1]],
  J: [[0,1],[0,1],[1,1]],
  L: [[1,0],[1,0],[1,1]],
  O: [[1,1],[1,1]],
  S: [[0,1,1],[1,1,0]],
  T: [[0,1,0],[1,1,1]],
  Z: [[1,1,0],[0,1,1]]
};

// ---------------------------
// LOGIN / REGISTRO
// ---------------------------
loginBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const pass = passwordInput.value.trim();
  if (!email || !pass) return alert("Completa email y contraseña");

  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch {
    await auth.createUserWithEmailAndPassword(email, pass);
  }

  playerAlias = auth.currentUser.uid;
  playerNameEl.textContent = "Jugador";
  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");
  gameDiv.classList.remove("hidden");

  startGame();
};

logoutBtn.onclick = async () => {
  await auth.signOut();
  location.reload();
};

// ---------------------------
// FIREBASE – MEJOR SCORE
// ---------------------------
async function saveBestScore(uid, score, star) {
  const ref = db.ref("ranking/" + uid);
  const snap = await ref.get();
  const prev = snap.val();

  if (!prev || score > prev.score) {
    await ref.set({
      score,
      star: prev?.star || star,
      updated: Date.now()
    });
  }
}

async function loadRanking() {
  rankingList.innerHTML = "<p>Cargando...</p>";

  const snap = await db.ref("ranking")
    .orderByChild("score")
    .limitToLast(10)
    .get();

  const data = [];
  snap.forEach(s => data.push(s.val()));
  data.reverse();

  rankingList.innerHTML = data.length
    ? data.map((u,i)=>`<p>${i+1}. ${u.score} pts ${u.star?"⭐":""}</p>`).join("")
    : "<p>No hay puntuaciones</p>";
}

// ---------------------------
// GAME OVER
// ---------------------------
async function gameOver() {
  if (!gameActive) return;
  gameActive = false;
  cancelAnimationFrame(animationId);

  if (playerAlias && score > 0) {
    await saveBestScore(playerAlias, score, formedCernadas);
    loadRanking();
  }
}

// ---------------------------
// DIBUJO
// ---------------------------
function drawBlock(x,y,l){
  ctx.fillStyle = COLORS[l];
  ctx.fillRect(x*BLOCK, y*BLOCK, BLOCK, BLOCK);
  ctx.strokeRect(x*BLOCK, y*BLOCK, BLOCK, BLOCK);
  ctx.fillStyle = "#000";
  ctx.font = "18px Arial";
  ctx.fillText(l, x*BLOCK+8, y*BLOCK+22);
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  board.forEach((r,y)=>r.forEach((c,x)=>c && drawBlock(x,y,c)));
  if (!current) return;
  let i=0;
  current.shape.forEach((r,y)=>
    r.forEach((c,x)=>c && drawBlock(px+x, py+y, current.letters[i++])));
}

// ---------------------------
// PIEZA ACTUAL
// ---------------------------
let current=null, px=0, py=0;

function newPiece(){
  const shape = Object.values(TETROMINOS)[Math.floor(Math.random()*7)];
  const letters = shape.flat().filter(Boolean)
    .map(()=>LETTERS[Math.floor(Math.random()*LETTERS.length)]);
  current = { shape, letters };
  px = Math.floor(COLS/2 - shape[0].length/2);
  py = 0;
  if (collide(px,py)) gameOver();
}

function collide(x,y){
  return current.shape.some((r,ry)=>
    r.some((c,rx)=>{
      if(!c) return false;
      const nx=x+rx, ny=y+ry;
      return nx<0 || nx>=COLS || ny>=ROWS || board[ny]?.[nx];
    })
  );
}

// ---------------------------
// MOVIMIENTO
// ---------------------------
function move(dx){ if(!collide(px+dx,py)) px+=dx; }
function drop(){
  if(!collide(px,py+1)) py++;
  else lock();
}

function lock(){
  let i=0;
  current.shape.forEach((r,y)=>
    r.forEach((c,x)=>c && (board[py+y][px+x]=current.letters[i++])));
  clearLines();
  newPiece();
}

function rotate(){
  const p=current.shape;
  const r=p[0].map((_,i)=>p.map(row=>row[i]).reverse());
  current.shape=r;
  if(collide(px,py)) current.shape=p;
}

// ---------------------------
// LINEAS
// ---------------------------
function clearLines(){
  for(let y=ROWS-1;y>=0;y--){
    if(board[y].every(c=>c)){
      board.splice(y,1);
      board.unshift(Array(COLS).fill(""));
      score+=10;
      document.getElementById("score").textContent=score;
      y++;
    }
  }
  checkCernadas();
}

// ---------------------------
// CERNADAS
// ---------------------------
function checkCernadas(){
  const w="CERNADAS";
  board.forEach(r=>{
    for(let i=0;i<=COLS-w.length;i++){
      if(r.slice(i,i+w.length).join("")===w){
        formedCernadas=true;
        achievement.textContent="⭐ Has formado CERNADAS!";
      }
    }
  });
}

// ---------------------------
// LOOP
// ---------------------------
let last=0,timer=0;
function update(t=0){
  if(!gameActive) return;
  timer+=t-last; last=t;
  if(timer>600){ drop(); timer=0; }
  draw();
  animationId=requestAnimationFrame(update);
}

// ---------------------------
// START
// ---------------------------
function startGame(){
  board=Array.from({length:ROWS},()=>Array(COLS).fill(""));
  score=0;
  formedCernadas=false;
  gameActive=true;
  document.getElementById("score").textContent="0";
  achievement.textContent="";
  newPiece();
  loadRanking();
  animationId=requestAnimationFrame(update);
}

// ---------------------------
// CONTROLES
// ---------------------------
document.addEventListener("keydown",e=>{
  if(!gameActive) return;
  if(e.key==="ArrowLeft") move(-1);
  if(e.key==="ArrowRight") move(1);
  if(e.key==="ArrowDown") drop();
  if(e.key==="ArrowUp") rotate();
  if(e.key===" ") while(!collide(px,py+1)) py++;
});

// ---------------------------
finishBtn.onclick = gameOver;
