import { ipcMain } from 'electron';
import { IPC } from '../../shared/constants';
import { isSetupComplete, markSetupComplete, getSystemInfo } from '../setup/system-check';

export function registerSetupHandlers(): void {
  ipcMain.handle(IPC.SETUP.IS_COMPLETE, async () => isSetupComplete());

  ipcMain.handle(IPC.SETUP.SYSTEM_INFO, async () => getSystemInfo());

  ipcMain.handle(IPC.SETUP.COMPLETE, async () => {
    markSetupComplete();
    return { success: true };
  });
}
