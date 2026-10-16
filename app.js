(() => {
  "use strict";

  const TARGET_SCORE = 20;
  const LIFE_COUNT = 1;
  const EMOJI_SIZE = 48;
  const BASKET_WIDTH = 106;
  const BASKET_HEIGHT = 74;
  const BASKET_BOTTOM = 7;
  const SPAWN_INTERVAL = 1.22;
  const OTHER_EMOJIS = ["🎂", "🎁", "🎈", "🍓", "💖", "🌸", "⭐", "🍭", "🦄"];

  const HAPPY_MESSAGE = "Дано ти е харесало, Мелс! Иначе по същество да си дойдем на думата. Честита двайска, вече и ти остаря😂! Пожелвам ти на първо място много здраве, понеже без него другите неща губят смисъл! После ти пожелавам късмет, щастие и много успехи за напред! Двайската вече си звучи сериозно и то не само че звучи, а е и сериозна възраст! От година на година задачите и отговорностите ще стават все повече и ти пожелавам да имаш силите да се справяш с тях, упорита си и знам че ще се справиш, но все пак, ако ти стане трудно винаги можеш да се обадиш за такси 😉, а и не само!";
  const INTRO_MESSAGE = "Така, след като установихме, че рожденичка все пак има, ще трябва да тестваме някой неща, за да видим дали си готова за живота от 20 нататък! В следната игра ще проверим реакциите, координацията и концетрацията. Хващай само 🐵!\n\nЗабавлявай се!";

  const pages = {
    home: document.getElementById("home-screen"),
    no: document.getElementById("no-screen"),
    game: document.getElementById("game-screen")
  };
  const arena = document.getElementById("arena");
  const basket = document.getElementById("basket");
  const overlay = document.getElementById("message-overlay");
  const overlayScroll = document.getElementById("message-scroll");
  const messageTitle = document.getElementById("message-title");
  const messageText = document.getElementById("message-text");
  const scoreLabel = document.getElementById("score");
  const livesLabel = document.getElementById("lives");
  const startButton = document.getElementById("start-btn");

  let currentPage = "home";
  let playing = false;
  let score = 0;
  let lives = LIFE_COUNT;
  let basketX = 0;
  let basketReady = false;
  let spawnedAt = 0;
  let lastFrame = 0;
  let animationId = 0;
  let falling = [];
  let movingPointer = null;

  function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
  function fieldWidth() { return arena.clientWidth; }
  function fieldHeight() { return arena.clientHeight; }
  function basketY() { return fieldHeight() - BASKET_HEIGHT - BASKET_BOTTOM; }

  function resetGameUi() {
    score = 0;
    lives = LIFE_COUNT;
    updateScoreboard();
    messageTitle.textContent = "ГОТОВА ЛИ СИ? 🎀";
    messageText.textContent = INTRO_MESSAGE;
    messageText.hidden = false;
    overlay.hidden = false;
    overlayScroll.scrollTop = 0;
    startButton.textContent = "СТАРТ 💗";
    basketReady = false;
    requestAnimationFrame(placeBasket);
  }

  function switchPage(page, addHistory = true) {
    if (!(page in pages)) page = "home";
    stopGame();
    currentPage = page;

    Object.entries(pages).forEach(([name, element]) => {
      const show = name === page;
      element.hidden = !show;
      element.classList.toggle("screen--active", show);
    });

    if (addHistory && (location.protocol === "https:" || location.protocol === "http:")) {
      const url = page === "home" ? location.pathname + location.search : "#" + page;
      history.pushState({ page }, "", url);
    }
    if (page === "game") resetGameUi();
    window.scrollTo(0, 0);
  }

  function goHome() { switchPage("home"); }

  document.getElementById("yes-btn").addEventListener("click", () => switchPage("game"));
  document.getElementById("no-btn").addEventListener("click", () => switchPage("no"));
  document.getElementById("no-back").addEventListener("click", goHome);
  document.getElementById("game-back").addEventListener("click", goHome);

  window.addEventListener("popstate", (event) => {
    const page = event.state?.page || (location.hash === "#no" ? "no" : location.hash === "#game" ? "game" : "home");
    switchPage(page, false);
  });

  function updateScoreboard() {
    scoreLabel.textContent = `🐵  ${score} / ${TARGET_SCORE}`;
    livesLabel.textContent = `💗  ${lives}`;
  }

  function placeBasket() {
    if (!fieldWidth() || !fieldHeight()) return;
    if (!basketReady) {
      basketX = Math.max(0, (fieldWidth() - BASKET_WIDTH) / 2);
      basketReady = true;
    }
    basketX = clamp(basketX, 0, Math.max(0, fieldWidth() - BASKET_WIDTH));
    basket.style.transform = `translate3d(${basketX}px, ${basketY()}px, 0)`;
  }

  function setBasketByPointer(clientX) {
    const rect = arena.getBoundingClientRect();
    basketX = clamp(clientX - rect.left - BASKET_WIDTH / 2, 0, Math.max(0, fieldWidth() - BASKET_WIDTH));
    placeBasket();
  }

  arena.addEventListener("pointerdown", (event) => {
    if (!playing) return;
    movingPointer = event.pointerId;
    if (arena.setPointerCapture) arena.setPointerCapture(event.pointerId);
    setBasketByPointer(event.clientX);
    event.preventDefault();
  });
  arena.addEventListener("pointermove", (event) => {
    if (!playing || movingPointer !== event.pointerId) return;
    setBasketByPointer(event.clientX);
    event.preventDefault();
  });
  function releasePointer(event) {
    if (movingPointer !== event.pointerId) return;
    movingPointer = null;
  }
  arena.addEventListener("pointerup", releasePointer);
  arena.addEventListener("pointercancel", releasePointer);
  arena.addEventListener("lostpointercapture", releasePointer);

  document.addEventListener("keydown", (event) => {
    if (!playing || currentPage !== "game") return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      basketX += event.key === "ArrowLeft" ? -30 : 30;
      placeBasket();
    }
  });
  window.addEventListener("resize", placeBasket);

  function clearFalling() {
    for (const item of falling) item.element.remove();
    falling = [];
  }
  function stopGame() {
    playing = false;
    movingPointer = null;
    cancelAnimationFrame(animationId);
    animationId = 0;
    clearFalling();
  }

  function startGame() {
    if (currentPage !== "game" || fieldWidth() <= 0 || fieldHeight() <= 0) return;
    stopGame();
    score = 0;
    lives = LIFE_COUNT;
    updateScoreboard();
    basketReady = false;
    placeBasket();
    overlay.hidden = true;
    startButton.textContent = "ЗАПОЧНИ ОТНАЧАЛО ↻";
    spawnedAt = 0;
    lastFrame = 0;
    playing = true;
    animationId = requestAnimationFrame(tick);
  }
  startButton.addEventListener("click", startGame);

  function spawnEmoji() {
    const isMonkey = Math.random() < 0.55;
    const character = isMonkey ? "🐵" : OTHER_EMOJIS[Math.floor(Math.random() * OTHER_EMOJIS.length)];
    const element = document.createElement("span");
    element.className = "falling-emoji";
    element.textContent = character;
    element.setAttribute("aria-hidden", "true");
    const item = {
      element,
      isMonkey,
      x: Math.random() * Math.max(0, fieldWidth() - EMOJI_SIZE),
      y: -EMOJI_SIZE,
      speed: 92 + Math.random() * 38
    };
    element.style.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
    falling.push(item);
    arena.appendChild(element);
  }

  function finishGame(won) {
    if (!playing) return;
    stopGame();
    if (won) {
      messageTitle.textContent = "БРАВО, ПАТАТНИК! 🎉";
      messageText.textContent = HAPPY_MESSAGE;
      messageText.hidden = false;
      startButton.textContent = "ИГРАЙ ПАК 💗";
    } else {
      lives = 0;
      updateScoreboard();
      messageTitle.textContent = "ОПИТАЙ ПАК!";
      messageText.textContent = "";
      messageText.hidden = true;
      startButton.textContent = "ОПИТАЙ ПАК ↻";
    }
    overlay.hidden = false;
    overlayScroll.scrollTop = 0;
  }

  function tick(timeStamp) {
    if (!playing) return;
    const dt = lastFrame ? Math.min((timeStamp - lastFrame) / 1000, 0.06) : 0;
    lastFrame = timeStamp;
    spawnedAt += dt;
    if (spawnedAt >= SPAWN_INTERVAL) {
      spawnedAt -= SPAWN_INTERVAL;
      spawnEmoji();
    }

    const yCatch = basketY() + BASKET_HEIGHT - 9;
    for (let i = falling.length - 1; i >= 0; i--) {
      const item = falling[i];
      const oldBottom = item.y + EMOJI_SIZE;
      item.y += item.speed * dt;
      const bottom = item.y + EMOJI_SIZE;
      const centerX = item.x + EMOJI_SIZE / 2;
      // Catch when the emoji reaches the *bottom* of the open, three-line basket.
      const crossedBasketBase = oldBottom <= yCatch && bottom >= yCatch;
      const insideBasket = centerX > basketX + 8 && centerX < basketX + BASKET_WIDTH - 8;

      if (crossedBasketBase && insideBasket) {
        item.element.remove();
        falling.splice(i, 1);
        if (item.isMonkey) {
          score++;
          updateScoreboard();
          if (score >= TARGET_SCORE) {
            finishGame(true);
            return;
          }
        } else {
          finishGame(false);
          return;
        }
      } else if (item.y > fieldHeight()) {
        item.element.remove();
        falling.splice(i, 1);
        if (item.isMonkey) {
          finishGame(false);
          return;
        }
      } else {
        item.element.style.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
      }
    }
    animationId = requestAnimationFrame(tick);
  }

  const hashPage = location.hash.replace("#", "");
  const firstPage = hashPage in pages ? hashPage : "home";
  if (location.protocol === "https:" || location.protocol === "http:") {
    history.replaceState({ page: firstPage }, "", location.href);
  }
  switchPage(firstPage, false);

  // Small visual loading screen matches the original MAUI splash.
  window.addEventListener("load", () => {
    window.setTimeout(() => document.getElementById("loading-screen").classList.add("is-done"), 350);
  });

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
  }
})();
