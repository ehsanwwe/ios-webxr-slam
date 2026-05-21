// avatar-cam.js
import * as THREE from 'three';
THREE.Cache.enabled = true;

import {
    UI_BUTTON_NAMES,
    createLoaders,
    initEnvironment,
    loadSceneFinal,
    loadAvatar7,
    fixPoolpackMaterial,
    modifySceneMaterials,
    cacheSceneButtons,
} from './scene_assets.js';

import {
    createUiResources,
    createLoadingUI,
    createStatusUI,
    createVoiceChat,
} from './ui_voice.js';

// ----------------------
// Mode
// ----------------------
const MODE = {
    XR: 'xr',
    GYRO: 'gyro',
};

let runtimeMode = null;      // 'xr' | 'gyro'
let gyroModeActive = false;  // فقط برای fallback
let arSupported = false;

// iOS detection (best-effort)
const IS_IOS = (() => {
    const ua = navigator.userAgent || '';
    const iOSByUA = /iPad|iPhone|iPod/.test(ua);
    const iPadOS13Plus = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return iOSByUA || iPadOS13Plus;
})();

// ----------------------
// Basic setup
// ----------------------
let renderer, camera, scene;
let referenceSpace = null, reticle = null, isPlaced = false;

let loadingCompleted = false; // فقط بعد از لود Scene + Avatar = true
let uiStarted = false;        // فقط بعد از کلیک "شروع" روی Loading UI

let avatarRoot = null;
let avatarMixer = null;
let idleAction = null;
let talkAction = null;
let fps = 24;

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();

// ----------------------
// UI + Voice (module)
// ----------------------
const uiRes = createUiResources();

scene = new THREE.Scene();

// Canvas
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

// WebGL context (robust)
const gl =
    canvas.getContext('webgl2', { xrCompatible: true, alpha: true, antialias: true }) ||
    canvas.getContext('webgl', { alpha: true, antialias: true });

renderer = new THREE.WebGLRenderer({
    alpha: true,
    preserveDrawingBuffer: true,
    canvas,
    context: gl,
});
renderer.autoClear = false;

renderer.physicallyCorrectLights = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Camera
camera = new THREE.PerspectiveCamera(50, 1, 0.01, 2000);
camera.near = 0.01;
camera.matrixAutoUpdate = true;
camera.updateProjectionMatrix();
scene.add(camera);

// Audio listener
const listener = new THREE.AudioListener();
camera.add(listener);

// Loading UI + Status UI
const loadingUI = createLoadingUI(camera, {
    textureLoadingUI_BG: uiRes.textureLoadingUI_BG,
    textureLoadingUI_OK: uiRes.textureLoadingUI_OK,
    uiScale: 0.85,
});
const statusUI = createStatusUI(camera);

// Voice Chat
const voice = createVoiceChat(listener, camera, statusUI, {
    textureIconRecordIdle: uiRes.textureIconRecordIdle,
    textureIconRecordActive: uiRes.textureIconRecordActive,
    textureIconRecordClose: uiRes.textureIconRecordClose,
    textureIconRecordStop: uiRes.textureIconRecordStop,
    endpoint: '/voice-to-voice',
    language: 'fa',
    //startEnabled: true,
    onTalkStart: () => {
        if (avatarMixer && talkAction && idleAction) {
            idleAction.fadeOut(0.2);
            talkAction.reset().fadeIn(0.2).play();
        }
    },
    onTalkStop: () => {
        if (avatarMixer && talkAction && idleAction) {
            talkAction.fadeOut(0.2);
            idleAction.reset().fadeIn(0.2).play();
        }
    },
});

// ----------------------
// Scene & Loader
// ----------------------
const { gltfLoader, fbxLoader } = createLoaders({ dracoDecoderPath: '/temp/' });

// Root container (هم برای XR و هم برای iOS fallback)
const containerRoot = new THREE.Group();
containerRoot.name = 'containerRoot';

// Scene animation
let sceneFinalRoot = null, sceneMixer = null, sceneAction = null;
let sceneFinished = false;

// Shahrzad placeholders (مثل کد شما)
let shahrzadRoot = null, shahrzadMixer = null, shahrzadFixAction = null, shahrzadLoopAction = null;

// ----------------------
// XR / UI buttons in GLB
// ----------------------
let xrSession = null;
let inXR = false;

const SCENE_FPS = 24;
const UI_FRAME = 6170;
const UI_TIME = UI_FRAME / SCENE_FPS;

const HOME_URL = '/';

let uiBtns = {
    btn_home: null,
    btn_voice_chat: null,
    btn_tavana: null,
    btn_dara: null,
    btn_yara: null,
};

const playback = {
    mode: 'idle',
    endTime: 0,
    returnTime: UI_TIME,
    audioPending: null,
};

