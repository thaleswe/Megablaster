/* ============================================
   tracking.js – MediaPipe Pose & Hands Setup
   ============================================ */

const Tracking = (() => {
  let pose = null;
  let hands = null;
  let webcamStream = null;
  let trackingInterval = null;
  let isInitialized = false;
  let isProcessing = false;

  // Latest results
  let latestPoseLandmarks = null;
  let latestHandResults = null;

  // Throttle: ~15 FPS for tracking (66ms interval)
  const TRACKING_INTERVAL_MS = 66;

  async function init() {
    try {
      // Request webcam at lower resolution for performance
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user', frameRate: { ideal: 15, max: 20 } },
        audio: false,
      });

      const webcamEl = document.getElementById('webcam');
      webcamEl.srcObject = webcamStream;
      await webcamEl.play();

      const miniEl = document.getElementById('webcamMini');
      miniEl.srcObject = webcamStream;

      // Show webcam preview
      document.getElementById('webcamPreview').style.display = 'block';

      // Initialize MediaPipe Pose (lite model)
      pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 0,  // Lite model for speed
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onPoseResults);

      // Initialize MediaPipe Hands (lite model)
      hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 0,  // Lite model for speed
        minDetectionConfidence: 0.7,  // Higher threshold to reduce false positives
        minTrackingConfidence: 0.6,
      });

      hands.onResults(onHandsResults);

      // Use manual interval instead of Camera utility to control FPS
      trackingInterval = setInterval(() => {
        processFrame(webcamEl);
      }, TRACKING_INTERVAL_MS);

      isInitialized = true;

      // Update tracking status
      const statusEl = document.getElementById('trackingStatus');
      statusEl.textContent = 'TRACKING: ON';
      statusEl.classList.add('active');

      console.log('[Tracking] Initialized at ~15fps');
    } catch (err) {
      console.error('[Tracking] Init failed:', err);
      const statusEl = document.getElementById('trackingStatus');
      statusEl.textContent = 'TRACKING: ERROR';
    }
  }

  let frameCounter = 0;

  async function processFrame(videoEl) {
    // Skip if previous frame is still being processed
    if (isProcessing || videoEl.readyState < 2) return;
    isProcessing = true;
    try {
      // Alternate between pose and hands each frame to halve the load
      if (frameCounter % 2 === 0) {
        if (pose) await pose.send({ image: videoEl });
      } else {
        if (hands) await hands.send({ image: videoEl });
      }
      frameCounter++;
    } catch (e) {
      // Silently handle frame processing errors
    }
    isProcessing = false;
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
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }
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

