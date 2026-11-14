// Otoczenie do odbić (PMREM): niebo z gradientem, jasne słońce i ciemniejszy grunt — metal i guma mają w czym się odbijać.
import * as THREE from '../../vendor/three/three.module.js';

export function createEnvironment(renderer, { sunDir = new THREE.Vector3(0.5, 0.8, 0.3) } = {}) {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 64, 32);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { sun: { value: sunDir.clone().normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vD; uniform vec3 sun;
      void main(){
        float h = vD.y;
        vec3 sky = mix(vec3(0.62,0.70,0.80), vec3(0.28,0.42,0.65), smoothstep(0.0,0.7,h));
        vec3 ground = mix(vec3(0.36,0.33,0.29), vec3(0.18,0.16,0.14), smoothstep(0.0,-0.6,h));
        vec3 c = h > 0.0 ? sky : ground;
        c = mix(c, vec3(0.75,0.72,0.66), exp(-abs(h)*14.0)*0.6);   // jasny horyzont
        float sd = max(dot(vD, sun), 0.0);
        c += vec3(1.0,0.93,0.8) * (pow(sd, 900.0) * 40.0 + pow(sd, 12.0) * 0.4);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  s.add(new THREE.Mesh(geo, mat));
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.02);
  pm.dispose(); geo.dispose(); mat.dispose();
  return rt.texture;
}
