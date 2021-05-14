const {
    app,
    BrowserWindow,
    globalShortcut,
    Menu,
    Tray,
    ipcMain,
    clipboard,
} = require('electron');
const path = require('path');
const Store = require('./store.js');
const {
    v4: uuidv4,
} = require('uuid');

let tray = null;
let window = null;

let addItemWindow = null;

const itemsStore = new Store({
    configName: 'items',
    defaults: {}
});

function createWindow() {
    window = new BrowserWindow({
        width: 600,
        height: 500,
        icon: 'C:\\Users\\gusta\\Downloads\\favicon.ico',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        }
    });

    window.removeMenu();

    window.setAlwaysOnTop(true, 'screen');

    addItemWindow = new BrowserWindow({
        width: 400, height: 400, show: false,
        icon: 'C:\\Users\\gusta\\Downloads\\favicon.ico',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        }
    });

    addItemWindow.removeMenu();

    addItemWindow.setAlwaysOnTop(true, 'screen');

    window.loadFile('index.html');

    window.on('minimize', (event) => {
        event.preventDefault();
        window.hide();
    });

    window.on('close', (event) => {
        if (window.isVisible()) {
            window.hide();
            event.preventDefault();
        } else {
            window.close();
            addItemWindow.close();
            window = null;
            tray = null;
            addItemWindow = null;
        }
    });

    addItemWindow.on('close', (event) => {
        addItemWindow.hide();
        ipcMain.removeAllListeners('btnSave');
        event.preventDefault();
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    tray = new Tray('C:\\Users\\gusta\\Downloads\\favicon.ico');
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Salir',
            role: 'quit'
        },
    ])
    tray.setToolTip('Click derecho aquí');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        window.show();
    });

    globalShortcut.register('Alt+CommandOrControl+K', () => {
        window.show();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.on("btnAdd", function (event, arg) {
    addItemWindow.show();
    addItemWindow.loadFile("add_item.html");

    ipcMain.once("btnSave", function (childEvent, values) {
        values.id = uuidv4();
        itemsStore.append("items", values);
        event.sender.send("btnSave-task-finished", itemsStore.get("items"));
        addItemWindow.hide();
    });
});

ipcMain.on('get-items', function (event, arg) {
    event.sender.send('populate-items', itemsStore.get("items"));
});

ipcMain.on('btnPasteClicked', (event, id) => {
    let items = itemsStore.get("items");
    let item = items.find(i => i.id == id);
    clipboard.writeText(item.text);
    window.hide();
});

ipcMain.on('btnRemoveClicked', (event, id) => {
    itemsStore.removeById("items", id);
    let items = itemsStore.get("items");
    event.sender.send('remove-done', items);
});