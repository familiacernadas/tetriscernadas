// Variables globales
let playerAlias = "";
let score = 0;
let formedCernadas = false;

// Elementos del DOM
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const playerNameEl = document.getElementById("player-name");
const achievement = document.getElementById("achievement");
const rankingDiv = document.getElementById("ranking");
const gameDiv = document.getElementById("game");

// Login / Registro con Firebase
loginBtn.onclick = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if(!email || !password){ alert("Introduce correo y contraseña"); return; }
  try{
    await auth.signInWithEmailAndPassword(email, password);
  }catch(e){
    await auth.createUserWithEmailAndPassword(email, password);
  }
  playerAlias = auth.currentUser.uid;
  playerNameEl.textContent = playerAlias;
  gameDiv.classList.remove("hidden");
  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");
  startGame(playerAlias);
};

logoutBtn.onclick = async () => {
  await auth.signOut();
  location.reload();
};

// Guardar score online
async function saveOnlineScore(userId, score, star){
  const ref = db.ref('tetris_ranking/' + userId);
  const snapshot = await ref.get();
  const best = snapshot.val() || { bestScore:0, star:false };
  const newBest = { bestScore: Math.max(score,best.bestScore), star: best.star || star };
  await ref.set(newBest);
}

// Guardar partida (historial)
async function saveGame(userId, score){
  const ref = db.ref('tetris_games/' + userId);
  const newGameRef = ref.push();
  await newGameRef.set({ score, date:Date.now(), formedCernadas });
}

// Mostrar ranking global
async function showGlobalRanking(){
  const snapshot = await db.ref('tetris_ranking').orderByChild('bestScore').limitToLast(10).get();
  const list = [];
  snapshot.forEach(s=>list.push({ userId:s.key, ...s.val() }));
  list.reverse();
  rankingDiv.innerHTML = list.map((u,i)=>`<p>${i+1}. ${u.userId} – ${u.bestScore} pts ${u.star?"⭐":""}</p>`).join("");
}

// Función placeholder para iniciar juego
function startGame(alias){
  console.log("Juego iniciado para:", alias);
  // Aquí se integraría el motor Tetris completo
  // Se pueden añadir canvas, controles, y detección de "CERNADAS"
}
