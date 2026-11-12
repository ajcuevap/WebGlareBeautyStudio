// Arma la página con contenido.json (editable desde el panel) y maneja las interacciones
(() => {
  const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const NOMBRES_DIA = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
  const ZONA = 'America/Guayaquil';
  const PULSACION_ACCESO_MS = 1500;
  const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel) => document.querySelector(sel);

  function crear(etiqueta, props = {}, ...hijos) {
    const el = document.createElement(etiqueta);
    for (const [clave, valor] of Object.entries(props)) {
      if (clave === 'class') el.className = valor;
      else if (clave === 'text') el.textContent = valor;
      else if (clave.startsWith('on')) el.addEventListener(clave.slice(2), valor);
      else el.setAttribute(clave, valor);
    }
    el.append(...hijos.filter(Boolean));
    return el;
  }

  const leer = (obj, ruta) => ruta.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
  const enlaceWhatsApp = (numero, texto) => `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  const precioTexto = (precio) => (typeof precio === 'number' ? `$${precio % 1 ? precio.toFixed(2) : precio}` : 'Consultar');

  // ---------- Hora local del salón ----------
  function ahoraEnSalon() {
    const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONA, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((p) => [p.type, p.value]));
    const dia = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[partes.weekday];
    return { dia: DIAS[dia], minutos: Number(partes.hour) * 60 + Number(partes.minute) };
  }
  const aMinutos = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

  function pintarEstado(horario) {
    const { dia, minutos } = ahoraEnSalon();
    const hoy = horario[dia];
    const abierto = hoy && minutos >= aMinutos(hoy.inicio) && minutos < aMinutos(hoy.fin);
    let texto;
    if (abierto) texto = `Abierto ahora · hasta las ${hoy.fin}`;
    else {
      const inicioIdx = DIAS.indexOf(dia);
      for (let i = 0; i < 7; i += 1) {
        const nombre = DIAS[(inicioIdx + i) % 7];
        const h = horario[nombre];
        if (!h) continue;
        if (i === 0 && minutos >= aMinutos(h.inicio)) continue;
        texto = `Cerrado · abrimos ${i === 0 ? 'hoy' : i === 1 ? 'mañana' : `el ${NOMBRES_DIA[nombre].toLowerCase()}`} a las ${h.inicio}`;
        break;
      }
    }
    if (!texto) return;
    $('#estado-texto').textContent = texto;
    $('#estado').classList.toggle('cerrado', !abierto);
    $('#estado').hidden = false;
  }

  function pintarHorario(horario) {
    const { dia } = ahoraEnSalon();
    const tabla = $('#horario');
    for (const nombre of [...DIAS.slice(1), 'domingo']) {
      const h = horario[nombre];
      tabla.append(crear('tr', { class: nombre === dia ? 'hoy' : '' }, crear('th', { scope: 'row', text: NOMBRES_DIA[nombre] }), crear('td', { text: h ? `${h.inicio} – ${h.fin}` : 'Cerrado' })));
    }
  }

  // ---------- Inclinación 3D con destello ----------
  function inclinar(el, maxGrados = 8) {
    if (reducirMovimiento || !matchMedia('(hover: hover)').matches) return;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.transform = `rotateX(${(0.5 - y) * maxGrados}deg) rotateY(${(x - 0.5) * maxGrados}deg)`;
      el.style.setProperty('--x', `${x * 100}%`);
      el.style.setProperty('--y', `${y * 100}%`);
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  }

  // ---------- Servicios ----------
  function pintarServicios(servicios, whatsapp) {
    const categorias = [...new Set(servicios.map((s) => s.categoria))];
    const pestanas = $('#pestanas');
    const tarjetas = $('#tarjetas');
    let actual = categorias[0];

    function mostrar() {
      pestanas.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.cat === actual)));
      tarjetas.replaceChildren(...servicios.filter((s) => s.categoria === actual).map((s, i) => {
        const duracion = s.duracionMinutos ? `${s.duracionMinutos} min` : 'Duración a consultar';
        const tarjeta = crear('article', { class: 'tarjeta', style: `animation-delay:${i * 60}ms` },
          crear('span', { class: 'cat', text: s.categoria }),
          crear('h3', { text: s.nombre }),
          crear('p', { text: s.descripcion || '' }),
          crear('div', { class: 'pie-tarjeta' },
            crear('div', { class: 'precio', text: precioTexto(s.precio) }, crear('small', { text: duracion })),
            crear('a', { class: 'boton', href: enlaceWhatsApp(whatsapp, `Hola, quiero agendar: ${s.nombre}`), target: '_blank', rel: 'noopener', text: 'Reservar' })),
          crear('span', { class: 'brillo' }));
        inclinar(tarjeta, 10);
        tarjeta.addEventListener('mouseenter', () => tarjeta.querySelector('.brillo').style.opacity = '1');
        tarjeta.addEventListener('mouseleave', () => tarjeta.querySelector('.brillo').style.opacity = '');
        return tarjeta;
      }));
    }

    pestanas.replaceChildren(...categorias.map((c) => crear('button', { role: 'tab', 'data-cat': c, text: c, onclick: () => { actual = c; mostrar(); } })));
    mostrar();
    $('#cinta-pista').replaceChildren(...[...servicios, ...servicios].map((s) => crear('span', { text: s.nombre })));
  }

  // ---------- Galería en anillo 3D ----------
  function pintarGaleria(fotos) {
    const categorias = ['Todo', ...new Set(fotos.map((f) => f.categoria))];
    const anillo = $('#anillo');
    const carrusel = $('#carrusel');
    let visibles = fotos;
    let angulo = 0;
    let paso = 0;
    let radio = 0;

    function colocar() {
      const ancho = anillo.offsetWidth;
      paso = 360 / Math.max(visibles.length, 1);
      radio = Math.max(ancho * 0.9, Math.round(ancho / 2 / Math.tan(Math.PI / Math.max(visibles.length, 3)) + 24));
      [...anillo.children].forEach((el, i) => { el.style.transform = `rotateY(${i * paso}deg) translateZ(${radio}px)`; });
      girar();
    }
    function girar() { anillo.style.transform = `translateZ(${-radio}px) rotateY(${angulo}deg)`; }

    function mostrar(cat) {
      visibles = cat === 'Todo' ? fotos : fotos.filter((f) => f.categoria === cat);
      angulo = 0;
      anillo.replaceChildren(...visibles.map((f, i) => crear('button', { class: 'foto', 'aria-label': `Ver ${f.titulo}`, onclick: () => abrirVisor(i) },
        crear('img', { src: f.src, alt: f.titulo, loading: 'lazy', draggable: 'false' }), crear('span', { text: f.titulo }))));
      document.querySelectorAll('#filtros button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
      requestAnimationFrame(colocar);
    }

    $('#filtros').replaceChildren(...categorias.map((c) => crear('button', { 'data-cat': c, text: c, onclick: () => mostrar(c) })));
    mostrar('Todo');
    addEventListener('resize', colocar);

    // Arrastrar para girar
    let inicioX = null;
    let anguloInicial = 0;
    let movido = false;
    carrusel.addEventListener('pointerdown', (e) => { inicioX = e.clientX; anguloInicial = angulo; movido = false; carrusel.classList.add('arrastrando'); });
    addEventListener('pointermove', (e) => {
      if (inicioX === null) return;
      const dx = e.clientX - inicioX;
      if (Math.abs(dx) > 6) movido = true;
      angulo = anguloInicial + dx * 0.35;
      girar();
    });
    addEventListener('pointerup', () => {
      if (inicioX === null) return;
      inicioX = null;
      carrusel.classList.remove('arrastrando');
      angulo = Math.round(angulo / paso) * paso;
      girar();
    });
    carrusel.addEventListener('click', (e) => { if (movido) { e.stopPropagation(); e.preventDefault(); } }, true);

    // Giro automático suave mientras nadie toca
    if (!reducirMovimiento) {
      setInterval(() => {
        if (inicioX !== null || document.hidden || $('#visor').open) return;
        const r = carrusel.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        angulo -= paso;
        girar();
      }, 3500);
    }

    // Visor
    let indice = 0;
    function abrirVisor(i) {
      indice = i;
      pintarVisor();
      $('#visor').showModal();
    }
    function pintarVisor() {
      const f = visibles[indice];
      $('#visor-img').src = f.src;
      $('#visor-img').alt = f.titulo;
      $('#visor-titulo').textContent = f.titulo;
    }
    const mover = (d) => { indice = (indice + d + visibles.length) % visibles.length; pintarVisor(); };
    $('#visor-cerrar').addEventListener('click', () => $('#visor').close());
    $('#visor-anterior').addEventListener('click', () => mover(-1));
    $('#visor-siguiente').addEventListener('click', () => mover(1));
    $('#visor').addEventListener('click', (e) => { if (e.target === $('#visor')) $('#visor').close(); });
    $('#visor').addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') mover(-1); if (e.key === 'ArrowRight') mover(1); });
  }

  // ---------- Equipo ----------
  function pintarEquipo(equipo, whatsapp) {
    $('#equipo-lista').replaceChildren(...equipo.map((p) => {
      const nombreCorto = p.nombre.split(' ')[0];
      const carta = crear('div', { class: 'carta revelar', role: 'button', tabindex: '0', 'aria-label': `${p.nombre}: ver más` },
        crear('div', { class: 'carta-interior' },
          crear('div', { class: 'carta-cara carta-frente' },
            crear('img', { src: p.foto, alt: p.nombre, loading: 'lazy' }),
            crear('div', {}, crear('h3', { text: p.nombre }), crear('p', { text: p.rol }))),
          crear('div', { class: 'carta-cara carta-reverso' },
            crear('h3', { text: p.nombre }),
            crear('p', { text: p.bio }),
            crear('a', { class: 'boton boton-claro', href: enlaceWhatsApp(whatsapp, `Hola, quiero agendar con ${nombreCorto}`), target: '_blank', rel: 'noopener', text: `Agendar con ${nombreCorto}`, onclick: (e) => e.stopPropagation() }))));
      const voltear = () => carta.classList.toggle('volteada');
      carta.addEventListener('click', voltear);
      carta.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); voltear(); } });
      return carta;
    }));
  }

  // ---------- Preguntas ----------
  function pintarPreguntas(preguntas) {
    $('#preguntas').hidden = preguntas.length === 0;
    $('#preguntas-lista').replaceChildren(...preguntas.map((p) => crear('details', { class: 'revelar' }, crear('summary', { text: p.pregunta }), crear('p', { text: p.respuesta }))));
  }

  // ---------- Pie ----------
  const ICONOS = {
    instagram: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM12 2.2c2.7 0 3 0 4 .1 1 0 1.8.2 2.4.5a4.6 4.6 0 0 1 2.8 2.8c.3.6.4 1.4.5 2.4v8c0 1-.2 1.8-.5 2.4a4.6 4.6 0 0 1-2.8 2.8c-.6.3-1.4.4-2.4.5H8c-1 0-1.8-.2-2.4-.5a4.6 4.6 0 0 1-2.8-2.8c-.3-.6-.4-1.4-.5-2.4V8c0-1 .2-1.8.5-2.4a4.6 4.6 0 0 1 2.8-2.8c.6-.3 1.4-.4 2.4-.5h4Z',
    facebook: 'M14 8V6.3c0-.8.2-1.3 1.4-1.3H17V2.1A22 22 0 0 0 14.6 2C12.3 2 10.7 3.4 10.7 6v2H8v3.2h2.7V22H14V11.2h2.7l.4-3.2Z',
    tiktok: 'M16.7 2h-3.3v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .8.1V9.2l-.8-.1a6.2 6.2 0 1 0 6.2 6.2V8.6a7.8 7.8 0 0 0 4.6 1.5V6.8a4.6 4.6 0 0 1-4.6-4.6Z',
  };
  function pintarPie(contacto) {
    $('#pie-whatsapp').href = enlaceWhatsApp(contacto.whatsapp, 'Hola, quiero información');
    $('#pie-whatsapp').textContent = `WhatsApp +${contacto.whatsapp}`;
    $('#pie-email').href = `mailto:${contacto.email}`;
    $('#pie-email').textContent = contacto.email;
    $('#redes').replaceChildren(...Object.keys(ICONOS).filter((red) => contacto[red]).map((red) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', ICONOS[red]);
      path.setAttribute('fill', 'currentColor');
      svg.append(path);
      return crear('a', { href: contacto[red], target: '_blank', rel: 'noopener', 'aria-label': red }, svg);
    }));
    $('#anio').textContent = new Date().getFullYear();
  }

  // ---------- Acceso oculto al editor: mantener presionado el logo del pie ----------
  function accesoOculto(url) {
    if (!url) return;
    const logo = $('#acceso');
    let temporizador = null;
    const cancelar = () => clearTimeout(temporizador);
    logo.addEventListener('pointerdown', () => { temporizador = setTimeout(() => { location.href = url; }, PULSACION_ACCESO_MS); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => logo.addEventListener(ev, cancelar));
    logo.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---------- Barra, menú y apariciones ----------
  function interfaz() {
    const barra = $('#barra');
    addEventListener('scroll', () => barra.classList.toggle('compacta', scrollY > 40), { passive: true });
    const boton = $('#abrir-menu');
    const menu = $('#menu');
    boton.addEventListener('click', () => {
      const abierto = menu.classList.toggle('abierto');
      boton.setAttribute('aria-expanded', String(abierto));
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.classList.remove('abierto'); boton.setAttribute('aria-expanded', 'false'); } });

    document.querySelectorAll('[data-inclinar]').forEach((el) => inclinar(el, 6));
  }

  function revelar() {
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); observador.unobserve(e.target); } });
    }, { threshold: 0.15 });
    document.querySelectorAll('.revelar:not(.visible)').forEach((el) => observador.observe(el));
  }

  // ---------- Escena 3D: solo si hay WebGL ----------
  function escena3D() {
    const contenedor = $('#escena');
    const lienzo = document.createElement('canvas');
    const webgl = lienzo.getContext('webgl2') || lienzo.getContext('webgl');
    if (!webgl) { contenedor.classList.add('sin-3d'); return; }
    import('./escena.js').then((m) => m.iniciar(contenedor, { reducirMovimiento })).catch(() => contenedor.classList.add('sin-3d'));
  }

  async function iniciar() {
    interfaz();
    escena3D();
    let datos;
    try {
      const respuesta = await fetch('contenido.json', { cache: 'no-cache' });
      datos = await respuesta.json();
    } catch {
      revelar();
      return;
    }
    const { contacto } = datos;
    document.querySelectorAll('[data-texto]').forEach((el) => { const v = leer(datos, el.dataset.texto); if (v) el.textContent = v; });
    document.querySelectorAll('[data-reservar]').forEach((a) => {
      a.href = enlaceWhatsApp(contacto.whatsapp, 'Hola, quiero agendar una cita');
      a.target = '_blank';
      a.rel = 'noopener';
    });
    $('#como-llegar').href = contacto.mapa;
    $('#mapa').src = `https://www.google.com/maps?q=${encodeURIComponent(contacto.direccion)}&output=embed`;
    pintarEstado(datos.horario);
    pintarHorario(datos.horario);
    pintarServicios(datos.servicios, contacto.whatsapp);
    pintarGaleria(datos.galeria);
    pintarEquipo(datos.equipo, contacto.whatsapp);
    pintarPreguntas(datos.preguntas || []);
    pintarPie(contacto);
    accesoOculto(datos.panelUrl);
    revelar();
  }

  iniciar();
})();