// ----------------------
// Drag / Move after placement (XR mode uses hit-test)
// ----------------------
let dragHitTestSource = null;
let dragOffsetReady = false;

function cancelHitSource(src) {
    try { src?.cancel?.(); } catch {}
}

let transientHitTestSource = null;
let isDragging = false;

let dragInputSource = null;
let dragFixedY = 0;

const lastTouchHitPos = new THREE.Vector3();
let lastTouchHitValid = false;

const dragOffset = new THREE.Vector3();
const _tmpV3 = new THREE.Vector3();

// ----------------------
// Two-finger rotate (XR mode)
// ----------------------
let gestureBlockSelect = false;

function normalizeRad(r) {
    while (r > Math.PI) r -= Math.PI * 2;
    while (r < -Math.PI) r += Math.PI * 2;
    return r;
}
const ROTATE_GAIN = 1.0;

const twoFinger = {
    active: false,
    startAngle: 0,
    startYaw: 0,
};

// ----------------------
// Environment lights
// ----------------------
initEnvironment(renderer, scene, {
    exrUrl: '/university_workshop_1k.exr',
    envMapIntensity: 1.5,
});

// ----------------------
// Preload external audio (Narration)
// ----------------------
const triggerAudio = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
let tts2Ready = false;

audioLoader.load('/Narration.mp3?cache=1', (buffer) => {
    triggerAudio.setBuffer(buffer);
    tts2Ready = true;
    console.log('✅ Narration.mp3 loaded');
});

// ----------------------
// Loading sequence
// ----------------------
let envProgress = 0;
let avatarProgress = 0;

(async () => {
    try {
        loadingUI.setVisible(true);
        loadingUI.setProgress(0, 0);

        const sceneRes = await loadSceneFinal(gltfLoader, {
            url: '/Scene_compressed.glb?cache=bb20',
            onProgress: (pct) => {
                envProgress = pct;
                loadingUI.setProgress(envProgress, avatarProgress);
            },
        });

        sceneFinalRoot = sceneRes.sceneFinalRoot;
        sceneMixer = sceneRes.sceneMixer;
        sceneAction = sceneRes.sceneAction;
        uiBtns = sceneRes.uiBtns;

        fixPoolpackMaterial(sceneFinalRoot);

        const avatarRes = await loadAvatar7(gltfLoader, {
            url: '/character.glb?cache=12',
            fps,
            sceneFinalRoot,
            onProgress: (pct) => {
                avatarProgress = pct;
                loadingUI.setProgress(envProgress, avatarProgress);
            },
        });

        avatarRoot = avatarRes.avatarRoot;
        avatarMixer = avatarRes.avatarMixer;
        idleAction = avatarRes.idleAction;
        talkAction = avatarRes.talkAction;

        envProgress = 100;
        avatarProgress = 100;
        loadingUI.setProgress(envProgress, avatarProgress);

        loadingCompleted = true;
        console.log('✅ Scene + Avatar loaded. Ready for start.');
    } catch (err) {
        console.error('Load error:', err);
        statusUI.show('خطای سرور');
    }
})();

// ----------------------
// Pre-XR render loop (gyro fallback هم از همین استفاده می‌کند)
// ----------------------
let statusLoopActive = true;

function renderStatusLoop() {
    requestAnimationFrame(renderStatusLoop);

    if (inXR || !statusLoopActive) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const dt = clock.getDelta();
    if (sceneMixer) sceneMixer.update(dt);
    if (avatarMixer) avatarMixer.update(dt);
    updatePlayback();

    // ✅ در حالت iOS/GYRO: چرخش سنسورها روی دوربین اعمال می‌شود
    if (gyroModeActive && sensorsEnabled && isPlaced && gyroHasTarget) {
        camera.quaternion.slerp(gyroCameraTargetQuat, GYRO_CAMERA_SMOOTHING);
        camera.updateMatrixWorld(true);
    }

    loadingUI.updateTransform(w, h);
    voice.updateLayout?.(w, h, { distance: 0.60 });
    renderer.render(scene, camera);
}
renderStatusLoop();

// ----------------------
// Helpers
// ----------------------
function getForwardRay(frame, inputSrc) {
    const p = frame.getPose(inputSrc.targetRaySpace, referenceSpace);
    if (!p) return null;

    const { orientation: o, position: pos } = p.transform;
    const origin = new THREE.Vector3(pos.x, pos.y, pos.z);
    const quat = new THREE.Quaternion(o.x, o.y, o.z, o.w);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);

    raycaster.set(origin, dir);
    return raycaster;
}

function getScreenRay(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera({ x: nx, y: ny }, camera);
    return raycaster;
}

function secFromFrame(frame) {
    return frame / SCENE_FPS;
}

