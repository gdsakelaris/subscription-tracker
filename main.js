const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// Keep a global reference of the window object
let mainWindow

function createWindow () {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'icon.png'), // You'll need to add an icon file
    show: false, // Don't show until ready
    titleBarStyle: 'default'
  })

  // Load the app
  mainWindow.loadFile('index.html')

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Create application menu
  createMenu()
}

function createMenu () {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Data',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            exportData()
          }
        },
        {
          label: 'Import Data',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            importData()
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
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
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Subscription Tracker',
              message: 'Subscription Tracker v1.0.0',
              detail:
                'A simple desktop application to track your recurring subscriptions.',
              buttons: ['OK']
            })
          }
        }
      ]
    }
  ]

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
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
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Export data functionality
function exportData () {
  const options = {
    title: 'Export Subscription Data',
    defaultPath: 'subscriptions-backup.json',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }

  dialog.showSaveDialog(mainWindow, options).then(result => {
    if (!result.canceled) {
      mainWindow.webContents.send('export-data', result.filePath)
    }
  })
}

// Import data functionality
function importData () {
  const options = {
    title: 'Import Subscription Data',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  }

  dialog.showOpenDialog(mainWindow, options).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const data = fs.readFileSync(result.filePaths[0], 'utf8')
        mainWindow.webContents.send('import-data', data)
      } catch (error) {
        dialog.showErrorBox('Import Error', 'Failed to read the selected file.')
      }
    }
  })
}

// Handle export request from renderer
ipcMain.handle('save-file', async (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data, 'utf8')
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// App event handlers
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on(
    'new-window',
    (
      navigationEvent,
      navigationURL,
      frameName,
      disposition,
      options,
      additionalFeatures
    ) => {
      navigationEvent.preventDefault()
    }
  )
})
