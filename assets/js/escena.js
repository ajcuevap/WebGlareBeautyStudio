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
  const orbitas = [
    { r: 0.22, mat: oro, radio: 2.5, vel: 0.35, fase: 0, alto: 0.6 },
    { r: 0.14, mat: nacar, radio: 2.2, vel: -0.5, fase: 2, alto: -0.9 },
    { r: 0.1, mat: oro, radio: 2.9, vel: 0.25, fase: 4, alto: 1.3 },
    { r: 0.18, mat: nacar, radio: 3.1, vel: -0.2, fase: 5.2, alto: -0.2 },
  ].map((o) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(o.r, 48, 48), o.mat);
    escena.add(m);
    return { ...o, malla: m };
  });

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
  function cuadro() {
    const t = reloj.getElapsedTime();
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

  if (reducirMovimiento) {
    cuadro();
    renderer.domElement.style.opacity = '1';
    return;
  }

  // Solo anima cuando la portada está a la vista y la pestaña está activa
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(contenedor);
  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
    cuadro();
  });
  requestAnimationFrame(() => { renderer.domElement.style.opacity = '1'; });
}
