const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const { GlobalKeyboardListener } = require('node-global-key-listener');

let win;
let gkl;

// 키 시퀀스 버퍼
let keyBuffer = '';
let keyTimer = null;
const BUFFER_TIMEOUT = 800;

// 물리키 → 문자 매핑 (ㅇ=D, ㄹ=F, ㅂ=Q, ㅈ=W, ㅁ=A)
const KEY_MAP = {
  'D': 'D',
  'F': 'F',
  'Q': 'Q',
  'W': 'W',
  'A': 'A',
};

function createWindow() {
  win = new BrowserWindow({
    width: 300,
    height: 380,
    minWidth: 220,
    minHeight: 250,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile('index.html');
  win.setAlwaysOnTop(true, 'floating');
}

function setupGlobalKeys() {
  gkl = new GlobalKeyboardListener();

  gkl.addListener((e) => {
    if (e.state !== 'DOWN') return;

    const mapped = KEY_MAP[e.name];
    if (!mapped) {
      // 매핑 안 되는 키면 버퍼 리셋
      keyBuffer = '';
      return;
    }

    clearTimeout(keyTimer);
    keyTimer = setTimeout(() => { keyBuffer = ''; }, BUFFER_TIMEOUT);

    keyBuffer += mapped;
    if (keyBuffer.length > 4) keyBuffer = keyBuffer.slice(-4);

    // 패턴 매칭
    if (keyBuffer.endsWith('DF')) {
      win.webContents.send('shortcut', 'both-up');
      keyBuffer = '';
    } else if (keyBuffer.endsWith('QWAQ')) {
      win.webContents.send('shortcut', 'real-down');
      keyBuffer = '';
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  setupGlobalKeys();

  // Ctrl 조합도 유지
  globalShortcut.register('CommandOrControl+1', () => {
    win.webContents.send('shortcut', 'both-up');
  });
  globalShortcut.register('CommandOrControl+2', () => {
    win.webContents.send('shortcut', 'total-up');
  });
  globalShortcut.register('CommandOrControl+3', () => {
    win.webContents.send('shortcut', 'real-down');
  });
});

ipcMain.on('window-close', () => app.quit());
ipcMain.on('window-minimize', () => win.minimize());

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (gkl) gkl.kill();
});
app.on('window-all-closed', () => app.quit());
