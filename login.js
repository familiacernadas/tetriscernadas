// login.js — control de acceso Tetris Cernadas

document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('loginForm');
  const aliasInput = document.getElementById('alias');
  const passInput  = document.getElementById('password');

  // Si ya está logueado, entrar directo
  if (localStorage.getItem('loggedIn') === 'true') {
    showGame();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    checkLogin();
  });

  function checkLogin() {
    const alias = aliasInput.value.trim();
    const pass  = passInput.value;

    if (!alias || !pass) {
      alert('Introduce alias y contraseña');
      return;
    }

    const savedAlias = localStorage.getItem('alias');
    const savedPass  = localStorage.getItem('password');

    if (alias === savedAlias && pass === savedPass) {
      localStorage.setItem('loggedIn', 'true');
      showGame();
    } else {
      alert('Alias o contraseña incorrectos');
    }
  }

  function showGame() {
    const loginBox = document.getElementById('login');
    const gameBox  = document.getElementById('game');

    if (loginBox) loginBox.style.display = 'none';
    if (gameBox)  gameBox.style.display  = 'block';

    // Arranca el juego (definido en tetriscernadas.js)
    if (typeof startGame === 'function') {
      startGame();
    } else {
      console.warn('⚠ startGame() no existe todavía');
    }
  }

});