function findNamedAncestor(obj) {
    let cur = obj;
    while (cur) {
        if (UI_BUTTON_NAMES.has(cur.name)) return cur;
        cur = cur.parent;
    }
    return null;
}

function stopAllAudio() {
    if (triggerAudio?.isPlaying) triggerAudio.stop();
    if (voice.isTTSPlaying()) voice.stopTTS();
}

async function goHomeAndExitXR() {
    try { if (xrSession) await xrSession.end(); } catch {}
    window.location.replace(HOME_URL);
}

// ----------------------
// Timeline playback
// ----------------------
function playSceneSegment(startFrame, endFrame) {
    if (!sceneMixer || !sceneAction) return;

    voice.disable();
    stopAllAudio();

    const startTime = secFromFrame(startFrame);
    const endTime = secFromFrame(endFrame);

    playback.mode = (startFrame === 0 && endFrame === UI_FRAME) ? 'intro' : 'segment';
    playback.endTime = endTime;
    playback.returnTime = UI_TIME;

    sceneAction.enabled = true;
    sceneAction.paused = false;
    sceneAction.setLoop(THREE.LoopOnce, 1);
    sceneAction.clampWhenFinished = false;
    sceneAction.reset();
    sceneAction.time = startTime;
    sceneAction.play();
    sceneMixer.update(0);

    const duration = Math.max(0, endTime - startTime);
    playback.audioPending = { offset: startTime, duration };

    if (avatarMixer && talkAction && idleAction) {
        idleAction.fadeOut(0.2);
        talkAction.reset().fadeIn(0.2).play();
    }
}

function finalizeSegment() {
    if (triggerAudio?.isPlaying) triggerAudio.stop();

    if (sceneAction) {
        sceneAction.paused = true;
        sceneAction.time = playback.returnTime;
        sceneMixer.update(0);
    }

    if (avatarMixer && talkAction && idleAction) {
        talkAction.fadeOut(0.2);
        idleAction.reset().fadeIn(0.2).play();
    }

    playback.mode = 'idle';
    playback.audioPending = null;
    sceneFinished = true;
}

function updatePlayback() {
    if (!sceneAction || !sceneMixer) return;

    if (playback.audioPending && tts2Ready && !triggerAudio.isPlaying) {
        triggerAudio.offset = playback.audioPending.offset;
        triggerAudio.duration = playback.audioPending.duration;
        triggerAudio.play();
        playback.audioPending = null;
    }

    if (playback.mode !== 'idle') {
        if (sceneAction.time >= playback.endTime) finalizeSegment();
    }
}

// ----------------------
// Placement handler (XR)
// ----------------------
function onSelect(evt) {
    if (!loadingCompleted) return;
    if (!uiStarted) return;
    if (isPlaced || !reticle?.visible) return;

    isPlaced = true;
    reticle.visible = false;

    containerRoot.position.copy(reticle.position);
    containerRoot.rotation.copy(reticle.rotation);

    if (!containerRoot.parent) scene.add(containerRoot);

    if (sceneFinalRoot) {
        sceneFinalRoot.scale.set(0.05, 0.05, 0.05);
        containerRoot.add(sceneFinalRoot);

        fixPoolpackMaterial(sceneFinalRoot);
        modifySceneMaterials(sceneFinalRoot, { hairTextureUrl: '/hair.png' });

        uiBtns = cacheSceneButtons(sceneFinalRoot);
    } else {
        console.warn('⚠️ Scene_Final root not ready at placement');
        return;
    }

    if (sceneMixer && sceneAction) {
        sceneFinished = false;
        voice.disable();
        playSceneSegment(0, UI_FRAME);
    } else {
        console.warn('⚠️ No animation found / mixer missing.');
    }
}

// ----------------------
// Placement handler (GYRO fallback)
// - شیء ثابت می‌ماند و چرخش سنسورها روی دوربین می‌رود
// ----------------------
const GYRO_OBJECT_Z = -14.5; // ✅ فاصله‌ی ثابت جلوی دوربین

