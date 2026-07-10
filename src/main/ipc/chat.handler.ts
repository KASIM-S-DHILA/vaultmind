import { ipcMain } from 'electron';
import { IPC } from '../../shared/constants';
import { streamChat } from '../engine/rag-engine';
import { getMessageHistory, addUserMessage, addAssistantMessage, clearMessageHistory } from '../database/messages.repository';
import { touchNotebook } from '../database/notebooks.repository';
import type { Citation } from '../../shared/types';

export function registerChatHandlers(): void {
  ipcMain.handle(IPC.CHAT.SEND, async (event, notebookId: string, message: string, activeSourceIds?: string[]) => {
    addUserMessage(notebookId, message);

    let fullResponse = '';
    let citations: Citation[] = [];

    await streamChat({
      notebookId,
      message,
      activeSourceIds,
      onToken: (token) => {
        fullResponse += token;
        event.sender.send(IPC.CHAT.TOKEN, token);
      },
      onCitations: (c) => { citations = c; },
    });

    const msgId = addAssistantMessage(notebookId, fullResponse, JSON.stringify(citations));
    touchNotebook(notebookId);

    return { id: msgId, content: fullResponse, citations };
  });

  ipcMain.handle(IPC.CHAT.HISTORY, async (_event, notebookId: string) => {
    const rows = getMessageHistory(notebookId);
    return rows.map(r => ({ ...r, citations: r.citations_json ? JSON.parse(r.citations_json) : [] }));
  });

  ipcMain.handle(IPC.CHAT.CLEAR, async (_event, notebookId: string) => {
    clearMessageHistory(notebookId);
    return { success: true };
  });
}
