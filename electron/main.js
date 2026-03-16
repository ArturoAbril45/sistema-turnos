const { app, BrowserWindow, dialog, ipcMain, screen, utilityProcess, session } = require('electron');
const { spawn }  = require('child_process');
const net        = require('net');
const path       = require('path');
const fs         = require('fs');

/* ── Cargar Widevine desde Edge (para Netflix / Amazon Prime) ──────────── */
function loadWidevine() {
  const edgeBases = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application',
    'C:\\Program Files\\Microsoft\\Edge\\Application',
  ];
  for (const base of edgeBases) {
    try {
      if (!fs.existsSync(base)) continue;
      const versions = fs.readdirSync(base).filter(f => /^\d+/.test(f)).sort().reverse();
      for (const ver of versions) {
        const widevineDll = path.join(base, ver, 'WidevineCdm', '_platform_specific', 'win_x64', 'widevinecdm.dll');
        const manifestFile = path.join(base, ver, 'WidevineCdm', 'manifest.json');
        if (!fs.existsSync(widevineDll)) continue;
        let cdmVersion = '4.10.2557.0';
        try { cdmVersion = JSON.parse(fs.readFileSync(manifestFile, 'utf8')).version || cdmVersion; } catch (_) {}
        app.commandLine.appendSwitch('widevine-cdm-path', widevineDll);
        app.commandLine.appendSwitch('widevine-cdm-version', cdmVersion);
        return true;
      }
    } catch (_) {}
  }
  return false;
}

loadWidevine();
app.commandLine.appendSwitch('enable-features', 'PlatformEncryptedDolbyVision,EncryptedMediaEncryptionSchemeQuery');
app.commandLine.appendSwitch('disable-features', 'RendererCodeIntegrity');

/* ── Activar "contenido protegido" en preferencias de Chromium ─────────── */
(function enableProtectedContent() {
  try {
    const appData = process.env.APPDATA;
    if (!appData) return;
    const defaultDir = path.join(appData, app.getName(), 'Default');
    const prefsPath  = path.join(defaultDir, 'Preferences');
    if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir, { recursive: true });
    let prefs = {};
    if (fs.existsSync(prefsPath)) {
      try { prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8')); } catch (_) {}
    }
    if (!prefs.profile) prefs.profile = {};
    if (!prefs.profile.default_content_setting_values)
      prefs.profile.default_content_setting_values = {};
    prefs.profile.default_content_setting_values.protected_media_identifier = 1;
    fs.writeFileSync(prefsPath, JSON.stringify(prefs));
  } catch (_) {}
})();

// Una sola instancia
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

const PORT       = 3000;
const RENDER_URL = 'https://sistema-turnos-m93n.onrender.com';
const isPackaged = app.isPackaged;
const NEXT_URL   = isPackaged ? RENDER_URL : `http://localhost:${PORT}`;

let nextProcess    = null;
let mainWin        = null;
let chromeProcess  = null;

/* ── Chrome paths (Windows) ────────────────────────────────────────────── */
const BROWSER_PATHS = [
  // Chrome
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  // Edge (preinstalado en Windows 10/11)
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe',
];

function findChrome() {
  for (const p of BROWSER_PATHS) {
    try { if (p && fs.existsSync(p)) return p; } catch (_) {}
  }
  return null;
}

/* ── Abrir streaming en Chrome posicionado ─────────────────────────────── */
function openStreaming(url) {
  const chromePath = findChrome();
  if (!chromePath) {
    dialog.showErrorBox('Navegador no encontrado',
      'Instale Google Chrome o Microsoft Edge para usar esta función.');
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const streamW = Math.floor(width * 0.68);
  const turnosW = width - streamW;

  // Cerrar Chrome anterior si existe
  closeStreaming();

  // Reposicionar ventana de turnos a la derecha
  if (mainWin) {
    mainWin.setBounds({ x: streamW, y: 0, width: turnosW, height }, { animate: false });
    mainWin.focus();
  }

  // Abrir Chrome en el lado izquierdo
  chromeProcess = spawn(chromePath, [
    `--app=${url}`,
    `--window-position=0,0`,
    `--window-size=${streamW},${height}`,
    '--disable-features=Translate',
    '--no-first-run',
  ], { detached: true, stdio: 'ignore' });

  chromeProcess.unref();
}

/* ── Cerrar streaming y restaurar ventana ──────────────────────────────── */
function closeStreaming() {
  if (chromeProcess) {
    try { chromeProcess.kill(); } catch (_) {}
    chromeProcess = null;
  }
  // Restaurar ventana a pantalla completa
  if (mainWin) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    mainWin.setBounds({ x: 0, y: 0, width, height }, { animate: false });
  }
}

/* ── IPC desde renderer ─────────────────────────────────────────────────── */
ipcMain.on('open-streaming',  (_e, url) => openStreaming(url));
ipcMain.on('close-streaming', ()        => closeStreaming());