function placeGyroIfNeeded() {
    if (runtimeMode !== MODE.GYRO) return;
    if (!loadingCompleted) return;
    if (!uiStarted) return;
    if (isPlaced) return;

    isPlaced = true;

    // دوربین در مبدأ؛ چرخش از سنسورها می‌آید
    camera.matrixAutoUpdate = true;
    camera.position.set(0, 0, 0);
    camera.quaternion.identity();
    camera.updateMatrixWorld(true);

    // ✅ کالیبراسیون: در لحظه Place، جهت فعلی گوشی = “رو به جلو”
    resetGyroCameraCalibration();

    // add root
    if (!containerRoot.parent) scene.add(containerRoot);

    // ✅ آبجکت دقیقاً جلوی دوربین
    containerRoot.position.set(0, -1.7, GYRO_OBJECT_Z);
    containerRoot.rotation.set(0.30, 0, 0);

    // attach scene
    if (sceneFinalRoot && !containerRoot.children.includes(sceneFinalRoot)) {
        sceneFinalRoot.scale.set(0.4, 0.4, 0.4);
        containerRoot.add(sceneFinalRoot);

        fixPoolpackMaterial(sceneFinalRoot);
        modifySceneMaterials(sceneFinalRoot, { hairTextureUrl: '/hair.png' });

        uiBtns = cacheSceneButtons(sceneFinalRoot);
    }

    if (sceneMixer && sceneAction) {
        sceneFinished = false;
        voice.disable();
        playSceneSegment(0, UI_FRAME);
    }
}

