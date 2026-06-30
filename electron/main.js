const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

let mainWindow = null;
let backendProcess = null;
let splashWindow = null;

let BACKEND_PORT = 5001;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
  });
}

// ─── Environment variables baked into the app ───────────────────────
const backendEnv = {
  PORT: String(BACKEND_PORT),
  NODE_ENV: 'production',
  MONGODB_URI: 'YOUR_MONGODB_URI',
  JWT_SECRET: 'your-super-secret-jwt-key-change-me',
  JWT_REFRESH_SECRET: 'your-super-secret-refresh-key-change-me',
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD: 'admin',
  GROQ_API_KEY: 'YOUR_GROQ_API_KEY',
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  SERPAPI_API_KEY: 'YOUR_SERPAPI_KEY',
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_USER: 'YOUR_EMAIL@gmail.com',
  SMTP_PASS: 'YOUR_APP_PASSWORD',
  SMTP_FROM: 'YOUR_EMAIL@gmail.com',
  FRONTEND_URL: `http://127.0.0.1:${BACKEND_PORT}`,
  WHATSAPP_SESSION_PATH: path.join(app.getPath('userData'), 'wwebjs_auth'),
  // Let Puppeteer auto-detect its own bundled Chromium from node_modules
  // Do NOT set PUPPETEER_EXECUTABLE_PATH to Electron's binary — it's not Chromium
};

// ─── Splash Screen ──────────────────────────────────────────────────
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();
}

// ─── Start Backend ──────────────────────────────────────────────────
function startBackend() {
  return new Promise(async (resolve, reject) => {
    try {
      BACKEND_PORT = await getFreePort();
      backendEnv.PORT = String(BACKEND_PORT);
      backendEnv.FRONTEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
      log.info(`Found free port for backend: ${BACKEND_PORT}`);
    } catch (err) {
      log.error('Failed to find free port', err);
    }

    const backendEntry = app.isPackaged
      ? path.join(process.resourcesPath, 'backend', 'dist', 'index.js')
      : path.join(__dirname, '..', 'backend', 'dist', 'index.js');
      
    log.info(`Starting backend from: ${backendEntry}`);

    backendProcess = fork(backendEntry, [], {
      env: { ...process.env, ...backendEnv },
      // Use the directory of the backend script as the cwd to ensure relative paths work
      cwd: path.dirname(backendEntry),
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    backendProcess.stdout.on('data', (data) => {
      log.info(`[Backend] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on('data', (data) => {
      log.error(`[Backend Error] ${data.toString().trim()}`);
    });

    backendProcess.on('error', (err) => {
      log.error('Backend process error:', err);
      reject(err);
    });

    let healthCheckTimer = null;
    let isReady = false;

    backendProcess.on('exit', (code) => {
      log.info(`Backend process exited with code ${code}`);
      if (!isReady) {
        if (healthCheckTimer) clearTimeout(healthCheckTimer);
        reject(new Error(`Backend crashed during startup (code ${code}). This usually means it couldn't connect to MongoDB Atlas. Ensure your MongoDB Atlas Network Access is set to allow 0.0.0.0/0 (Access from anywhere). Check logs at %APPDATA%\\Roaming\\leadgen-pro\\logs\\main.log`));
      }
      backendProcess = null;
    });

    // Poll health endpoint to know when backend is ready
    const maxAttempts = 60; // 60 seconds max
    let attempts = 0;

    const checkHealth = () => {
      if (!backendProcess) return; // Exit if already crashed
      
      attempts++;
      const http = require('http');

      const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
          log.info('Backend is ready!');
          isReady = true;
          resolve();
        } else if (attempts < maxAttempts) {
          healthCheckTimer = setTimeout(checkHealth, 1000);
        } else {
          reject(new Error('Backend failed to start within 60 seconds'));
        }
      });

      req.on('error', () => {
        if (attempts < maxAttempts) {
          healthCheckTimer = setTimeout(checkHealth, 1000);
        } else {
          reject(new Error('Backend failed to start within 60 seconds'));
        }
      });

      req.end();
    };

    healthCheckTimer = setTimeout(checkHealth, 1500); // Give it 1.5s before first check
  });
}

// ─── Create Main Window ─────────────────────────────────────────────
function createMainWindow() {
  // Guard: prevent creating a second window
  if (mainWindow) {
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: 'LeadGen Pro',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the frontend served by Express backend
  mainWindow.loadURL(`http://127.0.0.1:${BACKEND_PORT}`);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── Auto Update ────────────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript(
        `document.title = 'LeadGen Pro — Downloading update v${info.version}...'`
      );
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded.`,
      detail: 'The app will restart to install the update.',
      buttons: ['Restart Now', 'Later'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-update error:', err);
  });
}

// ─── App Lifecycle ──────────────────────────────────────────────────
app.whenReady().then(async () => {
  createSplashWindow();

  try {
    await startBackend();
    createMainWindow();
    setupAutoUpdater();
    
    // Set standard application menu (includes View > Reload)
    const { Menu } = require('electron');
    const isMac = process.platform === 'darwin';
    const template = [
      ...(isMac ? [{
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }] : []),
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          ...(isMac ? [
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
              label: 'Speech',
              submenu: [
                { role: 'startSpeaking' },
                { role: 'stopSpeaking' }
              ]
            }
          ] : [
            { role: 'delete' },
            { type: 'separator' },
            { role: 'selectAll' }
          ])
        ]
      },
      {
        label: 'View',
        submenu: [
          { label: 'Refresh Data', role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          ...(isMac ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' }
          ] : [
            { role: 'close' }
          ])
        ]
      }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    // Initialize Auto-Updater
    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info.version);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info.version);
      
      const dialogOpts = {
        type: 'info',
        buttons: ['Restart and Install', 'Later'],
        title: 'Application Update',
        message: `Version ${info.version} is now available!`,
        detail: 'A new version has been downloaded. Restart the application to apply the updates.'
      };
    
      dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });

    autoUpdater.on('error', (err) => {
      log.error('Auto-updater error:', err);
    });

    // Check for updates
    autoUpdater.checkForUpdatesAndNotify();
    
  } catch (error) {
    log.error('Failed to start app:', error);
    dialog.showErrorBox(
      'LeadGen Pro — Startup Error',
      `Failed to start the application.\n\n${error.message}\n\nPlease check that no other instance is running on port ${BACKEND_PORT}.`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep the app running (standard behavior)
  // On other platforms, quit completely
  if (process.platform !== 'darwin') {
    gracefulShutdown();
  }
});

app.on('activate', () => {
  // macOS: re-create window when dock icon is clicked and no windows are open
  if (mainWindow === null && backendProcess) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  gracefulShutdown();
});

function gracefulShutdown() {
  if (backendProcess) {
    log.info('Shutting down backend process...');
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
  app.quit();
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
