const $ = (id) => document.getElementById(id);

let mediaRecorder = null;
let chunks = [];
let streams = [];      // every stream we opened, so we can stop them all
let audioContext = null;
let recordingUrl = null;
let fileExtension = "webm";
let timerId = null;
let elapsedSeconds = 0;

// Prefer MP4 (plays everywhere, seekable); fall back to WebM on older Chrome.
function pickMimeType() {
  const candidates = [
    ["video/mp4;codecs=avc1,mp4a.40.2", "mp4"],
    ["video/webm;codecs=vp9,opus", "webm"],
    ["video/webm;codecs=vp8,opus", "webm"],
    ["video/webm", "webm"],
  ];
  for (const [type, ext] of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return { type, ext };
  }
  return { type: "", ext: "webm" };
}

function show(sectionId) {
  for (const id of ["setup", "recording", "result"]) {
    $(id).hidden = id !== sectionId;
  }
}

function showError(message) {
  $("error").textContent = message;
  $("error").hidden = !message;
}

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function startTimer() {
  timerId = setInterval(() => {
    if (mediaRecorder?.state === "recording") {
      elapsedSeconds += 1;
      $("timer").textContent = formatTime(elapsedSeconds);
    }
  }, 1000);
}

// Combine screen audio and microphone into one track, since MediaRecorder
// only records a single audio track.
function mixAudio(audioStreams) {
  const withAudio = audioStreams.filter((s) => s.getAudioTracks().length > 0);
  if (withAudio.length === 0) return [];
  if (withAudio.length === 1) return withAudio[0].getAudioTracks();

  audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  for (const stream of withAudio) {
    audioContext.createMediaStreamSource(stream).connect(destination);
  }
  return destination.stream.getAudioTracks();
}

async function startRecording() {
  showError("");

  // Opens Chrome's picker: Tab / Window / Entire screen.
  // "Entire screen" or the Chrome window captures DevTools too.
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: $("systemAudio").checked,
    selfBrowserSurface: "exclude",   // hide this recorder window from the list
    systemAudio: "include",
    monitorTypeSurfaces: "include",
  });
  streams.push(displayStream);

  let micStream = null;
  if ($("micAudio").checked) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streams.push(micStream);
    } catch (err) {
      showError(`Microphone unavailable (${err.message}). Recording without it.`);
    }
  }

  const combined = new MediaStream([
    ...displayStream.getVideoTracks(),
    ...mixAudio([displayStream, micStream].filter(Boolean)),
  ]);

  const { type, ext } = pickMimeType();
  fileExtension = ext;
  chunks = [];
  mediaRecorder = new MediaRecorder(combined, type ? { mimeType: type } : {});
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  mediaRecorder.onstop = finishRecording;

  // If the user clicks Chrome's own "Stop sharing" bar, stop cleanly.
  displayStream.getVideoTracks()[0].addEventListener("ended", stopRecording);

  mediaRecorder.start(1000); // collect data every second
  elapsedSeconds = 0;
  $("timer").textContent = formatTime(0);
  startTimer();
  show("recording");
  setWindowState("minimized");
}

// Minimize the recorder once recording starts so it stays out of the capture.
async function setWindowState(state) {
  try {
    const win = await chrome.windows.getCurrent();
    await chrome.windows.update(win.id, { state, ...(state === "normal" && { focused: true }) });
  } catch {
    // Not fatal: the window just stays as it is.
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}

function togglePause() {
  if (!mediaRecorder) return;
  if (mediaRecorder.state === "recording") {
    mediaRecorder.pause();
    $("pauseBtn").textContent = "Resume";
    $("recording").classList.add("paused");
  } else if (mediaRecorder.state === "paused") {
    mediaRecorder.resume();
    $("pauseBtn").textContent = "Pause";
    $("recording").classList.remove("paused");
  }
}

function releaseStreams() {
  for (const stream of streams) {
    stream.getTracks().forEach((t) => t.stop());
  }
  streams = [];
  audioContext?.close();
  audioContext = null;
  clearInterval(timerId);
}

function finishRecording() {
  releaseStreams();
  const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "video/webm" });
  if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  recordingUrl = URL.createObjectURL(blob);
  $("preview").src = recordingUrl;
  show("result");
  // Restore the minimized recorder window so the user sees the result.
  setWindowState("normal");
}

function download() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const a = document.createElement("a");
  a.href = recordingUrl;
  a.download = `screen-recording-${stamp}.${fileExtension}`;
  a.click();
}

function reset() {
  $("preview").removeAttribute("src");
  $("pauseBtn").textContent = "Pause";
  $("recording").classList.remove("paused");
  show("setup");
}

$("startBtn").addEventListener("click", () => {
  startRecording().catch((err) => {
    releaseStreams();
    show("setup");
    // NotAllowedError means the user cancelled the picker; no need to shout.
    if (err.name !== "NotAllowedError") showError(err.message);
  });
});
$("pauseBtn").addEventListener("click", togglePause);
$("stopBtn").addEventListener("click", stopRecording);
$("downloadBtn").addEventListener("click", download);
$("newBtn").addEventListener("click", reset);

// Warn before closing the window mid-recording, which would lose the video.
window.addEventListener("beforeunload", (e) => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") e.preventDefault();
});
