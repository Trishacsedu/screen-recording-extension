// Clicking the toolbar icon opens the recorder in its own small window.
// Recording has to live in a real page (not the service worker), and a
// separate window keeps it out of the way while you record.

let recorderWindowId = null;

chrome.action.onClicked.addListener(async () => {
  // If the recorder window is already open, just bring it to the front.
  if (recorderWindowId !== null) {
    try {
      // Also un-minimize, so clicking the icon during recording brings it back.
      await chrome.windows.update(recorderWindowId, { state: "normal", focused: true });
      return;
    } catch {
      recorderWindowId = null;
    }
  }

  const win = await chrome.windows.create({
    url: chrome.runtime.getURL("recorder.html"),
    type: "popup",
    width: 420,
    height: 560,
  });
  recorderWindowId = win.id;
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === recorderWindowId) recorderWindowId = null;
});
