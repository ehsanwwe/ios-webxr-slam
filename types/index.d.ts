declare module 'webarkit' {
  import type { Scene, PerspectiveCamera, WebGLRenderer, Object3D } from 'three';

  export type Mode = 'auto' | 'xr' | 'gyro';

  export interface Pose {
    position: [number, number, number];
    quaternion: [number, number, number, number];
  }

  export interface WebARKitOptions {
    scene: Scene;
    camera?: PerspectiveCamera;
    renderer?: WebGLRenderer;
    preferredMode?: Mode;
    onReady?: () => void;
    onPoseUpdate?: (pose: Pose) => void;
    onSurfaceDetected?: (plane: unknown) => void;
  }

  export class WebARKit {
    constructor(options: WebARKitOptions);
    start(): Promise<void>;
    stop(): void;
    dispose(): void;
    getPose(): Pose | null;
    getReticle(): Object3D | null;
    placeOnSurface(object: Object3D): void;
    enableDrag(object: Object3D): void;
    enableRotate(object: Object3D): void;
    on(event: 'pose-updated', handler: (pose: Pose) => void): () => void;
    on(event: 'surface-detected', handler: (plane: unknown) => void): () => void;
    on(event: 'mode-changed', handler: (mode: Mode) => void): () => void;
    on(event: string, handler: (payload: unknown) => void): () => void;
    off(event: string, handler: (payload: unknown) => void): void;
  }
}
