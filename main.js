const { app, BrowserWindow, globalShortcut, ipcMain, systemPreferences } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 760,
    height: 420,
    minWidth: 360,
    minHeight: 180,
    x: 100,
    y: 40,
    frame: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Keep above full-screen apps (e.g. Zoom/Meet in fullscreen, games, video editors).
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // The core trick: exclude this window from screen capture / screenshots.
  // Windows: maps to SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE).
  // macOS: maps to NSWindow.sharingType = .none.
  win.setContentProtection(true);

  win.loadFile('index.html');

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(() => {
  // Grant mic access without a system prompt dialog loop (Electron still
  // respects the OS-level mic permission the first time it's used).
  app.commandLine.appendSwitch('enable-features', 'WebRTC-H264WithOpenH264FFmpeg');

  createWindow();

  // Toggle click-through so you can interact with apps underneath the
  // overlay while it keeps floating on top (and stays invisible to capture).
  let clickThrough = false;
  globalShortcut.register('Control+Alt+I', () => {
    clickThrough = !clickThrough;
    if (win) {
      win.setIgnoreMouseEvents(clickThrough, { forward: true });
      win.webContents.send('click-through-changed', clickThrough);
    }
  });

  // Quick show/hide.
  globalShortcut.register('Control+Alt+H', () => {
    if (!win) return;
    if (win.isVisible()) win.hide();
    else win.show();
  });

  globalShortcut.register('Control+Alt+Q', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('set-click-through', (_evt, value) => {
  if (win) win.setIgnoreMouseEvents(!!value, { forward: true });
});

ipcMain.on('close-app', () => {
  app.quit();
});

ipcMain.on('minimize-app', () => {
  if (win) win.hide();
});

ipcMain.handle('get-bounds', () => {
  return win ? win.getBounds() : null;
});

ipcMain.on('resize-to', (_evt, { startBounds, width, height }) => {
  if (!win) return;
  const w = Math.max(360, Math.round(width));
  const h = Math.max(180, Math.round(height));
  win.setBounds({ x: startBounds.x, y: startBounds.y, width: w, height: h });
});