/* ── 1. Arrancar Next.js ───────────────────────────────────────────────── */
function startNext() {
  if (isPackaged) {
    const standaloneDir = path.join(process.resourcesPath, '.next', 'standalone');
    const serverScript  = path.join(standaloneDir, 'server.js');
    const logPath       = path.join(app.getPath('userData'), 'server.log');

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
      if (code !== 0) dialog.showErrorBox('Error del servidor',
        `Código: ${code}\nLog: ${logPath}\n\n${serverLog.slice(-800)}`);
    });
  } else {
    nextProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'), shell: true, stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    nextProcess.on('error', err => console.error('Error arrancando Next.js:', err));
  }
}

/* ── 2. Esperar puerto ─────────────────────────────────────────────────── */
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

/* ── 3. Crear ventana ──────────────────────────────────────────────────── */
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWin = new BrowserWindow({
    width, height, x: 0, y: 0,
    show: true,
    backgroundColor: '#f4f6f9',
    title: 'Sistema de Turnos',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      webviewTag:       true,
      nodeIntegration:  false,
      contextIsolation: true,
      plugins:          true,
    },
  });

  mainWin.setMenu(null);

  const splashPath = path.join(__dirname, 'splash.html');
  mainWin.loadFile(splashPath);

  mainWin.webContents.on('did-finish-load', () => {
    mainWin.webContents.executeJavaScript(`
      if (typeof window.__electronContinuar === 'undefined') {
        window.__electronContinuar = function() {
          location.href = ${JSON.stringify(NEXT_URL)};
        };
      }
    `);
  });

  mainWin.on('closed', () => {
    closeStreaming();
    mainWin = null;
  });

  mainWin.focus();
}

/* ── Fullscreen simulado ───────────────────────────────────────────────── */
const FS_SCRIPT = `
(function () {
  if (window.__fsPatchDone) return;
  window.__fsPatchDone = true;
  let fsEl = null, savedStyle = '';
  function enterFS(el) {
    if (fsEl) exitFS(); fsEl = el; savedStyle = el.getAttribute('style') || '';
    el.style.cssText = [el.style.cssText,'position:fixed!important','top:0!important','left:0!important','width:100vw!important','height:100vh!important','z-index:2147483647!important','background:#000!important'].join(';');
    try { Object.defineProperty(document,'fullscreenElement',{get:()=>fsEl,configurable:true}); Object.defineProperty(document,'webkitFullscreenElement',{get:()=>fsEl,configurable:true}); } catch(e){}
    el.dispatchEvent(new Event('fullscreenchange',{bubbles:true})); document.dispatchEvent(new Event('fullscreenchange')); document.dispatchEvent(new Event('webkitfullscreenchange'));
    return Promise.resolve();
  }
  function exitFS() {
    if (!fsEl) return Promise.resolve(); const el=fsEl; fsEl=null;
    if (savedStyle) el.setAttribute('style',savedStyle); else el.removeAttribute('style');
    try { Object.defineProperty(document,'fullscreenElement',{get:()=>null,configurable:true}); Object.defineProperty(document,'webkitFullscreenElement',{get:()=>null,configurable:true}); } catch(e){}
    el.dispatchEvent(new Event('fullscreenchange',{bubbles:true})); document.dispatchEvent(new Event('fullscreenchange')); document.dispatchEvent(new Event('webkitfullscreenchange'));
    return Promise.resolve();
  }
  Element.prototype.requestFullscreen=function(){return enterFS(this);}; Element.prototype.webkitRequestFullscreen=function(){return enterFS(this);}; Element.prototype.mozRequestFullScreen=function(){return enterFS(this);}; Element.prototype.msRequestFullscreen=function(){return enterFS(this);};
  document.exitFullscreen=exitFS; document.webkitExitFullscreen=exitFS; document.mozCancelFullScreen=exitFS; document.msExitFullscreen=exitFS;
})();`;

app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() === 'webview') {
    contents.on('did-finish-load', () => contents.executeJavaScript(FS_SCRIPT).catch(() => {}));
    contents.on('enter-html-full-screen', () => BrowserWindow.getAllWindows().forEach(w => w.setFullScreen(false)));
  }
});

/* ── Inicio ────────────────────────────────────────────────────────────── */
app.whenReady().then(async () => {
  // Permitir DRM (protectedMediaIdentifier) para Netflix / Amazon Prime
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler(() => true);

  if (!isPackaged) {
    try { startNext(); await waitForServer(120); }
    catch (err) { dialog.showErrorBoxSync('Error al iniciar servidor', err.message); app.quit(); return; }
  }
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  closeStreaming();
  if (nextProcess) { try { nextProcess.kill(); } catch(_){} }
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  closeStreaming();
  if (nextProcess) { try { nextProcess.kill(); } catch(_){} }
});
