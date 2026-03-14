/* ============================================
   controls.js – Translate Tracking → Game Input
   ============================================ */

const Controls = (() => {
  // Output state updated each frame
  const state = {
    leanAmount: 0,        // -1 (left) to +1 (right)
    headTiltX: 0,         // camera look offset X
    headTiltY: 0,         // camera look offset Y
    rightHandClosed: false,
    leftHandClosed: false,
    bothHandsRaised: false,
    // Transition tracking
    prevRightClosed: false,
    prevLeftClosed: false,
    rightJustOpened: false,
    leftJustOpened: false,
    bothJustRaised: false,
    prevBothRaised: false,
  };

  // Smoothing
  let smoothLean = 0;
  let smoothTiltX = 0;
  let smoothTiltY = 0;

  const LEAN_THRESHOLD = 0.03;     // Minimum shoulder tilt to register lean
  const HEAD_ONLY_THRESHOLD = 0.02; // Head tilt without body lean
  const LEAN_SMOOTHING = 0.15;
  const TILT_SMOOTHING = 0.1;
  const FINGER_CLOSED_THRESHOLD = 0.08; // Distance threshold for closed fist

  function update(dt) {
    const poseLandmarks = Tracking.getPoseLandmarks();
    const handResults = Tracking.getHandResults();

    // Store previous states
    state.prevRightClosed = state.rightHandClosed;
    state.prevLeftClosed = state.leftHandClosed;
    state.prevBothRaised = state.bothHandsRaised;

    // Process pose (body lean)
    if (poseLandmarks) {
      processPose(poseLandmarks);
    } else {
      // No pose: decay to neutral
      smoothLean *= 0.9;
      smoothTiltX *= 0.9;
      smoothTiltY *= 0.9;
    }

    // Process hands
    if (handResults && handResults.multiHandLandmarks && handResults.multiHandedness) {
      processHands(handResults);
    }

    // Detect transitions
    state.rightJustOpened = state.prevRightClosed && !state.rightHandClosed;
    state.leftJustOpened = state.prevLeftClosed && !state.leftHandClosed;
    state.bothJustRaised = !state.prevBothRaised && state.bothHandsRaised;

    // Apply smoothed values
    state.leanAmount = smoothLean;
    state.headTiltX = smoothTiltX;
    state.headTiltY = smoothTiltY;
  }

  function processPose(landmarks) {
    // Key landmarks:
    // 0: nose
    // 11: left shoulder, 12: right shoulder
    // 23: left hip, 24: right hip

    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    if (!leftShoulder || !rightShoulder || !nose) return;

    // Calculate shoulder midpoint
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;

    // Shoulder tilt (difference in Y of shoulders indicates lean)
    // Note: MediaPipe uses normalized coords, X is mirrored in selfie mode
    const shoulderDiffY = leftShoulder.y - rightShoulder.y;

    // Body lean from shoulder + hip alignment
    const hipMidX = (leftHip && rightHip) ?
      (leftHip.x + rightHip.x) / 2 : shoulderMidX;

    // Horizontal offset of shoulders relative to hips
    const bodyLean = shoulderMidX - hipMidX;

    // Combined lean (shoulder tilt + body offset)
    // Note: webcam is mirrored, so we invert
    let rawLean = 0;
    if (Math.abs(shoulderDiffY) > LEAN_THRESHOLD || Math.abs(bodyLean) > LEAN_THRESHOLD) {
      rawLean = -(shoulderDiffY * 4 + bodyLean * 6);
      rawLean = Math.max(-1, Math.min(1, rawLean));
    }

    // Head tilt (nose relative to shoulder midpoint)
    const headOffsetX = -(nose.x - shoulderMidX) * 2;
    const headOffsetY = -(nose.y - shoulderMidY - 0.15) * 2;

    // If shoulders are level but head is tilted  = camera look only
    if (Math.abs(shoulderDiffY) < HEAD_ONLY_THRESHOLD && Math.abs(bodyLean) < HEAD_ONLY_THRESHOLD) {
      smoothTiltX += (headOffsetX - smoothTiltX) * TILT_SMOOTHING;
      smoothTiltY += (headOffsetY - smoothTiltY) * TILT_SMOOTHING;
      smoothLean *= (1 - LEAN_SMOOTHING);
    } else {
      // Body is leaning = orbit movement
      smoothLean += (rawLean - smoothLean) * LEAN_SMOOTHING;
      smoothTiltX += (headOffsetX * 0.3 - smoothTiltX) * TILT_SMOOTHING;
      smoothTiltY *= 0.95;
    }

    // Check if both hands are raised (wrists above shoulders)
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    if (leftWrist && rightWrist) {
      const handsAboveShoulders =
        leftWrist.y < leftShoulder.y - 0.05 &&
        rightWrist.y < rightShoulder.y - 0.05;
      state.bothHandsRaised = handsAboveShoulders;
    }
  }

  function processHands(results) {
    const { multiHandLandmarks, multiHandedness } = results;

    // Reset hand states (will be set if detected)
    let rightDetected = false;
    let leftDetected = false;

    for (let i = 0; i < multiHandLandmarks.length; i++) {
      const landmarks = multiHandLandmarks[i];
      const handedness = multiHandedness[i];

      // MediaPipe reports "Left" / "Right" from the camera's perspective
      // Since webcam is mirrored, "Right" label = user's left hand
      const isRightHand = handedness.label === 'Left'; // Mirrored!

      const isClosed = isHandClosed(landmarks);

      if (isRightHand) {
        state.rightHandClosed = isClosed;
        rightDetected = true;
      } else {
        state.leftHandClosed = isClosed;
        leftDetected = true;
      }
    }

    // If a hand is not detected, maintain previous state briefly
    // (to avoid flickering)
    if (!rightDetected) {
      // Keep previous state for a moment
    }
    if (!leftDetected) {
      // Keep previous state for a moment
    }
  }

  function isHandClosed(landmarks) {
    // Check if fingers are curled by comparing fingertip to palm distances
    // Landmarks: 0=wrist, 4=thumb tip, 8=index tip, 12=middle tip,
    //            16=ring tip, 20=pinky tip
    // MCP joints: 5=index MCP, 9=middle MCP, 13=ring MCP, 17=pinky MCP

    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const indexMCP = landmarks[5];
    const middleMCP = landmarks[9];
    const ringMCP = landmarks[13];
    const pinkyMCP = landmarks[17];

    // For each finger, check if tip is closer to wrist than MCP
    let closedFingers = 0;

    if (dist2D(indexTip, wrist) < dist2D(indexMCP, wrist) + FINGER_CLOSED_THRESHOLD) closedFingers++;
    if (dist2D(middleTip, wrist) < dist2D(middleMCP, wrist) + FINGER_CLOSED_THRESHOLD) closedFingers++;
    if (dist2D(ringTip, wrist) < dist2D(ringMCP, wrist) + FINGER_CLOSED_THRESHOLD) closedFingers++;
    if (dist2D(pinkyTip, wrist) < dist2D(pinkyMCP, wrist) + FINGER_CLOSED_THRESHOLD) closedFingers++;

    // If 3+ fingers are curled, consider hand closed
    return closedFingers >= 3;
  }

  function dist2D(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function reset() {
    smoothLean = 0;
    smoothTiltX = 0;
    smoothTiltY = 0;
    state.leanAmount = 0;
    state.headTiltX = 0;
    state.headTiltY = 0;
    state.rightHandClosed = false;
    state.leftHandClosed = false;
    state.bothHandsRaised = false;
    state.prevRightClosed = false;
    state.prevLeftClosed = false;
    state.prevBothRaised = false;
    state.rightJustOpened = false;
    state.leftJustOpened = false;
    state.bothJustRaised = false;
  }

  return {
    update,
    reset,
    state,
  };
})();
