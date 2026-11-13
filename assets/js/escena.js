// Portada en 3D: una perla líquida iridiscente con perlas que la orbitan, en los tonos de la marca
import * as THREE from './vendor/three.module.min.js';

const RUIDO_GLSL = /* glsl */ `
vec4 permutar(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 invRaiz(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float ruido(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+2.0*C.xxx;vec3 x3=x0-1.0+3.0*C.xxx;
  i=mod(i,289.0);
  vec4 p=permutar(permutar(permutar(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=invRaiz(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float desplazar(vec3 p){return ruido(p*0.62+vec3(uTiempo*0.18))*0.2+ruido(p*1.35-vec3(uTiempo*0.12))*0.045;}
`;

// Entorno de estudio fotográfico: paneles de luz rosados y blancos para los reflejos
function entornoDeEstudio(renderer) {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color('#f6dede');
  const caja = new THREE.BoxGeometry(1, 1, 1);
  const luz = (color, intensidad, pos, escala) => {
    const m = new THREE.Mesh(caja, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensidad) }));
    m.position.set(...pos);
    m.scale.set(...escala);
    escena.add(m);
  };
  luz('#ffffff', 6, [0, 6, 2], [8, 0.2, 4]);
  luz('#ffd9e0', 3, [-6, 1, 1], [0.2, 6, 6]);
  luz('#c5908e', 2.5, [6, 0, -1], [0.2, 6, 6]);
  luz('#ffffff', 2, [0, -1, 7], [6, 3, 0.2]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const textura = pmrem.fromScene(escena, 0.04).texture;
  pmrem.dispose();
  return textura;
}

// ---------- Navidad: nieve, estrella y esferas navideñas ----------

// Copo suave dibujado una vez y usado como textura de cada partícula
function texturaCopo() {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 64;
  const ctx = lienzo.getContext('2d');
  const brillo = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  brillo.addColorStop(0, 'rgba(255,255,255,1)');
  brillo.addColorStop(0.35, 'rgba(255,245,248,.85)');
  brillo.addColorStop(1, 'rgba(255,240,244,0)');
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, 64, 64);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

function crearNieve(cantidad) {
  const posiciones = new Float32Array(cantidad * 3);
  const datos = [];
  for (let i = 0; i < cantidad; i += 1) {
    posiciones.set([(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 10, Math.random() * 7 - 4], i * 3);
    datos.push({ caida: 0.25 + Math.random() * 0.45, fase: Math.random() * Math.PI * 2, vaiven: 0.15 + Math.random() * 0.35 });
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  const puntos = new THREE.Points(geometria, new THREE.PointsMaterial({
    size: 0.18, map: texturaCopo(), transparent: true, depthWrite: false, opacity: 1, color: '#ffffff',
  }));
  puntos.renderOrder = 2;
  return { puntos, datos };
}

function moverNieve({ puntos, datos }, t, dt) {
  const pos = puntos.geometry.attributes.position;
  for (let i = 0; i < datos.length; i += 1) {
    const d = datos[i];
    let y = pos.getY(i) - d.caida * dt;
    if (y < -5) y = 5;
    pos.setY(i, y);
    pos.setX(i, pos.getX(i) + Math.sin(t * d.vaiven + d.fase) * 0.004);
  }
  pos.needsUpdate = true;
}

function crearEstrella() {
  const forma = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const radio = i % 2 ? 0.17 : 0.4;
    const angulo = (i / 10) * Math.PI * 2 + Math.PI / 2;
    forma[i ? 'lineTo' : 'moveTo'](Math.cos(angulo) * radio, Math.sin(angulo) * radio);
  }
  const geometria = new THREE.ExtrudeGeometry(forma, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 4 });
  geometria.center();
  const estrella = new THREE.Mesh(geometria, new THREE.MeshPhysicalMaterial({
    color: '#e8c28e', metalness: 1, roughness: 0.18, clearcoat: 1, emissive: '#c5908e', emissiveIntensity: 0.25,
  }));
  estrella.position.set(0, 1.15, 1);
  estrella.scale.setScalar(0.7);
  return estrella;
}

// Tapita dorada y argolla sobre cada perla que orbita: se vuelven esferas de árbol
function crearTapa(radio) {
  const dorado = new THREE.MeshPhysicalMaterial({ color: '#e8c28e', metalness: 1, roughness: 0.25 });
  const tapa = new THREE.Group();
  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(radio * 0.32, radio * 0.36, radio * 0.32, 24), dorado);
  cuello.position.y = radio * 0.98;
  const argolla = new THREE.Mesh(new THREE.TorusGeometry(radio * 0.18, radio * 0.05, 12, 24), dorado);
  argolla.position.y = radio * 1.3;
  tapa.add(cuello, argolla);
  return tapa;
}