// ----------------------
// Unified selection logic (works with a raycaster)
// ----------------------
function handleSelectStartWithRay(ray) {
    // 1) Loading UI start button
    if (!uiStarted) {
        if (!loadingCompleted || !loadingUI.isReady()) return true;

        const hit = ray.intersectObject(loadingUI.getBottomMesh(), true);
        if (hit.length > 0) {
            uiStarted = true;
            loadingUI.setVisible(false);
            statusUI.hide();
        }
        return true;
    }

    // اگر gyro mode است و هنوز place نشده: اولین لمس بعد از start → place
    if (runtimeMode === MODE.GYRO && !isPlaced) {
        placeGyroIfNeeded();
        return true;
    }

    // 2) Voice UI (Stop / Close / Record)
    if (voice.handleSelectStart(ray, { playbackMode: playback.mode })) return true;

    // 3) GLB UI Buttons
    if (isPlaced && sceneFinalRoot) {
        if (!uiBtns.btn_home) uiBtns = cacheSceneButtons(sceneFinalRoot);

        const candidates = Object.values(uiBtns).filter(Boolean);
        if (candidates.length) {
            const hits = ray.intersectObjects(candidates, true);
            if (hits.length) {
                const btn = findNamedAncestor(hits[0].object);
                if (btn) {
                    if (btn.name === 'btn_home') {
                        goHomeAndExitXR();
                        return true;
                    }

                    if (btn.name === 'btn_voice_chat') {
                        if (sceneAction && Math.abs(sceneAction.time - UI_TIME) < 0.25) voice.toggle();
                        else { finalizeSegment(); voice.toggle(); }
                        return true;
                    }

                    if (btn.name === 'btn_tavana' || btn.name === 'btn_dara' || btn.name === 'btn_yara') {
                        const segments = {
                            btn_tavana: { start: 700, end: 3007 },
                            btn_dara: { start: 3025, end: 5352 },
                            btn_yara: { start: 4160, end: 4770 },
                        };

                        const seg = segments[btn.name];
                        if (seg) playSceneSegment(seg.start, seg.end);
                        else console.warn('⚠️ Segment not defined for', btn.name);
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

function handleSelectEndUnified() {
    voice.handleSelectEnd();
}

// ----------------------
// Tap interactions (XR events)
// ----------------------
function onSelectStart(evt) {
    if (gestureBlockSelect) return;

    const ray = getForwardRay(evt.frame, evt.inputSource);
    if (!ray) return;

    if (handleSelectStartWithRay(ray)) return;

    // 4) Start Drag (XR only)
    if (isPlaced && !isDragging) {
        if (voice.isHitUI(ray)) return;

        if (sceneFinalRoot) {
            const candidates = Object.values(uiBtns).filter(Boolean);
            if (candidates.length) {
                const hits = ray.intersectObjects(candidates, true);
                if (hits.length) {
                    const btn = findNamedAncestor(hits[0].object);
                    if (btn) return;
                }
            }
        }

        isDragging = true;
        dragInputSource = evt.inputSource;
        dragFixedY = containerRoot.position.y;
        dragOffsetReady = false;

        cancelHitSource(dragHitTestSource);
        dragHitTestSource = null;

        if (xrSession && evt.inputSource?.targetRaySpace) {
            xrSession.requestHitTestSource({ space: evt.inputSource.targetRaySpace })
                .then((src) => { dragHitTestSource = src; })
                .catch((err) => console.warn('dragHitTestSource failed:', err));
        }
        return;
    }

    // 5) Tap on Shahrzad (اگر دارید)
    if (sceneFinished && shahrzadRoot) {
        const shHits = ray.intersectObject(shahrzadRoot, true);
        if (shHits.length > 0) {
            if (shahrzadLoopAction) shahrzadLoopAction.stop();
            if (shahrzadFixAction) shahrzadFixAction.stop();

            shahrzadRoot.visible = false;
            voice.disable();
            sceneFinished = false;

            if (sceneAction) {
                sceneAction.enabled = true;
                sceneAction.reset().play();
            }

            const onSceneReplayEnd = () => {
                sceneMixer.removeEventListener('finished', onSceneReplayEnd);
                sceneFinished = true;
                shahrzadRoot.visible = true;

                if (shahrzadFixAction) { shahrzadFixAction.enabled = true; shahrzadFixAction.reset().play(); }
                if (shahrzadLoopAction) shahrzadLoopAction.enabled = true;

                voice.enable();
            };
            sceneMixer.addEventListener('finished', onSceneReplayEnd);
        }
    }
}

function onSelectEnd(evt) {
    if (gestureBlockSelect) return;

    if (isDragging && evt.inputSource === dragInputSource) {
        isDragging = false;
        dragInputSource = null;

        cancelHitSource(dragHitTestSource);
        dragHitTestSource = null;
        dragOffsetReady = false;
        return;
    }

    handleSelectEndUnified();
}

// ----------------------
// XR activation (بدون تغییر)
// ----------------------
async function activateXR() {
    runtimeMode = MODE.XR;

    voice.ensureButtons();

    if (!reticle) {
        gltfLoader.load(
            '/assets/retail.gltf?a4',
            (gltf) => {
                reticle = gltf.scene;
                reticle.visible = false;
                scene.add(reticle);
            },
            undefined,
            console.error,
        );
    }

    let session;
    try {
        session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test'],
        });
    } catch (e1) {
        console.warn('requestSession(required hit-test) failed:', e1);
        session = await navigator.xr.requestSession('immersive-ar', {
            optionalFeatures: ['hit-test'],
        });
    }

    xrSession = session;
    inXR = true;
    statusLoopActive = false;

    camera.matrixAutoUpdate = false;

    session.addEventListener('end', () => {
        inXR = false;
        statusLoopActive = true;

        console.log('🛑 XR session ended.');

        try { cancelHitSource(dragHitTestSource); } catch {}
        dragHitTestSource = null;

        if (triggerAudio.isPlaying) triggerAudio.stop();
        if (voice.isTTSPlaying()) voice.stopTTS();

        xrSession = null;
        playback.mode = 'idle';
        playback.audioPending = null;
        voice.disable();
    });

    if (gl.makeXRCompatible) {
        try { await gl.makeXRCompatible(); } catch (e) { console.warn('makeXRCompatible failed:', e); }
    }

    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

    referenceSpace = await session.requestReferenceSpace('local');
    const viewerSpace = await session.requestReferenceSpace('viewer');

    transientHitTestSource = null;
    try {
        transientHitTestSource = await session.requestHitTestSourceForTransientInput({ profile: 'generic-touchscreen' });
        console.log('✅ transientHitTestSource ready');
    } catch (e) {
        console.warn('⚠️ Transient hit-test not supported:', e);
    }

    let hitTestSource = null;
    try {
        hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    } catch (e) {
        console.warn('Hit-test source not available:', e);
        statusUI.show('Hit-test not available (no reticle).');
    }

    session.addEventListener('select', onSelect);
    session.addEventListener('selectstart', onSelectStart);
    session.addEventListener('selectend', onSelectEnd);

    const tick = (time, frame) => {
        session.requestAnimationFrame(tick);

        const delta = clock.getDelta();
        if (sceneMixer) sceneMixer.update(delta);
        if (avatarMixer) avatarMixer.update(delta);

        updatePlayback();

        gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);

        const baseLayer = session.renderState.baseLayer;
        const fbw = baseLayer.framebufferWidth;
        const fbh = baseLayer.framebufferHeight;

        const pose = frame.getViewerPose(referenceSpace);

        if (pose && pose.views && pose.views.length > 0) {
            const view = pose.views[0];
            const vp = baseLayer.getViewport(view);

            renderer.setViewport(vp.x, vp.y, vp.width, vp.height);
            renderer.setScissor(vp.x, vp.y, vp.width, vp.height);
            renderer.setScissorTest(true);

            camera.matrix.fromArray(view.transform.matrix);
            camera.projectionMatrix.fromArray(view.projectionMatrix);
            camera.updateMatrixWorld(true);

            voice.updateLayout?.(vp.width, vp.height, { distance: 0.50 }); // XR همان 0.5 قبلی

            loadingUI.updateTransform(vp.width, vp.height);

            // Reticle
            if (hitTestSource) {
                const hits = frame.getHitTestResults(hitTestSource);
                if (!isPlaced && hits.length > 0 && reticle && loadingCompleted && uiStarted) {
                    const hp = hits[0].getPose(referenceSpace);
                    reticle.visible = true;
                    reticle.position.set(hp.transform.position.x, hp.transform.position.y, hp.transform.position.z);
                    reticle.rotation.y = Math.atan2(
                        camera.position.x - reticle.position.x,
                        camera.position.z - reticle.position.z,
                    );
                    reticle.updateMatrixWorld(true);
                } else if (reticle) {
                    reticle.visible = false;
                }
            } else {
                if (reticle) reticle.visible = false;
            }

            // Drag/Rotate
            lastTouchHitValid = false;

            // Two-finger rotate
            let twoFingerMode = false;
            let p1 = null, p2 = null;

            if (transientHitTestSource && isPlaced) {
                const trs = frame.getHitTestResultsForTransientInput(transientHitTestSource);

                const pts = [];
                for (const tr of trs) {
                    if (tr.results && tr.results.length > 0) {
                        const hp = tr.results[0].getPose(referenceSpace);
                        if (hp) {
                            pts.push(new THREE.Vector3(
                                hp.transform.position.x,
                                hp.transform.position.y,
                                hp.transform.position.z,
                            ));
                        }
                    }
                    if (pts.length >= 2) break;
                }

                if (pts.length >= 2) {
                    twoFingerMode = true;
                    p1 = pts[0];
                    p2 = pts[1];
                }
            }

            if (twoFingerMode) {
                gestureBlockSelect = true;

                if (isDragging) {
                    isDragging = false;
                    dragInputSource = null;
                    dragOffsetReady = false;
                    cancelHitSource(dragHitTestSource);
                    dragHitTestSource = null;
                }

                const angNow = Math.atan2(p2.z - p1.z, p2.x - p1.x);

                if (!twoFinger.active) {
                    twoFinger.active = true;
                    twoFinger.startAngle = angNow;
                    twoFinger.startYaw = containerRoot.rotation.y;
                } else {
                    const deltaYaw = normalizeRad(angNow - twoFinger.startAngle);
                    containerRoot.rotation.y = twoFinger.startYaw + deltaYaw * ROTATE_GAIN;
                    containerRoot.updateMatrixWorld(true);
                }
            } else {
                if (twoFinger.active) twoFinger.active = false;
                gestureBlockSelect = false;

                // Drag hit update
                if (isDragging && dragHitTestSource) {
                    const hits = frame.getHitTestResults(dragHitTestSource);
                    if (hits && hits.length > 0) {
                        const hp = hits[0].getPose(referenceSpace);
                        if (hp) {
                            lastTouchHitPos.set(hp.transform.position.x, hp.transform.position.y, hp.transform.position.z);
                            lastTouchHitValid = true;
                        }
                    }
                }

                // fallback single touch transient
                if (!lastTouchHitValid && transientHitTestSource) {
                    const transientResults = frame.getHitTestResultsForTransientInput(transientHitTestSource);
                    if (transientResults && transientResults.length > 0) {
                        const tr = transientResults[0];
                        if (tr.results && tr.results.length > 0) {
                            const hp = tr.results[0].getPose(referenceSpace);
                            if (hp) {
                                lastTouchHitPos.set(hp.transform.position.x, hp.transform.position.y, hp.transform.position.z);
                                lastTouchHitValid = true;
                            }
                        }
                    }
                }

                // Drag update
                if (isDragging && isPlaced && lastTouchHitValid) {
                    if (!dragOffsetReady) {
                        _tmpV3.set(lastTouchHitPos.x, dragFixedY, lastTouchHitPos.z);
                        dragOffset.copy(containerRoot.position).sub(_tmpV3);
                        dragOffsetReady = true;
                    }

                    _tmpV3.set(lastTouchHitPos.x, dragFixedY, lastTouchHitPos.z);
                    containerRoot.position.set(
                        _tmpV3.x + dragOffset.x,
                        dragFixedY,
                        _tmpV3.z + dragOffset.z,
                    );
                }
            }

            renderer.render(scene, camera);
        } else {
            renderer.setViewport(0, 0, fbw, fbh);
            renderer.setScissor(0, 0, fbw, fbh);
            renderer.setScissorTest(true);

            camera.aspect = fbw / fbh;
            camera.updateProjectionMatrix();

            loadingUI.updateTransform(fbw, fbh);
            renderer.render(scene, camera);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    session.requestAnimationFrame(tick);
}

// ----------------------
// GYRO fallback: camera video under canvas + pointer interactions
// ----------------------
let videoEl = null;
let cameraStream = null;

function ensureOverlayLayout() {
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '10';
    canvas.style.touchAction = 'none';
}

function ensureVideoElement() {
    if (videoEl) return videoEl;

    videoEl = document.createElement('video');
    videoEl.setAttribute('playsinline', 'true');
    videoEl.setAttribute('webkit-playsinline', 'true');
    videoEl.autoplay = true;
    videoEl.muted = true;

    videoEl.style.position = 'fixed';
    videoEl.style.top = '0';
    videoEl.style.left = '0';
    videoEl.style.width = '100%';
    videoEl.style.height = '100%';
    videoEl.style.objectFit = 'cover';
    videoEl.style.zIndex = '0';

    document.body.appendChild(videoEl);
    return videoEl;
}

async function startCameraOverlay() {
    ensureOverlayLayout();
    const v = ensureVideoElement();

    if (cameraStream) return;

    const constraints = {
        video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
        },
        audio: false,
    };

    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    v.srcObject = cameraStream;

    try { await v.play(); } catch {}
}

function stopCameraOverlay() {
    try {
        cameraStream?.getTracks?.().forEach((t) => t.stop());
    } catch {}
    cameraStream = null;
}

// Pointer-based interactions for gyro mode
const pointers = new Map(); // id -> {x,y}
let gyroDragging = false;
let gyroDragId = null;
let dragStart = { x: 0, y: 0 };
let objectPosAtDragStart = new THREE.Vector3();

let gyroTwoFingerActive = false;
let gyroTwoFingerStartAngle = 0;
let gyroTwoFingerStartYaw = 0;

// drag sensitivity (screen pixels -> world)
const DRAG_SENS_X = 0.006;
const DRAG_SENS_Y = 0.006;

function attachGyroPointerHandlers() {
    if (canvas.__gyroHandlersAttached) return;
    canvas.__gyroHandlersAttached = true;

    canvas.addEventListener('pointerdown', (e) => {
        if (runtimeMode !== MODE.GYRO) return;

        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        canvas.setPointerCapture?.(e.pointerId);

        if (pointers.size === 2 && isPlaced) {
            gyroTwoFingerActive = true;

            const pts = [...pointers.values()];
            const ang = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
            gyroTwoFingerStartAngle = ang;
            gyroTwoFingerStartYaw = containerRoot.rotation.y;

            gyroDragging = false;
            gyroDragId = null;
            return;
        }

        const ray = getScreenRay(e.clientX, e.clientY);
        const consumed = handleSelectStartWithRay(ray);
        if (consumed) return;

        if (isPlaced && !gyroTwoFingerActive) {
            gyroDragging = true;
            gyroDragId = e.pointerId;
            dragStart.x = e.clientX;
            dragStart.y = e.clientY;
            objectPosAtDragStart.copy(containerRoot.position);
        }
    }, { passive: false });

    canvas.addEventListener('pointermove', (e) => {
        if (runtimeMode !== MODE.GYRO) return;
        if (!pointers.has(e.pointerId)) return;

        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (!isPlaced) return;

        // two-finger rotate object
        if (pointers.size >= 2) {
            gyroTwoFingerActive = true;
            const pts = [...pointers.values()].slice(0, 2);
            const ang = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
            const dYaw = normalizeRad(ang - gyroTwoFingerStartAngle);
            containerRoot.rotation.y = gyroTwoFingerStartYaw + dYaw * ROTATE_GAIN;
            return;
        }

        // single-finger drag object (X / Z)
        if (gyroDragging && gyroDragId === e.pointerId) {
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;

            containerRoot.position.x = objectPosAtDragStart.x + dx * DRAG_SENS_X;
            containerRoot.position.z = objectPosAtDragStart.z + dy * DRAG_SENS_Y;

            // اگر خواستید فاصله همیشه -2.5 بماند، این خط را فعال کنید:
            // containerRoot.position.z = GYRO_OBJECT_Z;

            // Y ثابت
            containerRoot.position.y = objectPosAtDragStart.y;
        }
    }, { passive: false });

    canvas.addEventListener('pointerup', (e) => {
        if (runtimeMode !== MODE.GYRO) return;

        pointers.delete(e.pointerId);

        if (gyroDragging && gyroDragId === e.pointerId) {
            gyroDragging = false;
            gyroDragId = null;
        }

        if (pointers.size < 2) {
            gyroTwoFingerActive = false;
        }

        handleSelectEndUnified();
    }, { passive: false });

    canvas.addEventListener('pointercancel', (e) => {
        if (runtimeMode !== MODE.GYRO) return;

        pointers.delete(e.pointerId);
        gyroDragging = false;
        gyroDragId = null;
        gyroTwoFingerActive = false;

        handleSelectEndUnified();
    }, { passive: false });
}

async function activateGyroMode() {
    runtimeMode = MODE.GYRO;
    gyroModeActive = true;

    voice.ensureButtons();

    await startCameraOverlay();

    inXR = false;
    statusLoopActive = true;
    camera.matrixAutoUpdate = true;

    attachGyroPointerHandlers();
}

// ----------------------
// iOS Sensors: apply rotation to CAMERA (نه آبجکت)
// ----------------------
let sensorsEnabled = false;

// smoothing
const GYRO_CAMERA_SMOOTHING = 0.18;

// device orientation mapping (Three.js DeviceOrientationControls-style)
const _zee = new THREE.Vector3(0, 0, 1);
const _euler = new THREE.Euler();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X
const _qDevice = new THREE.Quaternion();
const _qRel = new THREE.Quaternion();

let gyroInitialInvQuat = null;        // inverse(initialDeviceQuat)
let gyroCameraTargetQuat = new THREE.Quaternion();
let gyroHasTarget = false;

function getScreenOrientRad() {
    const angle =
        (screen.orientation && typeof screen.orientation.angle === 'number')
            ? screen.orientation.angle
            : (typeof window.orientation === 'number' ? window.orientation : 0);
    return THREE.MathUtils.degToRad(angle || 0);
}

function computeDeviceQuat(alphaDeg, betaDeg, gammaDeg, screenOrientRad) {
    const alpha = THREE.MathUtils.degToRad(alphaDeg || 0); // Z
    const beta  = THREE.MathUtils.degToRad(betaDeg  || 0); // X'
    const gamma = THREE.MathUtils.degToRad(gammaDeg || 0); // Y''

    // same as DeviceOrientationControls:
    // euler.set(beta, alpha, -gamma, 'YXZ');
    _euler.set(beta, alpha, -gamma, 'YXZ');
    _qDevice.setFromEuler(_euler);

    // camera looks out the back of the device: multiply by -PI/2 around X
    _qDevice.multiply(_q1);

    // adjust for screen orientation
    _qDevice.multiply(_q0.setFromAxisAngle(_zee, -screenOrientRad));

    return _qDevice;
}

function resetGyroCameraCalibration() {
    gyroInitialInvQuat = null;
    gyroHasTarget = false;
    gyroCameraTargetQuat.identity();
    camera.quaternion.identity();
    camera.updateMatrixWorld(true);
}

// event handler
function onDeviceOrientation(e) {
    if (!gyroModeActive || !sensorsEnabled) return;
    if (e.alpha == null || e.beta == null || e.gamma == null) return;

    const orient = getScreenOrientRad();
    const qNow = computeDeviceQuat(e.alpha, e.beta, e.gamma, orient).clone();

    // calibration at first valid sample (after reset)
    if (!gyroInitialInvQuat) {
        gyroInitialInvQuat = qNow.clone().invert();
    }

    // relative rotation: qRel = qNow * inv(qInitial)
    _qRel.copy(qNow).multiply(gyroInitialInvQuat);

    gyroCameraTargetQuat.copy(_qRel);
    gyroHasTarget = true;
}

// permission + listeners
let sensorListenersAttached = false;

async function requestSensorPermission() {
    // iOS: must be called in a user gesture (your APP_START_GESTURE is OK)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        const res = await DeviceMotionEvent.requestPermission();
        if (res !== 'granted') throw new Error('DeviceMotion permission not granted');
    }

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') throw new Error('DeviceOrientation permission not granted');
    }
}

function attachSensorListenersOnce() {
    if (sensorListenersAttached) return;
    sensorListenersAttached = true;

    window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true });
    window.addEventListener('deviceorientationabsolute', onDeviceOrientation, { passive: true });
}

