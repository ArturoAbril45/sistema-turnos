const { app, BrowserWindow, dialog, utilityProcess } = require('electron');
const { spawn }  = require('child_process');
const net        = require('net');
const path       = require('path');

// Una sola instancia — si ya hay una abierta, enfocarla y salir
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

const PORT      = 3000;
const NEXT_URL  = `http://localhost:${PORT}`;
const isPackaged = app.isPackaged;

let nextProcess = null;

/* ── 1. Arrancar el servidor Next.js ───────────────────────────────────── */
function startNext() {
  if (isPackaged) {
    // Producción: usar utilityProcess (Node.js embebido de Electron)
    const standaloneDir = path.join(process.resourcesPath, '.next', 'standalone');
    const serverScript  = path.join(standaloneDir, 'server.js');

    const logPath = path.join(app.getPath('userData'), 'server.log');
    const fs = require('fs');

    nextProcess = utilityProcess.fork(serverScript, [], {
      cwd: standaloneDir,
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT:     String(PORT),
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
        DATA_DIR: app.getPath('userData'),
        NEXT_TELEMETRY_DISABLED: '1',
      },
    });

    let serverLog = '';
    nextProcess.stdout?.on('data', d => { serverLog += d.toString(); fs.appendFileSync(logPath, d); });
    nextProcess.stderr?.on('data', d => { serverLog += d.toString(); fs.appendFileSync(logPath, d); });

    nextProcess.on('exit', code => {
      if (code !== 0) {
        dialog.showErrorBox('Error del servidor',
          `Código: ${code}\nLog: ${logPath}\n\n${serverLog.slice(-800)}`
        );
      }
    });
  } else {
    // Desarrollo: arrancar next dev normalmente
    nextProcess = spawn('npm', ['run', 'dev'], {
      cwd:   path.join(__dirname, '..'),
      shell: true,
      stdio: 'inherit',
      env:   { ...process.env, FORCE_COLOR: '1' },
    });
    nextProcess.on('error', err => console.error('Error arrancando Next.js:', err));
  }
}

/* ── 2. Esperar que el puerto esté listo ───────────────────────────────── */
function waitForServer(retries = 60) {
  return new Promise((resolve, reject) => {
    function attempt() {
      const sock = net.createConnection({ port: PORT, host: '127.0.0.1' });
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error',   () => {
        sock.destroy();
        if (retries-- <= 0) return reject(new Error('Next.js no respondió'));
        setTimeout(attempt, 500);
      });
    }
    attempt();
  });
}

/* ── 3. Crear ventana principal ────────────────────────────────────────── */
function createWindow() {
  const win = new BrowserWindow({
    width:  1440,
    height: 900,
    show:   true,
    backgroundColor: '#0f172a',
    title:  'Sistema de Turnos',
    webPreferences: {
      webviewTag:       true,
      nodeIntegration:  false,
      contextIsolation: true,
    },
  });

  win.setMenu(null);
  win.loadURL(NEXT_URL);
  win.focus();
}

/* ── Fullscreen simulado: el video llena el webview sin tapar el panel ── */
const FS_SCRIPT = `
(function () {
  if (window.__fsPatchDone) return;
  window.__fsPatchDone = true;

  let fsEl = null;
  let savedStyle = '';

  function enterFS(el) {
    if (fsEl) exitFS();
    fsEl = el;
    savedStyle = el.getAttribute('style') || '';
    el.style.cssText = [
      el.style.cssText,
      'position:fixed!important',
      'top:0!important',
      'left:0!important',
      'width:100vw!important',
      'height:100vh!important',
      'z-index:2147483647!important',
      'background:#000!important',
    ].join(';');
    try {
      Object.defineProperty(document, 'fullscreenElement',       { get: () => fsEl, configurable: true });
      Object.defineProperty(document, 'webkitFullscreenElement', { get: () => fsEl, configurable: true });
    } catch(e) {}
    el.dispatchEvent(new Event('fullscreenchange', { bubbles: true }));
    document.dispatchEvent(new Event('fullscreenchange'));
    document.dispatchEvent(new Event('webkitfullscreenchange'));
    return Promise.resolve();
  }

  function exitFS() {
    if (!fsEl) return Promise.resolve();
    const el = fsEl;
    fsEl = null;
    if (savedStyle) { el.setAttribute('style', savedStyle); }
    else            { el.removeAttribute('style'); }
    try {
      Object.defineProperty(document, 'fullscreenElement',       { get: () => null, configurable: true });
      Object.defineProperty(document, 'webkitFullscreenElement', { get: () => null, configurable: true });
    } catch(e) {}
    el.dispatchEvent(new Event('fullscreenchange', { bubbles: true }));
    document.dispatchEvent(new Event('fullscreenchange'));
    document.dispatchEvent(new Event('webkitfullscreenchange'));
    return Promise.resolve();
  }

  Element.prototype.requestFullscreen       = function() { return enterFS(this); };
  Element.prototype.webkitRequestFullscreen = function() { return enterFS(this); };
  Element.prototype.mozRequestFullScreen    = function() { return enterFS(this); };
  Element.prototype.msRequestFullscreen     = function() { return enterFS(this); };
  document.exitFullscreen       = exitFS;
  document.webkitExitFullscreen = exitFS;
  document.mozCancelFullScreen  = exitFS;
  document.msExitFullscreen     = exitFS;
})();
`;

app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() === 'webview') {
    contents.on('did-finish-load', () => {
      contents.executeJavaScript(FS_SCRIPT).catch(() => {});
    });
    contents.on('enter-html-full-screen', () => {
      BrowserWindow.getAllWindows().forEach(w => w.setFullScreen(false));
    });
  }
});

/* ── Inicio ────────────────────────────────────────────────────────────── */
app.whenReady().then(async () => {
  try {
    startNext();
  } catch (err) {
    dialog.showErrorBoxSync('Error al iniciar servidor',
      `No se pudo iniciar Next.js:\n\n${err.message}\n\nRuta: ${
        app.isPackaged
          ? path.join(process.resourcesPath, '.next', 'standalone', 'server.js')
          : 'dev mode'
      }`
    );
    app.quit();
    return;
  }

  console.log('Esperando que Next.js arranque...');
  try {
    await waitForServer(120); // 60 segundos de espera
    console.log('Next.js listo — abriendo ventana');
    createWindow();
  } catch (err) {
    dialog.showErrorBoxSync('Servidor no respondió',
      `Next.js no respondió en 60 segundos.\n\n${err.message}\n\nRuta standalone: ${
        path.join(process.resourcesPath, '.next', 'standalone')
      }`
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (nextProcess) { try { nextProcess.kill(); } catch(_){} }
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (nextProcess) { try { nextProcess.kill(); } catch(_){} }
});
