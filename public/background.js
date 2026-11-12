/* Service worker: chụp màn hình tab đang xem (content script không tự chụp được). */
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg || msg.noidi !== "capture") return false;
  const windowId = sender.tab ? sender.tab.windowId : chrome.windows.WINDOW_ID_CURRENT;
  chrome.tabs.captureVisibleTab(windowId, { format: "png" })
    .then((dataUrl) => reply({ dataUrl }))
    .catch((e) => reply({ error: String(e && e.message ? e.message : e) }));
  return true; // phản hồi bất đồng bộ
});
