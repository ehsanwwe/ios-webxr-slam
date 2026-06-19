export { WebARKit, WebARKitError } from './core/WebARKit.js';
export { ModeRouter } from './core/ModeRouter.js';
export { GyroMode } from './modes/GyroMode.js';
export { GyroTracker } from './tracking/GyroTracker.js';
export { CameraOverlay } from './rendering/CameraOverlay.js';
export { GestureRecognizer } from './input/GestureRecognizer.js';
export {
  isIOS,
  hasGetUserMedia,
  getScreenOrientationRad,
} from './utils/platform.js';
export {
  requestSensorPermissions,
  PermissionDeniedError,
} from './utils/permissions.js';
export {
  deviceOrientationToQuat,
  quaternionAngle,
  normalizeRad,
} from './utils/math.js';