async function ensureAllPermissionsForStart() {
    try {
        await requestSensorPermission();
        attachSensorListenersOnce();
        sensorsEnabled = true;

        // ✅ هر بار Start: کالیبراسیون صفر شود تا “جهت فعلی” مبنا شود
        resetGyroCameraCalibration();
    } catch (e) {
        console.warn('Sensor permission denied/unavailable:', e);
        sensorsEnabled = false;
    }
}

// ----------------------
// Support check + start binding
// ----------------------
if (navigator.xr) {
    navigator.xr.isSessionSupported('immersive-ar')
        .then((v) => {
            arSupported = v;
            console.log('immersive-ar supported:', v);
        })
        .catch((err) => console.warn('isSessionSupported error:', err));
}

// Start signal (from your page)
window.addEventListener('APP_START_GESTURE', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('MediaDevices/getUserMedia not available');
        return;
    }

    await ensureAllPermissionsForStart();

    if (navigator.xr && arSupported) {
        activateXR().catch((err) => {
            console.error('activateXR failed:', err);
            statusUI.show(`XR start failed: ${err.name}`);
        });
        return;
    }

    try {
        await activateGyroMode();
        // statusUI.show('در حال آماده‌سازی حالت iOS…');
        setTimeout(() => statusUI.hide(), 800);
    } catch (e) {
        console.error(e);
        statusUI.show('دسترسی دوربین/سنسور برقرار نشد');
    }
});
