# Screen Recorder (Chrome extension)

Records what you see: your entire screen, a single window (such as Chrome with
DevTools open), or a single tab. You can include tab/system audio and your
microphone.

## Install (developer mode)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Pin the extension from the puzzle-piece menu.

## Use

1. Click the extension icon. A small recorder window opens.
2. Choose the audio options, then click **Choose screen & start**.
3. In Chrome's picker:
   - **Entire screen** records everything, including DevTools whether it's
     docked or in its own window.
   - **Window → Chrome** records the browser window, including docked DevTools.
   - **Chrome tab** records only the page content (no DevTools).
4. Click **Stop** (or Chrome's "Stop sharing" bar), then **Download**.

The file is MP4 on recent Chrome and WebM on older versions.

## Notes

- On macOS, the first time you pick "Entire screen" or a window, you need to
  allow Chrome under System Settings → Privacy & Security → Screen Recording,
  then restart Chrome.
- System audio from "Entire screen" is only available on Windows and ChromeOS.
  On macOS, only tab audio can be captured.
- Keep the recorder window open while recording. Closing it ends the recording.
