// Renderer gry: WebGL, ACES, cienie z jednego słońca (mapa cieni idzie za graczem), odbicia z PMREM, niebo, mgła.
import * as THREE from '../../vendor/three/three.module.js';
import { createEnvironment } from './env.js';
import { setAnisotropy } from './textures.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));
  const scene = new THREE.Scene();
  const sunDir = new THREE.Vector3(0.45, 0.75, 0.35).normalize();
  scene.environment = createEnvironment(renderer, { sunDir }); scene.environmentIntensity = 0.75;
  scene.fog = new THREE.Fog('#a9a69c', 60, 260);
  // niebo: sfera z gradientem (horyzont jasny, zenit niebieski), słońce
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { sun: { value: sunDir } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: `varying vec3 vD; uniform vec3 sun; void main(){ float h = max(vD.y, -0.1);
      vec3 c = mix(vec3(0.70,0.72,0.70), vec3(0.33,0.50,0.75), smoothstep(0.0, 0.55, h));
      float s = max(dot(vD, sun), 0.0); c += vec3(1.0,0.9,0.7) * (pow(s, 600.0) * 6.0 + pow(s, 8.0) * 0.25);
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
    }`,
  }));
  sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
  const sun = new THREE.DirectionalLight('#fff1dc', 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 160 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target, new THREE.HemisphereLight('#b9c7d6', '#5b4c3c', 0.45));
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 600);
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  /** Cienie wokół gracza (mapa cieni przesuwana skokami po 2 m — bez migotania krawędzi). */
  function followShadow(p) {
    const sx = Math.round(p.x / 2) * 2, sz = Math.round(p.z / 2) * 2;
    sun.target.position.set(sx, 0, sz); sun.position.set(sx + sunDir.x * 80, sunDir.y * 80, sz + sunDir.z * 80);
  }
  return { renderer, scene, camera, sun, sky, followShadow };
}
