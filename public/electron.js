// Module to control the application lifecycle and the native browser window.
const { app, BrowserWindow, protocol, net, session } = require("electron");
const url = require("url");
const fs = require("fs");
const path = require("path");

/*  START NEW LIBRARY     */
let downloadFolder = app.getPath("downloads") + "/itam";
//let downloadFolder = app.getPath("appData") + "/itam";
const imageUrl = "https://i.imgur.com/H124sSq.jpg";
//downloadFolder: app.getPath("appData") + "/itam",

function _registerListener(win, opts = {}) {
  lastWindowCreated = win;
  downloadFolder = opts.downloadFolder || downloadFolder;

  const listener = (e, item) => {
    const itemUrl = decodeURIComponent(item.getURLChain()[0] || item.getURL());
    const itemFilename = decodeURIComponent(item.getFilename());
    let queueItem = _popQueueItem(itemUrl);
    let ReceivedBytesArr = [];

    if (queueItem) {
      const folder = queueItem.downloadFolder || downloadFolder;
      const filePath = path.join(folder, queueItem.path, itemFilename);

      const totalBytes = item.getTotalBytes();
      let speedValue = 0;
      let receivedBytes;
      let PreviousReceivedBytes;

      item.setSavePath(filePath);

      // Resuming an interrupted download
      if (item.getState() === "interrupted") {
        item.resume();
      }

      item.on("updated", () => {
        receivedBytes = item.getReceivedBytes();
        ReceivedBytesArr.push(receivedBytes);
        if (ReceivedBytesArr.length >= 2) {
          PreviousReceivedBytes = ReceivedBytesArr.shift();
          speedValue =
            Math.max(PreviousReceivedBytes, ReceivedBytesArr[0]) -
            Math.min(PreviousReceivedBytes, ReceivedBytesArr[0]);
        }
        const progress = {
          progress: (receivedBytes * 100) / totalBytes,
          speedBytes: speedValue,
          speed: _bytesToSize(speedValue) + "/sec",
          remainingBytes: totalBytes - receivedBytes,
          remaining: _bytesToSize(totalBytes - receivedBytes),
          totalBytes: totalBytes,
          total: _bytesToSize(totalBytes),
          downloadedBytes: receivedBytes,
          downloaded: _bytesToSize(receivedBytes),
        };

        if (typeof queueItem.onProgress === "function") {
          queueItem.onProgress(progress, item);
        }
      });

      item.on("done", (e, state) => {
        let finishedDownloadCallback = queueItem.callback || function () {};

        if (!win.isDestroyed()) {
          win.setProgressBar(-1);
        }

        if (state === "interrupted") {
          const message = `The download of ${item.getFilename()} was interrupted`;

          finishedDownloadCallback(new Error(message), {
            url: item.getURL(),
            filePath,
          });
        } else if (state === "completed") {
          if (process.platform === "darwin") {
            app.dock.downloadFinished(filePath);
          }

          // TODO: remove this listener, and/or the listener that attach this listener to newly created windows
          // if (opts.unregisterWhenDone) {
          //     webContents.session.removeListener('will-download', listener);
          // }

          finishedDownloadCallback(null, { url: item.getURL(), filePath });
        }
      });
    }
  };

  win.webContents.session.on("will-download", listener);
}

const register = (opts = {}) => {
  app.on("browser-window-created", (e, win) => {
    _registerListener(win, opts);
  });
};

