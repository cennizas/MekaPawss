/* =====================================================================
   MekaPaws — script.js (JavaScript vanilla, sin dependencias)
   1. Utilidades de almacenamiento
   2. Idioma ES/EN (data-es / data-en) con localStorage
   3. Modo claro/oscuro con localStorage y preferencia del sistema
   4. Menú hamburguesa
   5. Resaltado de sección activa (IntersectionObserver)
   6. Animaciones de aparición (respeta prefers-reduced-motion)
   7. Mapa, formulario y modelo 3D: se cargan solo si la persona los pide
   8. Minijuego con hoja de sprites
   9. Chatbot de orientación local con aspecto de gato
   ===================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  /* ---------- 1. Utilidades de almacenamiento (localStorage puede fallar) ---------- */
  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* modo privado: se ignora */ }
  }
  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 2. Idioma ES/EN ---------- */
  var LANG_KEY = 'mekapaws-lang';
  var currentLang = 'es'; // español por defecto

  // Textos que se generan desde JS (los del HTML usan data-es / data-en)
  var UI = {
    es: { menuOpen: 'Abrir menú', menuClose: 'Cerrar menú', langBtn: 'EN' },
    en: { menuOpen: 'Open menu', menuClose: 'Close menu', langBtn: 'ES' }
  };

  // Atributos traducibles: data-es-alt / data-en-alt, data-es-aria-label, etc.
  var attrTargets = []; // [{el, attr}]
  var textTargets = []; // elementos con data-es y data-en (texto)

  function collectTargets() {
    var all = doc.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.hasAttribute('data-es') && el.hasAttribute('data-en')) textTargets.push(el);
      var attrs = el.attributes;
      for (var j = 0; j < attrs.length; j++) {
        var m = /^data-es-(.+)$/.exec(attrs[j].name);
        if (m && el.hasAttribute('data-en-' + m[1])) attrTargets.push({ el: el, attr: m[1] });
      }
    }
  }

  function applyLang(lang) {
    currentLang = lang === 'en' ? 'en' : 'es';
    root.setAttribute('lang', currentLang);

    textTargets.forEach(function (el) {
      var value = el.getAttribute('data-' + currentLang);
      if (el.tagName === 'TITLE') { doc.title = value; return; }
      el.textContent = value;
    });
    attrTargets.forEach(function (t) {
      t.el.setAttribute(t.attr, t.el.getAttribute('data-' + currentLang + '-' + t.attr));
    });

    var langLabel = doc.getElementById('lang-label');
    if (langLabel) langLabel.textContent = UI[currentLang].langBtn;
    syncMenuLabel();
    window.dispatchEvent(new Event('mekapaws:languagechange'));
  }

  function initLang() {
    collectTargets();
    var saved = read(LANG_KEY);
    applyLang(saved === 'en' ? 'en' : 'es');
    var btn = doc.getElementById('lang-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var next = currentLang === 'es' ? 'en' : 'es';
        applyLang(next);
        store(LANG_KEY, next);
      });
    }
  }

  /* ---------- 3. Modo claro / oscuro ---------- */
  var THEME_KEY = 'mekapaws-theme';
  var themeBtn = doc.getElementById('theme-toggle');
  var themeMeta = doc.querySelector('meta[name="theme-color"]');

  function setTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (themeBtn) themeBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#2B1F18' : '#3E2C23');
    if (persist) store(THEME_KEY, theme);
  }

  function initTheme() {
    // El <head> ya aplicó el tema guardado o la preferencia del sistema; aquí solo sincronizamos el botón
    setTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
      });
    }
    // Si la persona nunca eligió, seguimos los cambios del sistema
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function (e) { if (!read(THEME_KEY)) setTheme(e.matches ? 'dark' : 'light', false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
  }

  /* ---------- 4. Menú hamburguesa ---------- */
  var menuBtn = doc.getElementById('menu-toggle');
  var nav = doc.getElementById('site-nav');
  var DESKTOP_NAV = window.matchMedia('(min-width: 1360px)');

  function syncMenuLabel() {
    if (!menuBtn) return;
    var open = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-label', open ? UI[currentLang].menuClose : UI[currentLang].menuOpen);
  }

  function setMenu(open, returnFocus) {
    if (!menuBtn || !nav) return;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('open', open);
    syncMenuLabel();
    if (!open && returnFocus) menuBtn.focus();
  }

  function initMenu() {
    if (!menuBtn || !nav) return;
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    // Cerrar al elegir un enlace
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    // Cerrar con Escape (devuelve el foco al botón)
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) setMenu(false, true);
    });
    // Cerrar al hacer clic fuera
    doc.addEventListener('click', function (e) {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
    });
    // Al pasar a escritorio, restablecer
    var onResize = function () { if (DESKTOP_NAV.matches) setMenu(false); };
    if (DESKTOP_NAV.addEventListener) DESKTOP_NAV.addEventListener('change', onResize);
  }

  /* ---------- 5. Navegación por paneles temáticos ---------- */
  function initPanelNavigation() {
    var sections = Array.prototype.slice.call(doc.querySelectorAll('main section[id]'));
    var links = Array.prototype.slice.call(doc.querySelectorAll('.site-nav a[data-nav]'));
    if (!sections.length || !links.length) return;

    function getGroup(section) {
      return section.getAttribute('data-nav') || section.id;
    }

    function activate(group) {
      links.forEach(function (link) {
        var active = link.getAttribute('data-nav') === group;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    }

    function showPanel(group, targetId, addHistory, moveFocus) {
      var target = targetId ? doc.getElementById(targetId) : null;
      var targetSection = target ? target.closest('main section[id]') : null;
      if (targetSection) group = getGroup(targetSection);
      if (!links.some(function (link) { return link.getAttribute('data-nav') === group; })) group = 'inicio';

      sections.forEach(function (section) {
        section.hidden = getGroup(section) !== group;
      });
      activate(group);

      var visibleTarget = targetSection && !targetSection.hidden
        ? targetSection
        : sections.find(function (section) { return !section.hidden; });

      if (addHistory && visibleTarget) {
        window.history.pushState({ mekapawsPanel: group }, '', '#' + (target && target.id ? target.id : visibleTarget.id));
      }
      if (moveFocus && visibleTarget) {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        var heading = target && target.matches('h1, h2, h3') ? target : visibleTarget.querySelector('h1, h2');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
      }
      window.dispatchEvent(new Event('mekapaws:panelchange'));
    }

    doc.addEventListener('click', function (event) {
      var link = event.target.closest('a[href^="#"]');
      if (!link || link.getAttribute('href') === '#contenido') return;
      var id = link.getAttribute('href').slice(1);
      var target = doc.getElementById(id);
      if (!target || !target.closest('main section[id]')) return;
      event.preventDefault();
      showPanel(getGroup(target.closest('main section[id]')), id, true, true);
      if (nav && nav.contains(link)) setMenu(false);
    });

    function restoreFromLocation() {
      var id = window.location.hash.slice(1);
      var target = id ? doc.getElementById(id) : null;
      if (target && target.closest('main section[id]')) {
        showPanel(getGroup(target.closest('main section[id]')), id, false, true);
      } else if (!id) showPanel('inicio', 'inicio', false, true);
    }
    window.addEventListener('popstate', restoreFromLocation);
    window.addEventListener('hashchange', restoreFromLocation);

    var initialId = window.location.hash.slice(1);
    var initialTarget = initialId ? doc.getElementById(initialId) : null;
    var initialGroup = initialTarget && initialTarget.closest('main section[id]')
      ? getGroup(initialTarget.closest('main section[id]'))
      : 'inicio';
    showPanel(initialGroup, initialId, false, false);
  }

  /* ---------- 6. Resaltado de panel activo al recorrer su contenido ---------- */
  function initScrollSpy() {
    var links = Array.prototype.slice.call(doc.querySelectorAll('.site-nav a[data-nav]'));
    var sections = Array.prototype.slice.call(doc.querySelectorAll('main section[id]'));
    if (!links.length || !sections.length || !('IntersectionObserver' in window)) return;

    function activate(key) {
      links.forEach(function (a) {
        var on = a.getAttribute('data-nav') === key;
        a.classList.toggle('active', on);
        if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
    }

    // Una sección cuenta como "activa" cuando cruza la franja central de la pantalla
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var s = entry.target;
          activate(s.getAttribute('data-nav') || s.id);
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    function observeVisiblePanel() {
      observer.disconnect();
      sections.forEach(function (s) { if (!s.hidden) observer.observe(s); });
    }
    window.addEventListener('mekapaws:panelchange', observeVisiblePanel);
    observeVisiblePanel();
  }

  /* ---------- 6. Animaciones de aparición ---------- */
  function initReveal() {
    var items = doc.querySelectorAll('.reveal');
    if (!items.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 7. Contenido externo bajo demanda ---------- */
  // Google Forms, Google Maps y Sketchfab no conectan antes de que la persona los solicite.
  function initDeferredFrame(buttonId, facadeId, wrapId, frameId) {
    var btn = doc.getElementById(buttonId);
    var facade = doc.getElementById(facadeId);
    var wrap = doc.getElementById(wrapId);
    var frame = doc.getElementById(frameId);
    if (!btn || !facade || !wrap || !frame) return;

    btn.addEventListener('click', function () {
      var src = frame.getAttribute('data-src');
      if (!src) return;
      frame.setAttribute('src', src);
      facade.hidden = true;
      wrap.hidden = false;
      frame.focus();
    });
  }

  function initExternalContent() {
    initDeferredFrame('load-map', 'map-facade', 'map-frame-wrap', 'map-frame');
    initDeferredFrame('load-model', 'model-facade', 'model-frame-wrap', 'model-frame');
    initDeferredFrame('load-form', 'form-facade', 'form-frame-wrap', 'form-frame');
  }

  /* ---------- 8. Minijuego: Meka salta obstáculos ---------- */
  function initGame() {
    var canvas = doc.getElementById('cat-game');
    var startBtn = doc.getElementById('game-start');
    var jumpBtn = doc.getElementById('game-jump');
    var status = doc.getElementById('game-status');
    var scoreText = doc.getElementById('game-score');
    if (!canvas || !startBtn || !jumpBtn || !status || !scoreText) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var width = canvas.width;
    var height = canvas.height;
    var ground = 202;
    var runnerX = 78;
    var jump = 0;
    var velocityY = 0;
    var obstacles = [];
    var score = 0;
    var speed = 250;
    var spawnIn = 1;
    var previousTime = 0;
    var running = false;
    var hasLost = false;
    var frame = 0;
    var spriteSize = 128;
    var spriteFiles = ['idle-1.png', 'idle-2.png', 'run-1.png', 'run-2.png', 'run-3.png', 'run-4.png', 'jump-1.png', 'jump-2.png', 'defeat-1.png', 'defeat-2.png'];
    var spriteFrames = new Array(spriteFiles.length);
    var loadedSprites = 0;
    var spritesReady = false;
    var spriteFailed = false;
    startBtn.disabled = true;
    spriteFiles.forEach(function (file, index) {
      var sprite = new Image();
      sprite.onload = function () {
        loadedSprites += 1;
        if (loadedSprites === spriteFiles.length) {
          spritesReady = true;
          startBtn.disabled = false;
          drawScene();
        }
      };
      sprite.onerror = function () {
        if (spriteFailed) return;
        spriteFailed = true;
        startBtn.disabled = true;
        announce('Meka’s game sprites could not be loaded. Reload the page to try again.', 'No se pudieron cargar los sprites del juego. Recarga la página para intentarlo de nuevo.');
      };
      spriteFrames[index] = sprite;
      sprite.src = new URL('./assets/img/game/' + file, doc.baseURI).href;
    });

    function announce(english, spanish) {
      status.textContent = root.getAttribute('lang') === 'en' ? english : spanish;
    }

    function kittenFrame() {
      if (hasLost) return 8 + (reduceMotion ? 0 : Math.floor(frame / 520) % 2);
      // Las dos poses de salto representan fases físicas distintas, no una animación por tiempo.
      if (jump > 0) return velocityY > 0 ? 6 : 7;
      if (running) return 2 + (reduceMotion ? 0 : Math.floor(frame / 105) % 4);
      return reduceMotion ? 0 : Math.floor(frame / 520) % 2;
    }

    function drawKitten() {
      var x = runnerX - 20;
      var y = ground - spriteSize - jump;
      if (spritesReady) {
        var index = kittenFrame();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(spriteFrames[index], x, y, spriteSize, spriteSize);
      }
    }

    function drawScene() {
      ctx.clearRect(0, 0, width, height);

      // Cielo de atardecer, sol claro y nubes suaves.
      var sky = ctx.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, '#D9662A');
      sky.addColorStop(.52, '#F07A3C');
      sky.addColorStop(1, '#FFE3C5');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, ground);
      var glow = ctx.createRadialGradient(536, 82, 10, 536, 82, 92);
      glow.addColorStop(0, 'rgba(255,255,255,.45)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(430, 0, 210, 170);
      ctx.fillStyle = '#FFFDF5';
      ctx.beginPath();
      ctx.arc(536, 82, 31, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,244,230,.75)';
      ctx.beginPath();
      ctx.ellipse(250, 51, 34, 7, 0, 0, Math.PI * 2);
      ctx.ellipse(274, 49, 23, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(467, 118, 25, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mar oscuro con reflejos claros debajo del sol.
      var sea = ctx.createLinearGradient(0, 140, 0, height);
      sea.addColorStop(0, '#211817');
      sea.addColorStop(.55, '#100D0D');
      sea.addColorStop(1, '#050505');
      ctx.fillStyle = sea;
      ctx.fillRect(0, 140, width, height - 140);
      ctx.strokeStyle = 'rgba(255,250,240,.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 142);
      ctx.lineTo(width, 142);
      ctx.stroke();
      var glints = [
        [506, 153, 50], [550, 162, 74], [478, 170, 38], [526, 178, 68],
        [555, 187, 86], [489, 195, 43], [531, 199, 62]
      ];
      glints.forEach(function (line, i) {
        ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,.8)' : 'rgba(255,225,197,.62)';
        ctx.lineWidth = i % 3 === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(line[0] - line[2] / 2, line[1]);
        ctx.lineTo(line[0] + line[2] / 2, line[1]);
        ctx.stroke();
      });

      // Orilla oscura para que el recorrido y la prótesis destaquen.
      ctx.fillStyle = '#080707';
      ctx.fillRect(0, ground, width, height - ground);
      ctx.strokeStyle = 'rgba(255,255,255,.66)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, ground + 2);
      ctx.quadraticCurveTo(120, ground - 2, 245, ground + 2);
      ctx.quadraticCurveTo(370, ground + 6, 490, ground + 1);
      ctx.quadraticCurveTo(610, ground - 3, width, ground + 2);
      ctx.stroke();

      obstacles.forEach(function (item) {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(item.x, ground - item.h, item.w, item.h, 7);
        else ctx.rect(item.x, ground - item.h, item.w, item.h);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.82)';
        ctx.beginPath();
        ctx.ellipse(item.x + item.w * .35, ground - item.h + 5, 3, 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      drawKitten();
    }

    function jumpNow() {
      if (!running || jump > 0 || velocityY > 0) return;
      velocityY = 510;
    }

    function endGame() {
      running = false;
      hasLost = true;
      jumpBtn.disabled = true;
      announce('Meka paused. Your score: ' + Math.floor(score) + '. Press Play again to restart.',
        'Meka hizo una pausa. Tu puntaje: ' + Math.floor(score) + '. Pulsa Iniciar juego para volver a jugar.');
      drawScene();
    }

    function tick(now) {
      if (!running) return;
      var dt = Math.min((now - previousTime) / 1000, .045);
      previousTime = now;
      frame = now;
      score += dt * 8;
      speed = 250 + Math.min(score * 3, 180);
      spawnIn -= dt;

      if (spawnIn <= 0) {
        var h = 18 + Math.random() * 17;
        obstacles.push({ x: width + 12, w: 17 + Math.random() * 12, h: h, color: Math.random() > .5 ? '#6B4D3D' : '#D9662A' });
        spawnIn = 1.05 + Math.random() * .75;
      }

      jump += velocityY * dt;
      velocityY -= 1450 * dt;
      if (jump < 0) { jump = 0; velocityY = 0; }

      obstacles.forEach(function (item) { item.x -= speed * dt; });
      obstacles = obstacles.filter(function (item) { return item.x + item.w > -5; });
      scoreText.textContent = String(Math.floor(score));

      var catLeft = runnerX - 10;
      var catRight = runnerX + 104;
      var catTop = ground - jump - 124;
      var catBottom = ground - jump - 4;
      var hit = obstacles.some(function (item) {
        var obstacleTop = ground - item.h;
        return catRight > item.x + 3 && catLeft < item.x + item.w - 2 && catBottom > obstacleTop + 2 && catTop < ground;
      });

      drawScene();
      if (hit) { endGame(); return; }
      window.requestAnimationFrame(tick);
    }

    function startGame() {
      if (running || !spritesReady) return;
      obstacles = [];
      score = 0;
      speed = 250;
      spawnIn = .85;
      jump = 0;
      velocityY = 0;
      hasLost = false;
      previousTime = window.performance.now();
      frame = 0;
      running = true;
      scoreText.textContent = '0';
      jumpBtn.disabled = false;
      announce('Use Space, Arrow Up or Jump to help Meka.', 'Usa Espacio, flecha arriba o Saltar para ayudar a Meka.');
      window.requestAnimationFrame(tick);
    }

    startBtn.addEventListener('click', startGame);
    jumpBtn.addEventListener('click', jumpNow);
    canvas.addEventListener('keydown', function (event) {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        jumpNow();
      }
    });
    drawScene();
    if (!reduceMotion) {
      window.setInterval(function () {
        if (!running) {
          frame += 520;
          drawScene();
        }
      }, 520);
    }
  }

  /* ---------- 9. Guía de MekaPaws: chatbot local con aspecto de gato ---------- */
  function initChatbot() {
    var launcher = doc.getElementById('chat-launcher');
    var panel = doc.getElementById('cat-chat-panel');
    var closeBtn = doc.getElementById('chat-close');
    var form = doc.getElementById('chat-form');
    var input = doc.getElementById('chat-input');
    var feed = doc.getElementById('chat-feed');
    var modeNote = doc.getElementById('chat-mode-note');
    var sendButton = form && form.querySelector('button[type="submit"]');
    if (!launcher || !panel || !closeBtn || !form || !input || !feed) return;
    var promptButtons = panel.querySelectorAll('[data-chat-prompt]');
    var endpointMeta = doc.querySelector('meta[name="mekapaws-ai-endpoint"]');
    var aiEndpoint = endpointMeta ? endpointMeta.content.trim() : '';
    var conversation = [];
    var isSending = false;

    function updateModeNote() {
      if (!modeNote) return;
      modeNote.textContent = aiEndpoint
        ? (currentLang === 'en' ? 'AI connected: answers come from the configured provider.' : 'IA conectada: las respuestas las genera el proveedor configurado.')
        : (currentLang === 'en' ? 'AI not connected yet: I can answer common questions for now.' : 'IA por conectar: por ahora puedo responder preguntas frecuentes.');
    }
    window.addEventListener('mekapaws:languagechange', updateModeNote);
    updateModeNote();

    function setOpen(open, returnFocus) {
      panel.hidden = !open;
      launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) input.focus();
      else if (returnFocus) launcher.focus();
    }

    function addMessage(text, who, link, linkLabel) {
      var message = doc.createElement('div');
      message.className = 'chat-message chat-message-' + who;
      var paragraph = doc.createElement('p');
      paragraph.textContent = text;
      message.appendChild(paragraph);
      if (link && linkLabel) {
        var anchor = doc.createElement('a');
        anchor.href = link;
        anchor.textContent = linkLabel;
        if (/^https:\/\//i.test(link)) {
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
        }
        message.appendChild(anchor);
      }
      feed.appendChild(message);
      feed.scrollTop = feed.scrollHeight;
      return message;
    }

    function setMessage(message, text, link, linkLabel) {
      while (message.firstChild) message.removeChild(message.firstChild);
      var paragraph = doc.createElement('p');
      paragraph.textContent = text;
      message.appendChild(paragraph);
      if (link && linkLabel) {
        var anchor = doc.createElement('a');
        anchor.href = link;
        anchor.textContent = linkLabel;
        if (/^https:\/\//i.test(link)) {
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
        }
        message.appendChild(anchor);
      }
      feed.scrollTop = feed.scrollHeight;
    }

    function setBusy(busy) {
      isSending = busy;
      input.disabled = busy;
      if (sendButton) sendButton.disabled = busy;
      promptButtons.forEach(function (button) { button.disabled = busy; });
      if (!busy && !panel.hidden) input.focus();
    }

    function getAnswer(question) {
      var en = currentLang === 'en';
      var q = question.toLocaleLowerCase();
      if (/material|petg|titanio|silicona|caucho/.test(q)) return {
        text: en
          ? 'The project is considering PETG-CF, recycled rubber, grade 5 titanium and silicone. The final choice depends on the design and veterinary assessment.'
          : 'El proyecto considera PETG-CF, caucho reciclado, titanio grado 5 y silicona. La selección final depende del diseño y de la valoración veterinaria.'
      };
      if (/precio|cost|valor|subsid|financ|cu[aá]nto/.test(q)) return {
        text: en
          ? 'There is no public price list. MekaPaws proposes graduated community support; any individual proposal would require an assessment first.'
          : 'No hay una lista pública de precios. MekaPaws propone apoyos comunitarios escalonados; cualquier propuesta individual requeriría primero una valoración.'
      };
      if (/direcci|ubicaci|d[oó]nde|llegar|address|location|where/.test(q)) return {
        text: en ? 'The project contact point is Calle 71 D Sur #14-16, Usme, Bogotá.' : 'El punto de contacto del proyecto está en Calle 71 D Sur #14-16, Usme, Bogotá.',
        link: 'https://maps.google.com/?q=Calle+71+D+Sur+14-16+Usme+Bogota',
        label: en ? 'Open directions' : 'Ver cómo llegar'
      };
      if (/formulario|valoraci|cita|solic|assessment|appointment|request|form/.test(q)) return {
        text: en
          ? 'You can leave a request in the project form. The team can review the information and explain the next steps.'
          : 'Puedes dejar una solicitud en el formulario del proyecto. El equipo podrá revisar la información y explicar los siguientes pasos.',
        link: '#contacto',
        label: en ? 'Go to the form' : 'Ir al formulario'
      };
      if (/correo|email/.test(q)) return {
        text: en ? 'The project email address is ashescatto@gmail.com.' : 'El correo del proyecto es ashescatto@gmail.com.',
        link: 'mailto:ashescatto@gmail.com',
        label: en ? 'Write an email' : 'Enviar un correo'
      };
      if (/whats|tel[eé]fono|contact/.test(q)) return {
        text: en ? 'You can write to the project by WhatsApp or email.' : 'Puedes escribir al proyecto por WhatsApp o correo.',
        link: 'https://wa.me/573045901916?text=Hola%2C%20quiero%20consultar%20sobre%20MekaPaws',
        label: en ? 'Message on WhatsApp' : 'Escribir por WhatsApp'
      };
      if (/prob|prueba|certific|invima|resultado|avance|estado|prototip|test|certif|progress|prototype/.test(q)) return {
        text: en
          ? 'MekaPaws is a school project and its designs are still under development. The site does not claim clinical testing, certifications or INVIMA approval.'
          : 'MekaPaws es un proyecto escolar y sus diseños siguen en desarrollo. El sitio no afirma pruebas clínicas, certificaciones ni aprobación del INVIMA.'
      };
      if (/qui[eé]n|proyecto|colegio|who|school|about/.test(q)) return {
        text: en
          ? 'MekaPaws is a 2026 EMI school project at Colegio Orlando Fals Borda IED in Bogotá. It explores personalized 3D-printed prostheses for dogs and cats.'
          : 'MekaPaws es un proyecto escolar EMI 2026 del Colegio Orlando Fals Borda IED, en Bogotá. Explora prótesis personalizadas impresas en 3D para perros y gatos.'
      };
      return {
        text: en
          ? 'I can help with the project, materials, current development, location or assessment requests. For a specific case, please use the form or WhatsApp.'
          : 'Puedo orientarte sobre el proyecto, materiales, estado de desarrollo, ubicación o solicitudes de valoración. Para un caso particular, usa el formulario o WhatsApp.',
        link: '#contacto',
        label: en ? 'Contact MekaPaws' : 'Contactar a MekaPaws'
      };
    }

    function submitMessage(text) {
      var question = (text || input.value).trim();
      if (!question || isSending) return;
      addMessage(question, 'user');
      input.value = '';
      if (!aiEndpoint) {
        var localAnswer = getAnswer(question);
        addMessage(localAnswer.text, 'bot', localAnswer.link, localAnswer.label);
        return;
      }

      var thinking = addMessage(currentLang === 'en' ? 'Meka is thinking…' : 'Meka está pensando…', 'bot');
      conversation.push({ role: 'user', content: question });
      setBusy(true);
      var controller = new AbortController();
      var timeoutId = window.setTimeout(function () { controller.abort(); }, 35000);
      window.fetch(aiEndpoint, {
        method: 'POST',
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, messages: conversation.slice(-12) }),
        signal: controller.signal
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok || typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('ai_unavailable');
          return data.answer.trim().slice(0, 6000);
        });
      }).then(function (answer) {
        setMessage(thinking, answer);
        conversation.push({ role: 'assistant', content: answer });
      }).catch(function () {
        var fallback = getAnswer(question);
        var prefix = currentLang === 'en'
          ? 'I could not reach the AI right now. Here is the local guide: '
          : 'No pude conectar con la IA ahora. Te comparto la guía local: ';
        setMessage(thinking, prefix + fallback.text, fallback.link, fallback.label);
        conversation.push({ role: 'assistant', content: prefix + fallback.text });
      }).finally(function () {
        window.clearTimeout(timeoutId);
        setBusy(false);
      });
    }

    launcher.addEventListener('click', function () { setOpen(panel.hidden, false); });
    closeBtn.addEventListener('click', function () { setOpen(false, true); });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      submitMessage();
    });
    promptButtons.forEach(function (button) {
      button.addEventListener('click', function () { submitMessage(button.textContent); });
    });
    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden) setOpen(false, true);
    });
  }

  /* ---------- Inicio ---------- */
  function init() {
    initLang();
    initTheme();
    initMenu();
    initPanelNavigation();
    initScrollSpy();
    initReveal();
    initExternalContent();
    initGame();
    initChatbot();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
