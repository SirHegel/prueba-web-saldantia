/*!
 * Saldantia — js/scroll.js
 * Animaciones de scroll y micro-interacciones. Vanilla JS, sin dependencias.
 *
 *   1. Reveal on scroll .......... IntersectionObserver (threshold 0.15) + escalonado
 *   2. Parallax del hero ......... desplazamiento suave del fondo/capa visual
 *   3. Navbar ................... .nav--scrolled a partir de 50px + enlace activo
 *   4. Smooth scroll ............ anclas del nav y del footer, con offset de la barra
 *   5. Contadores ............... métricas de #casos y stats del hero (requestAnimationFrame)
 *   6. Micro-interacciones ...... menú móvil, seguimiento del puntero, año del footer
 *
 * Criterios: un único listener de scroll estrangulado con rAF, cero dependencias,
 * degradación limpia si falta IntersectionObserver y respeto por
 * `prefers-reduced-motion` en todos los efectos.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Configuración
   * ------------------------------------------------------------------ */
  var CONFIG = {
    revealThreshold: 0.15,   // porcentaje visible que dispara el reveal
    revealPaso: 100,         // ms de retardo añadido por cada hermano (0.1s)
    revealPasoMax: 6,        // techo del escalonado, para no hacer esperar de más
    parallaxFactor: 0.18,    // fracción del scroll que recorre la capa del hero
    parallaxMax: 140,        // px máximos de desplazamiento
    navScrollY: 50,          // px de scroll a partir de los que la nav se compacta
    contadorMs: 1500         // duración de la animación de los contadores
  };

  // Grupos cuyos hijos entran escalonados (tarjetas de servicios, casos, proceso…)
  var REVEAL_GRUPOS = ['.servicios__grid', '.casos__lista', '.proceso__lista', '.footer__nav'];

  // Bloques que entran como una sola pieza. El hero queda fuera a propósito:
  // su entrada la resuelve css/hero.css y no queremos dos animaciones peleando.
  var REVEAL_SUELTOS = [
    '.seccion__header',
    '.contacto__intro',
    '.formulario',
    '.footer__marca',
    '.footer__bottom'
  ];

  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqPunteroFino = window.matchMedia('(hover: hover) and (pointer: fine)');
  var soportaIO = 'IntersectionObserver' in window;

  function menosMovimiento() {
    return mqReduce.matches;
  }

  /* ------------------------------------------------------------------ *
   * Bucle de scroll compartido: todos los efectos se suscriben aquí y se
   * ejecutan en un único requestAnimationFrame por frame de scroll.
   * ------------------------------------------------------------------ */
  var tareasScroll = [];
  var pendiente = false;

  function ejecutarTareas() {
    pendiente = false;
    for (var i = 0; i < tareasScroll.length; i++) {
      tareasScroll[i]();
    }
  }

  function planificar() {
    if (pendiente) return;
    pendiente = true;
    window.requestAnimationFrame(ejecutarTareas);
  }

  function registrarEnScroll(tarea) {
    tareasScroll.push(tarea);
    tarea(); // estado inicial correcto aunque la página cargue ya desplazada
  }

  /* ------------------------------------------------------------------ *
   * 1. Reveal on scroll
   * ------------------------------------------------------------------ */

  /**
   * ¿La hoja de estilos define ya `.reveal`? Si nadie la estiliza, inyectamos
   * un fallback mínimo para que el efecto no dependa del orden de trabajo
   * entre archivos CSS. Si el CSS del proyecto ya lo cubre, no tocamos nada.
   */
  function faltaCssReveal() {
    var sonda = document.createElement('div');
    sonda.className = 'reveal';
    sonda.setAttribute('aria-hidden', 'true');
    sonda.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;pointer-events:none';
    document.body.appendChild(sonda);

    var estilo = window.getComputedStyle(sonda);
    var yaEstilado = parseFloat(estilo.opacity) < 1 ||
                     parseFloat(estilo.transitionDuration) > 0 ||
                     estilo.transform !== 'none';

    sonda.parentNode.removeChild(sonda);
    return !yaEstilado;
  }

  function inyectarCssReveal() {
    var css =
      '.reveal{opacity:0;transform:translate3d(0,26px,0);' +
      'transition:opacity .7s cubic-bezier(.22,.68,.28,1),transform .7s cubic-bezier(.22,.68,.28,1);' +
      'will-change:opacity,transform}' +
      '.reveal--visible{opacity:1;transform:none}' +
      '@media (prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}}';

    var etiqueta = document.createElement('style');
    etiqueta.setAttribute('data-origen', 'scroll.js');
    etiqueta.textContent = css;
    // Al principio del <head>: cualquier regla de los CSS del proyecto gana.
    document.head.insertBefore(etiqueta, document.head.firstChild);
  }

  function marcar(el, retardoMs) {
    if (el.classList.contains('reveal')) {
      // Ya venía marcado desde el HTML: respetamos su retardo si lo tuviera.
      if (!retardoMs) return el;
    }
    el.classList.add('reveal');
    if (retardoMs > 0) {
      el.dataset.revealDelay = String(retardoMs);
      el.style.setProperty('--reveal-delay', retardoMs + 'ms');
      el.style.transitionDelay = retardoMs + 'ms';
    }
    return el;
  }

  function mostrar(el) {
    el.classList.add('reveal--visible');

    // El retardo es solo para la entrada: se retira al terminar para que no
    // lastre las transiciones de hover de las tarjetas.
    var retardo = parseFloat(el.dataset.revealDelay || 0);
    if (retardo > 0) {
      window.setTimeout(function () {
        el.style.transitionDelay = '';
      }, retardo + 900);
    }
  }

  function iniciarReveal() {
    var elementos = [];
    var vistos = [];

    function anadir(el, retardo) {
      if (!el || vistos.indexOf(el) !== -1) return;
      vistos.push(el);
      elementos.push(marcar(el, retardo || 0));
    }

    // a) Lo que ya venga marcado en el HTML.
    Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) {
      anadir(el, 0);
    });

    // b) Grupos: cada hijo hereda 0.1s más de retardo que el anterior.
    REVEAL_GRUPOS.forEach(function (selector) {
      Array.prototype.forEach.call(document.querySelectorAll(selector), function (grupo) {
        Array.prototype.forEach.call(grupo.children, function (hijo, i) {
          anadir(hijo, Math.min(i, CONFIG.revealPasoMax) * CONFIG.revealPaso);
        });
      });
    });

    // c) Bloques sueltos, siempre que no cuelguen de otro elemento ya animado
    //    (dos opacidades encadenadas se ven sucias).
    REVEAL_SUELTOS.forEach(function (selector) {
      Array.prototype.forEach.call(document.querySelectorAll(selector), function (el) {
        if (el.parentElement && el.parentElement.closest('.reveal')) return;
        anadir(el, 0);
      });
    });

    if (!elementos.length) return;

    // Sin soporte o con movimiento reducido: todo visible, sin animar.
    if (!soportaIO || menosMovimiento()) {
      elementos.forEach(function (el) {
        el.style.transitionDelay = '';
        el.classList.add('reveal--visible');
      });
      return;
    }

    var observador = new IntersectionObserver(function (entradas, obs) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        mostrar(entrada.target);
        obs.unobserve(entrada.target); // la animación es de una sola dirección
      });
    }, { threshold: CONFIG.revealThreshold, rootMargin: '0px 0px -4% 0px' });

    elementos.forEach(function (el) {
      observador.observe(el);
    });
  }

  /* ------------------------------------------------------------------ *
   * 2. Parallax del hero
   * ------------------------------------------------------------------ */

  /**
   * Localiza qué mover: una capa dedicada si existe, y si no el elemento que
   * lleve realmente la imagen de fondo (evitando degradados, que no son url()).
   */
  function resolverCapaParallax(hero) {
    var dedicada = hero.querySelector('[data-parallax], .hero__bg, .hero__media, .hero__visual, .hero__imagen, .hero__img, img');
    if (dedicada) return { el: dedicada, modo: 'transform' };

    var candidatos = [hero].concat(Array.prototype.slice.call(hero.children));
    for (var i = 0; i < candidatos.length; i++) {
      var fondo = window.getComputedStyle(candidatos[i]).backgroundImage;
      if (fondo && fondo.indexOf('url(') !== -1) {
        return { el: candidatos[i], modo: 'fondo' };
      }
    }
    return null;
  }

  function iniciarParallax() {
    var hero = document.querySelector('.hero');
    if (!hero || menosMovimiento()) return;

    var capa = resolverCapaParallax(hero);
    if (!capa) return;

    // Punto de partida del fondo según el CSS, para no pisar el encuadre.
    var basesFondo = capa.modo === 'fondo'
      ? (window.getComputedStyle(capa.el).backgroundPositionY || '50%')
          .split(',')
          .map(function (posicion) { return posicion.trim(); })
      : null;

    var activo = true;
    var ultimo = null;

    // Solo calculamos mientras el hero esté en pantalla.
    if (soportaIO) {
      var vigia = new IntersectionObserver(function (entradas) {
        activo = entradas[0].isIntersecting;
        if (activo) planificar();
      }, { threshold: 0 });
      vigia.observe(hero);
    }

    registrarEnScroll(function () {
      if (!activo) return;

      var rect = hero.getBoundingClientRect();
      var recorrido = Math.max(0, -rect.top); // px de hero ya salidos por arriba
      var y = Math.min(recorrido * CONFIG.parallaxFactor, CONFIG.parallaxMax);
      y = Math.round(y * 100) / 100;
      if (y === ultimo) return;
      ultimo = y;

      // Expuesto también como custom property por si el CSS quiere usarlo.
      hero.style.setProperty('--parallax-y', y + 'px');

      if (capa.modo === 'transform') {
        capa.el.style.transform = 'translate3d(0,' + y + 'px,0)';
      } else {
        // El hero usa varias capas de fondo. Solo desplazamos la última (la
        // imagen), manteniendo inmóviles los degradados que protegen el texto.
        var posiciones = basesFondo.slice();
        var ultima = posiciones.length - 1;
        posiciones[ultima] = 'calc(' + posiciones[ultima] + ' + ' + y + 'px)';
        capa.el.style.backgroundPositionY = posiciones.join(', ');
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 3. Navbar: estado compacto y enlace activo
   * ------------------------------------------------------------------ */
  function iniciarNavbar() {
    var nav = document.getElementById('nav') || document.querySelector('.nav');
    if (!nav) return;

    var enlaces = Array.prototype.slice.call(nav.querySelectorAll('.nav__link[href^="#"]'));
    var secciones = enlaces
      .map(function (enlace) {
        var destino = document.querySelector(enlace.getAttribute('href'));
        return destino ? { enlace: enlace, destino: destino } : null;
      })
      .filter(Boolean);

    var compacta = null;
    var activoActual = null;

    registrarEnScroll(function () {
      // a) Fondo más opaco a partir de 50px.
      var debeCompactar = window.scrollY > CONFIG.navScrollY;
      if (debeCompactar !== compacta) {
        compacta = debeCompactar;
        nav.classList.toggle('nav--scrolled', debeCompactar);
      }

      // b) Enlace correspondiente a la sección que ocupa la parte alta del viewport.
      if (!secciones.length) return;
      var limite = nav.offsetHeight + 40;
      var actual = null;

      for (var i = 0; i < secciones.length; i++) {
        var caja = secciones[i].destino.getBoundingClientRect();
        if (caja.top <= limite && caja.bottom > limite) {
          actual = secciones[i].enlace;
          break;
        }
      }

      // Al final del documento marcamos la última sección aunque no llegue al límite.
      if (!actual && window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
        actual = secciones[secciones.length - 1].enlace;
      }

      if (actual === activoActual) return;
      if (activoActual) {
        activoActual.classList.remove('nav__link--activo');
        activoActual.removeAttribute('aria-current');
      }
      activoActual = actual;
      if (actual) {
        actual.classList.add('nav__link--activo');
        actual.setAttribute('aria-current', 'true');
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 4. Smooth scroll de los enlaces ancla
   * ------------------------------------------------------------------ */
  function alturaNavFija() {
    var nav = document.getElementById('nav') || document.querySelector('.nav');
    if (!nav) return 0;
    var pos = window.getComputedStyle(nav).position;
    return (pos === 'fixed' || pos === 'sticky') ? nav.offsetHeight : 0;
  }

  function iniciarSmoothScroll() {
    // Para saltos nativos (teclado, recarga con hash) que no pasan por el click.
    var raiz = document.documentElement;
    if (window.getComputedStyle(raiz).scrollPaddingTop === 'auto') {
      raiz.style.scrollPaddingTop = (alturaNavFija() + 16) + 'px';
    }

    document.addEventListener('click', function (evento) {
      if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey) return;

      var enlace = evento.target.closest ? evento.target.closest('a[href^="#"]') : null;
      if (!enlace) return;

      var hash = enlace.getAttribute('href');
      if (!hash || hash === '#') return;

      var destino;
      try {
        destino = document.querySelector(hash);
      } catch (e) {
        return; // hash no válido como selector
      }
      if (!destino) return;

      evento.preventDefault();

      var margen = hash === '#hero' ? 0 : alturaNavFija() + 16;
      var top = Math.max(0, destino.getBoundingClientRect().top + window.scrollY - margen);

      window.scrollTo({
        top: top,
        behavior: menosMovimiento() ? 'auto' : 'smooth'
      });

      // El foco viaja con el scroll: sin esto, el tabulador seguiría arriba.
      if (!destino.hasAttribute('tabindex')) destino.setAttribute('tabindex', '-1');
      destino.focus({ preventScroll: true });

      if (history.pushState) history.pushState(null, '', hash);
    });
  }

  /* ------------------------------------------------------------------ *
   * 5. Contadores animados
   * ------------------------------------------------------------------ */

  /**
   * Descompone "+1.400", "-82%", "99,2%" o "15 h" en prefijo, número y sufijo,
   * conservando el formato español (punto de millares, coma decimal).
   * Devuelve null si el texto no es contable (p. ej. "24/7").
   */
  function analizarMetrica(el) {
    var original = (el.textContent || '').trim();
    var partes = original.match(/^([^\d]*)(\d[\d. \s,]*\d|\d)([\s\S]*)$/);
    if (!partes) return null;

    var prefijo = partes[1];
    var crudo = partes[2];
    var sufijo = partes[3];

    // Un segundo número en el sufijo ("24/7") significa que no es un contador.
    if (/\d/.test(sufijo)) return null;

    var agrupa = crudo.indexOf('.') !== -1;
    var decimales = crudo.indexOf(',') !== -1 ? crudo.split(',')[1].replace(/\D/g, '').length : 0;
    var numero = parseFloat(crudo.replace(/[. \s]/g, '').replace(',', '.'));
    if (!isFinite(numero)) return null;

    // data-count manda sobre el texto: permite un objetivo exacto en el HTML.
    if (el.dataset.count !== undefined) {
      var declarado = parseFloat(String(el.dataset.count).replace(',', '.'));
      if (isFinite(declarado)) {
        numero = declarado;
        if (Math.abs(declarado) >= 1000 && !agrupa) agrupa = true;
      }
    }

    var formato = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
      useGrouping: agrupa
    });

    return {
      original: original,
      objetivo: numero,
      pinta: function (valor) {
        return prefijo + formato.format(valor) + sufijo;
      }
    };
  }

  function animarContador(el, datos) {
    var inicio = null;
    var duracion = CONFIG.contadorMs;

    // Cifras de ancho fijo mientras cuenta: evita el temblor del layout.
    var anchoPrevio = el.style.fontVariantNumeric;
    el.style.fontVariantNumeric = 'tabular-nums';
    el.textContent = datos.pinta(0);

    function paso(marca) {
      if (inicio === null) inicio = marca;
      var t = Math.min((marca - inicio) / duracion, 1);
      // easeOutExpo: arranca rápido y frena en seco sobre la cifra final.
      var suave = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

      el.textContent = datos.pinta(datos.objetivo * suave);

      if (t < 1) {
        window.requestAnimationFrame(paso);
      } else {
        // Restauramos el texto original: cero riesgo de deriva de formato.
        el.textContent = datos.original;
        el.style.fontVariantNumeric = anchoPrevio;
      }
    }

    window.requestAnimationFrame(paso);
  }

  function iniciarContadores() {
    var nodos = document.querySelectorAll('#casos .caso-exito__metrica-valor, [data-count]');
    if (!nodos.length || !soportaIO || menosMovimiento()) return;

    var observador = new IntersectionObserver(function (entradas, obs) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        obs.unobserve(entrada.target);

        var datos = analizarMetrica(entrada.target);
        if (datos) animarContador(entrada.target, datos);
      });
    }, { threshold: 0.35 });

    Array.prototype.forEach.call(nodos, function (el) {
      observador.observe(el);
    });
  }

  /* ------------------------------------------------------------------ *
   * 6. Micro-interacciones
   * ------------------------------------------------------------------ */

  /** Menú de navegación en móvil: el botón del HTML necesita este comportamiento. */
  function iniciarMenuMovil() {
    var nav = document.getElementById('nav') || document.querySelector('.nav');
    if (!nav) return;

    var boton = nav.querySelector('.nav__toggle');
    var menu = document.getElementById('nav-menu');
    if (!boton || !menu) return;

    function establecer(abierto) {
      nav.classList.toggle('nav--open', abierto);
      boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      boton.setAttribute('aria-label', abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
      document.body.style.overflow = abierto ? 'hidden' : '';
    }

    function abierto() {
      return boton.getAttribute('aria-expanded') === 'true';
    }

    boton.addEventListener('click', function () {
      establecer(!abierto());
    });

    // Navegar dentro del menú lo cierra.
    menu.addEventListener('click', function (evento) {
      if (evento.target.closest('a') && abierto()) establecer(false);
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape' && abierto()) {
        establecer(false);
        boton.focus();
      }
    });

    // Si al ensanchar la ventana el botón deja de mostrarse, el estado se limpia
    // (sin depender de conocer el breakpoint exacto del CSS).
    window.addEventListener('resize', function () {
      if (abierto() && boton.offsetParent === null) establecer(false);
    }, { passive: true });

    establecer(false);
  }

  /**
   * Posición del puntero sobre las tarjetas como custom properties (--mx/--my).
   * El CSS puede usarlas para un brillo que sigue al cursor; si no las usa,
   * no cuesta nada y no altera el render.
   */
  function iniciarPunteroTarjetas() {
    if (!mqPunteroFino.matches || menosMovimiento()) return;

    var tarjetas = document.querySelectorAll('.card-servicio, .caso-exito, .proceso__paso');
    if (!tarjetas.length) return;

    var pendienteTarjeta = false;
    var cola = null;

    function pintar() {
      pendienteTarjeta = false;
      if (!cola) return;
      cola.el.style.setProperty('--mx', cola.x + '%');
      cola.el.style.setProperty('--my', cola.y + '%');
    }

    Array.prototype.forEach.call(tarjetas, function (tarjeta) {
      tarjeta.addEventListener('pointermove', function (evento) {
        var caja = tarjeta.getBoundingClientRect();
        cola = {
          el: tarjeta,
          x: Math.round(((evento.clientX - caja.left) / caja.width) * 100),
          y: Math.round(((evento.clientY - caja.top) / caja.height) * 100)
        };
        if (!pendienteTarjeta) {
          pendienteTarjeta = true;
          window.requestAnimationFrame(pintar);
        }
      }, { passive: true });

      tarjeta.addEventListener('pointerleave', function () {
        tarjeta.style.removeProperty('--mx');
        tarjeta.style.removeProperty('--my');
      }, { passive: true });
    });
  }

  /** Año del footer siempre al día. */
  function iniciarAnio() {
    var anio = document.getElementById('anio');
    if (anio) anio.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------------ *
   * Arranque
   * ------------------------------------------------------------------ */
  function iniciar() {
    if (faltaCssReveal()) inyectarCssReveal();

    iniciarReveal();
    iniciarParallax();
    iniciarNavbar();
    iniciarSmoothScroll();
    iniciarContadores();
    iniciarMenuMovil();
    iniciarPunteroTarjetas();
    iniciarAnio();

    window.addEventListener('scroll', planificar, { passive: true });
    window.addEventListener('resize', planificar, { passive: true });
  }

  // El script se carga con `defer`, pero cubrimos también una carga tardía.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