export function iniciar(contenedor, { reducirMovimiento }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.opacity = '0';
  renderer.domElement.style.transition = 'opacity 1.4s ease';
  contenedor.append(renderer.domElement);

  const escena = new THREE.Scene();
  escena.environment = entornoDeEstudio(renderer);
  const camara = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camara.position.set(0, 0, 7.5);

  const uniforms = { uTiempo: { value: 0 } };

  // Perla líquida principal
  const material = new THREE.MeshPhysicalMaterial({
    color: '#e9a9ad', roughness: 0.1, metalness: 0.05,
    clearcoat: 1, clearcoatRoughness: 0.08,
    iridescence: 0.9, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 620],
    sheen: 1, sheenColor: new THREE.Color('#ffd0d8'), sheenRoughness: 0.4,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempo = uniforms.uTiempo;
    shader.vertexShader = `uniform float uTiempo;\n${RUIDO_GLSL}\n${shader.vertexShader}`
      .replace('#include <beginnormal_vertex>', `
        vec3 tangente = normalize(cross(normal, abs(normal.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
        vec3 bitangente = normalize(cross(normal, tangente));
        float e = 0.01;
        vec3 pA = position + normal * desplazar(position);
        vec3 pB = (position + tangente * e); pB += normalize(pB) * desplazar(pB);
        vec3 pC = (position + bitangente * e); pC += normalize(pC) * desplazar(pC);
        vec3 objectNormal = normalize(cross(pB - pA, pC - pA));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`)
      .replace('#include <begin_vertex>', 'vec3 transformed = position + normal * desplazar(position);');
  };
  const perla = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 96), material);
  escena.add(perla);

  // Perlas pequeñas que orbitan
  const oro = new THREE.MeshPhysicalMaterial({ color: '#c5908e', metalness: 1, roughness: 0.22, clearcoat: 0.6 });
  const nacar = new THREE.MeshPhysicalMaterial({ color: '#fff4f4', roughness: 0.12, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6 });
  const rubi = new THREE.MeshPhysicalMaterial({ color: '#c2405e', metalness: 0.4, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const orbitas = [
    { r: 0.22, mat: oro, radio: 2.5, vel: 0.35, fase: 0, alto: 0.6 },
    { r: 0.14, mat: nacar, radio: 2.2, vel: -0.5, fase: 2, alto: -0.9 },
    { r: 0.1, mat: oro, radio: 2.9, vel: 0.25, fase: 4, alto: 1.3 },
    { r: 0.18, mat: nacar, radio: 3.1, vel: -0.2, fase: 5.2, alto: -0.2 },
  ].map((o) => {
    const grupo = new THREE.Group();
    const esfera = new THREE.Mesh(new THREE.SphereGeometry(o.r, 48, 48), o.mat);
    const tapa = crearTapa(o.r);
    tapa.visible = false;
    grupo.add(esfera, tapa);
    escena.add(grupo);
    return { ...o, malla: grupo, esfera, tapa };
  });

  // Decoración navideña: se agrega o se quita sin recargar la escena
  const navidad = { activa: false, nieve: crearNieve(reducirMovimiento ? 160 : 420), estrella: crearEstrella() };
  function ponerNavidad(activa) {
    navidad.activa = activa;
    escena[activa ? 'add' : 'remove'](navidad.nieve.puntos, navidad.estrella);
    orbitas.forEach((o, i) => {
      o.tapa.visible = activa;
      o.esfera.material = activa && i % 2 === 0 ? rubi : o.mat;
    });
    if (reducirMovimiento) cuadro();
  }

  const luzClave = new THREE.DirectionalLight('#ffffff', 1.6);
  luzClave.position.set(3, 4, 5);
  escena.add(luzClave, new THREE.AmbientLight('#ffe8ec', 0.4));

  // Tamaño y encuadre: a la derecha en escritorio, arriba en celular
  function ajustar() {
    const { clientWidth: w, clientHeight: h } = contenedor;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    const angosto = w / h < 1;
    perla.scale.setScalar(angosto ? 0.78 : 0.92);
    escena.position.x = angosto ? 0 : 0.75;
    escena.position.y = angosto ? 0.35 : 0;
  }
  ajustar();
  new ResizeObserver(ajustar).observe(contenedor);

  // Seguir el puntero con suavidad
  const puntero = { x: 0, y: 0 };
  const suave = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    puntero.x = (e.clientX / innerWidth) * 2 - 1;
    puntero.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  const reloj = new THREE.Clock();
  let anterior = 0;
  function cuadro() {
    const t = reloj.getElapsedTime();
    const dt = Math.min(t - anterior, 0.05);
    anterior = t;
    if (navidad.activa) {
      moverNieve(navidad.nieve, t, dt);
      navidad.nieve.puntos.rotation.y = suave.x * 0.15;
      navidad.estrella.rotation.y = Math.sin(t * 0.9) * 0.5;
      navidad.estrella.position.y = perla.position.y + perla.scale.y * 1.25 + Math.sin(t * 1.4) * 0.06;
      orbitas.forEach((o) => { o.malla.rotation.z = Math.sin(t * 1.2 + o.fase) * 0.25; });
    }
    uniforms.uTiempo.value = t;
    suave.x += (puntero.x - suave.x) * 0.04;
    suave.y += (puntero.y - suave.y) * 0.04;
    perla.rotation.y = t * 0.12 + suave.x * 0.5;
    perla.rotation.x = suave.y * 0.3;
    perla.position.y = Math.sin(t * 0.8) * 0.08;
    orbitas.forEach((o) => {
      const a = o.fase + t * o.vel;
      o.malla.position.set(Math.cos(a) * o.radio + suave.x * 0.3, o.alto + Math.sin(t * 0.9 + o.fase) * 0.15, Math.sin(a) * o.radio * 0.6);
    });
    camara.position.x = suave.x * 0.25;
    camara.position.y = -suave.y * 0.2;
    camara.lookAt(0, 0, 0);
    renderer.render(escena, camara);
  }

  const control = { navidad: ponerNavidad };
  if (reducirMovimiento) {
    cuadro();
    renderer.domElement.style.opacity = '1';
    return control;
  }

  // Solo anima cuando la portada está a la vista y la pestaña está activa
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(contenedor);
  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
    cuadro();
  });
  requestAnimationFrame(() => { renderer.domElement.style.opacity = '1'; });
  return control;
}
