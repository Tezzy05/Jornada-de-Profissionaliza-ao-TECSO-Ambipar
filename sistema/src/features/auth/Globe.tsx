import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import { geoEquirectangular, geoPath } from 'd3-geo';
import landTopo from 'world-atlas/land-110m.json';

// Planeta em pontos (continentes reais do Natural Earth) com um anel de resíduos orbitando:
// as quatro cores da coleta seletiva brasileira (papel azul, plástico vermelho, vidro verde, metal amarelo)
// giram em ciclo ao redor da Terra, como na economia circular.

const LIME = new THREE.Color('#ccff00');
const LEAF = new THREE.Color('#7fae00');
const RESIDUOS = ['#2f6fd6', '#e0413a', '#2fa651', '#f2c21b'];

function landMask(w = 1024, h = 512) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.fillStyle = '#000';
  x.fillRect(0, 0, w, h);
  const proj = geoEquirectangular().scale(w / (2 * Math.PI)).translate([w / 2, h / 2]);
  const path = geoPath(proj, x);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const land = feature(landTopo as any, (landTopo as any).objects.land);
  x.fillStyle = '#fff';
  x.beginPath();
  path(land as never);
  x.fill();
  return x.getImageData(0, 0, w, h);
}

export default function Globe({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    const world = new THREE.Group();
    scene.add(world);
    const tilt = new THREE.Group();
    tilt.rotation.z = 0.32;
    tilt.rotation.x = 0.18;
    world.add(tilt);
    const globe = new THREE.Group();
    tilt.add(globe);

    // núcleo do planeta
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.ShaderMaterial({
        uniforms: { c1: { value: new THREE.Color('#5aa874') }, c2: { value: new THREE.Color('#bfe6b0') } },
        vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `uniform vec3 c1; uniform vec3 c2; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.-max(dot(vN,vV),0.),2.2); vec3 col=mix(c1,c2,f); gl_FragColor=vec4(col,1.); }`,
      }),
    );
    globe.add(core);

    // continentes em pontos
    const mask = landMask();
    const N = 22000;
    const pos: number[] = [];
    const tint: number[] = [];
    const seed: number[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      const px = Math.cos(th) * r;
      const pz = Math.sin(th) * r;
      const lat = Math.asin(y);
      const lon = Math.atan2(px, pz); // leste à direita, visto de fora
      const u = Math.floor(((lon + Math.PI) / (2 * Math.PI)) * mask.width) % mask.width;
      const v = Math.floor(((Math.PI / 2 - lat) / Math.PI) * mask.height);
      const land = mask.data[(Math.min(mask.height - 1, v) * mask.width + u) * 4] > 128;
      if (!land) continue;
      pos.push(px * 1.008, y * 1.008, pz * 1.008);
      const c = new THREE.Color('#1f5a2c').lerp(LEAF, Math.random() * 0.6);
      tint.push(c.r, c.g, c.b);
      seed.push(Math.random() * 6.28);
    }
    const dotsGeo = new THREE.BufferGeometry();
    dotsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    dotsGeo.setAttribute('tint', new THREE.Float32BufferAttribute(tint, 3));
    dotsGeo.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1));
    const dotsMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uSize: { value: 2.9 * renderer.getPixelRatio() } },
      vertexShader: `attribute vec3 tint; attribute float seed; uniform float uTime; uniform float uSize; varying vec3 vC; varying float vA;
        void main(){ vC=tint; vec4 mv=modelViewMatrix*vec4(position,1.); vec3 n=normalize(normalMatrix*position); vA=smoothstep(-.15,.35,dot(n,normalize(-mv.xyz)))*(.75+.25*sin(uTime*1.6+seed));
        gl_PointSize=uSize*(6.2/-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d=gl_PointCoord-.5; float r=length(d); if(r>.5) discard; gl_FragColor=vec4(vC, vA*smoothstep(.5,.2,r)); }`,
    });
    globe.add(new THREE.Points(dotsGeo, dotsMat));

    // atmosfera
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(1.22, 64, 64),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { c: { value: new THREE.Color('#b8f03a') } },
        vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `uniform vec3 c; varying vec3 vN; varying vec3 vV; void main(){ float d=dot(vN,vV); float i=pow(smoothstep(0.,.6,-d),3.); gl_FragColor=vec4(c, i*.55); }`,
      }),
    );
    tilt.add(atmo);

    // anel orbital (economia circular)
    const orbit = new THREE.Group();
    orbit.rotation.x = 1.2;
    orbit.rotation.y = -0.25;
    world.add(orbit);
    const R = 1.62;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(R, 0.004, 8, 220),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#3f7f1f'), transparent: true, opacity: 0.45 }),
    );
    orbit.add(ring);
    // três setas perseguindo umas às outras, como o símbolo da reciclagem
    const arrows: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color('#4c8a12') }));
      arrows.push(a);
      orbit.add(a);
    }
    // resíduos coloridos
    const residuos: { m: THREE.Mesh; a: number; r: number; s: number; y: number }[] = [];
    const geos = [new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.TetrahedronGeometry(0.045), new THREE.OctahedronGeometry(0.04), new THREE.IcosahedronGeometry(0.038)];
    for (let i = 0; i < 28; i++) {
      const col = RESIDUOS[i % 4];
      const m = new THREE.Mesh(geos[i % 4], new THREE.MeshBasicMaterial({ color: col }));
      const r = R + (Math.random() - 0.5) * 0.22;
      residuos.push({ m, a: (i / 28) * Math.PI * 2 + Math.random() * 0.1, r, s: 0.6 + Math.random() * 0.8, y: (Math.random() - 0.5) * 0.12 });
      orbit.add(m);
    }

    // estrelas
    const starGeo = new THREE.BufferGeometry();
    const sp: number[] = [];
    for (let i = 0; i < 700; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(14 + Math.random() * 18);
      sp.push(v.x, v.y, v.z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xd9f0c6, size: 0.05, transparent: true, opacity: 0.7 }));
    // fundo claro: sem estrelas

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // em telas largas o planeta fica à direita, ao lado do formulário
      // planeta centralizado, atrás do cartão de login
      const k = Math.min(1, w / h);
      world.position.set(0, 0, 0);
      world.scale.setScalar(Math.max(0.62, 1.12 * k));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const mouse = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX / window.innerWidth - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', onMove);

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      const t = clock.getElapsedTime();
      const k = reduce ? 0.15 : 1;
      globe.rotation.y = t * 0.06 * k + 0.55; // começa com o Brasil de frente
      dotsMat.uniforms.uTime.value = t;
      arrows.forEach((a, i) => {
        const ang = t * 0.45 * k + (i * Math.PI * 2) / 3;
        a.position.set(Math.cos(ang) * R, Math.sin(ang) * R, 0);
        a.rotation.z = ang; // aponta no sentido do movimento
      });
      residuos.forEach((p) => {
        const ang = p.a + t * 0.12 * p.s * k;
        p.m.position.set(Math.cos(ang) * p.r, Math.sin(ang) * p.r, p.y);
        p.m.rotation.x = t * p.s;
        p.m.rotation.y = t * p.s * 0.7;
      });
      stars.rotation.y = t * 0.004;
      world.rotation.y += (mouse.x * 0.35 - world.rotation.y) * 0.04;
      world.rotation.x += (mouse.y * 0.2 - world.rotation.x) * 0.04;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | undefined;
        mat?.dispose?.();
      });
      host.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} className={className} aria-hidden="true" />;
}
