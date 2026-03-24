import { app, BrowserWindow, shell } from "electron";
const PROD_URL = "https://xiyousha.vercel.app";

const isDev = !app.isPackaged;

function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (isDev) return "http://localhost:5173";
  return PROD_URL;
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 980,
    minHeight: 640,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true
    }
  });

  const appUrl = getAppUrl();
  win.loadURL(appUrl);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
