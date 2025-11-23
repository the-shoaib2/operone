import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  onAuthSuccess: (callback: (data: { token: string }) => void) => {
    ipcRenderer.on('auth-success', (_, data) => callback(data))
  },
  openExternal: (url: string) => {
    ipcRenderer.send('open-external', url)
  },
})
