/* ============================================
   tracking.js – MediaPipe Pose & Hands Setup
   ============================================ */

const Tracking = (() => {
  let pose = null;
  let hands = null;
  let webcamStream = null;
  let poseCamera = null;
  let handsCamera = null;
  let isInitialized = false;

  // Latest results
  let latestPoseLandmarks = null;
  let latestHandResults = null;

  async function init() {
    try {
      // Request webcam
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });

      const webcamEl = document.getElementById('webcam');
      webcamEl.srcObject = webcamStream;

      const miniEl = document.getElementById('webcamMini');
      miniEl.srcObject = webcamStream;

      // Show webcam preview
      document.getElementById('webcamPreview').style.display = 'block';

      // Initialize MediaPipe Pose
      pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onPoseResults);

      // Initialize MediaPipe Hands
      hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onHandsResults);

      // Start camera feeds for both
      // We use a single Camera utility that sends frames to both models
      poseCamera = new Camera(webcamEl, {
        onFrame: async () => {
          if (pose) await pose.send({ image: webcamEl });
          if (hands) await hands.send({ image: webcamEl });
        },
        width: 640,
        height: 480,
      });

      await poseCamera.start();
      isInitialized = true;

      // Update tracking status
      const statusEl = document.getElementById('trackingStatus');
      statusEl.textContent = 'TRACKING: ON';
      statusEl.classList.add('active');

      console.log('[Tracking] Initialized successfully');
    } catch (err) {
      console.error('[Tracking] Init failed:', err);
      // Show error but don't block the game
      const statusEl = document.getElementById('trackingStatus');
      statusEl.textContent = 'TRACKING: ERROR';
    }
  }

  function onPoseResults(results) {
    if (results.poseLandmarks) {
      latestPoseLandmarks = results.poseLandmarks;
    }
  }

  function onHandsResults(results) {
    latestHandResults = results;
  }

  function getPoseLandmarks() {
    return latestPoseLandmarks;
  }

  function getHandResults() {
    return latestHandResults;
  }

  function stop() {
    if (poseCamera) poseCamera.stop();
    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
    }
    isInitialized = false;
  }

  return {
    init,
    stop,
    getPoseLandmarks,
    getHandResults,
    get isInitialized() { return isInitialized; },
  };
})();
