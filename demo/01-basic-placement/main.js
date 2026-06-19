import * as THREE from 'three';
import { WebARKit } from 'webarkit';

const logEl = document.getElementById('log');
const log = (...args) => {
  const line = args
    .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ');
  logEl.textContent = `${line}\n${logEl.textContent}`.slice(0, 1200);
  // eslint-disable-next-line no-console
  console.log(...args);
};

// Three.js core
const scene = new THREE.Scene();
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.autoClear = false;

const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 2000);
scene.add(camera);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(1, 2, 1);
scene.add(dir);

// A placeholder container with a small marker — replace with your GLB.
const sceneRoot = new THREE.Group();
sceneRoot.name = 'sceneRoot';

const marker = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.5, 0.5),
  new THREE.MeshStandardMaterial({ color: 0x2ea1ff, roughness: 0.4 }),
);
marker.position.set(0, 0.25, 0);
sceneRoot.add(marker);

const grid = new THREE.GridHelper(4, 8, 0x888888, 0x444444);
sceneRoot.add(grid);

const kit = new WebARKit({
  renderer,
  camera,
  scene,
  canvas,
  sceneRoot,
});

kit.onPlace(() => log('placed — drag to move, two fingers to rotate'));

document.getElementById('start-btn').addEventListener('click', async () => {
  document.getElementById('start').remove();
  try {
    const mode = await kit.start();
    log(`started in mode: ${mode}`);
    log('tap once on the scene to place the marker');
  } catch (err) {
    log(`start failed: ${err.message}`);
  }
});