const download = (options, callback) => {
  let win = BrowserWindow.getFocusedWindow() || lastWindowCreated;
  options = Object.assign({}, { path: "" }, options);
  const request = net.request(options.url);

  const filename = decodeURIComponent(path.basename(options.url));
  console.log("filename", filename);

  const url = decodeURIComponent(options.url);

  const folder = options.downloadFolder || downloadFolder;
  const filePath = path.join(
    folder,
    options.path.toString(),
    filename.split(/[?#]/)[0]
  );

  if (options.headers) {
    options.headers.forEach((h) => {
      request.setHeader(h.name, h.value);
    });

    // Modify the user agent for all requests to the following urls.
    const filter = {
      urls: [options.url],
    };

    session.defaultSession.webRequest.onBeforeSendHeaders(
      filter,
      (details, callback) => {
        options.headers.forEach((h) => {
          details.requestHeaders[h.name] = h.value;
        });
        // details.requestHeaders['User-Agent'] = 'MyAgent'
        callback({ cancel: false, requestHeaders: details.requestHeaders });
      }
    );
  }

  if (typeof options.onLogin === "function") {
    request.on("login", options.onLogin);
  }

  request.on("error", function (error) {
    let finishedDownloadCallback = callback || function () {};

    const message = `The request for ${filename} was interrupted: ${error}`;

    finishedDownloadCallback(new Error(message), {
      url: options.url,
      filePath: filePath,
    });
  });

  request.on("response", function (response) {
    request.abort();

    queue.push({
      url: url,
      filename: filename,
      downloadFolder: options.downloadFolder,
      path: options.path.toString(),
      callback: callback,
      onProgress: options.onProgress,
    });

    if (fs.existsSync(filePath)) {
      console.log("file exists: proced to remove and download again");
      fs.unlink(filePath, (err) => {
        if (err) {
          alert("An error ocurred updating the file" + err.message);
          console.log(err);
          return;
        }
        console.log("File succesfully deleted");
      });
      win.webContents.downloadURL(options.url);
    } else {
      console.log(filename + " does not exist, download it now");
      win.webContents.downloadURL(options.url);
    }
  });
  request.end();
};

let lastWindowCreated;

const queue = [];

const _popQueueItem = (url) => {
  let queueItem = queue.find((item) => item.url === url);
  queue.splice(queue.indexOf(queueItem), 1);
  return queueItem;
};

const _bytesToSize = (bytes, decimals) => {
  if (bytes == 0) return "0 Bytes";
  var k = 1000,
    dm = decimals || 2,
    sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

register({
  downloadFolder,
});
/*  END NEW LIBRARY     */
console.log(app.getPath("appData") + "/itam");

// Create the native browser window.
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    // Set the path of an additional "preload" script that can be used to
    // communicate between node-land and browser-land.
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // In production, set the initial browser path to the local bundle generated
  // by the Create React App build process.
  // In development, set it to localhost to allow live/hot-reloading.
  const appURL = app.isPackaged
    ? url.format({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file:",
        slashes: true,
      })
    : "http://localhost:3000";
  mainWindow.loadURL(appURL);

  // Automatically open Chrome's DevTools in development mode.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

// Setup a local proxy to adjust the paths of requested files when loading
// them from the local production bundle (e.g.: local fonts, etc...).
function setupLocalFilesNormalizerProxy() {
  protocol.registerHttpProtocol(
    "file",
    (request, callback) => {
      const url = request.url.substr(8);
      callback({ path: path.normalize(`${__dirname}/${url}`) });
    },
    (error) => {
      if (error) console.error("Failed to register protocol");
    }
  );
}

// This method will be called when Electron has finished its initialization and
// is ready to create the browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();
  setupLocalFilesNormalizerProxy();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  download(
    {
      url: imageUrl,
    },
    function (error, info) {
      if (error) {
        console.log(error);
        return;
      }

      console.log("DONE: " + info.url);
    }
  );
});

// Quit when all windows are closed, except on macOS.
// There, it's common for applications and their menu bar to stay active until
// the user quits  explicitly with Cmd + Q.
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// If your app has no need to navigate or only needs to navigate to known pages,
// it is a good idea to limit navigation outright to that known scope,
// disallowing any other kinds of navigation.
const allowedNavigationDestinations = "https://my-electron-app.com";
app.on("web-contents-created", (event, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (!allowedNavigationDestinations.includes(parsedUrl.origin)) {
      event.preventDefault();
    }
  });
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
