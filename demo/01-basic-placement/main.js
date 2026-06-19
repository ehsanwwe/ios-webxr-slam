import * as THREE from 'three';
import { WebARKit } from 'webarkit';

const status = document.getElementById('status');

const scene = new THREE.Scene();
const engine = new WebARKit({ scene });

status.innerHTML =
  'WebARKit loaded — Phase 0 scaffold. ' +
  'Engine.start() is not implemented yet. ' +
  '<a href="../">Back to demos</a>';

// Sanity check: the engine exists and exposes the expected surface.
console.info('WebARKit instance:', engine);
