import { ipcMain } from 'electron';
import { IPC } from '../../shared/constants';
import { streamChat } from '../engine/rag-engine';
import { getMessageHistory, addUserMessage, addAssistantMessage, clearMessageHistory } from '../database/messages.repository';
import { touchNotebook } from '../database/notebooks.repository';
import type { Citation } from '../../shared/types';

const activeStreams = new Map<string, { controller: AbortController; stopped: boolean }>();

export function registerChatHandlers(): void {
  ipcMain.handle(IPC.CHAT.SEND, async (event, notebookId: string, message: string, activeSourceIds?: string[], webSearch?: boolean) => {
    const entry = { controller: new AbortController(), stopped: false };
    activeStreams.set(notebookId, entry);

    addUserMessage(notebookId, message);

    let fullResponse = '';
    let citations: Citation[] = [];

    try {
      await streamChat({
        notebookId,
        message,
        activeSourceIds,
        webSearch,
        signal: entry.controller.signal,
        onToken: (token) => {
          fullResponse += token;
          event.sender.send(IPC.CHAT.TOKEN, token);
        },
        onCitations: (c) => { citations = c; },
      });
    } catch (err: any) {
      if (entry.stopped || err.name === 'AbortError') {
        event.sender.send(IPC.CHAT.TOKEN, '\n\n[Response stopped]');
        fullResponse += '\n\n[Response stopped]';
      } else {
        const msg = err.message || String(err);
        // Ollama returns this when trying to send images to a text-only model
        if (msg.includes('does not support image input') || msg.includes('does not support images')) {
          const userMsg = 'This model does not support image input. Text content was sent — this may be caused by garbled binary data in a source file. Check your uploaded sources for non-text files.';
          event.sender.send(IPC.CHAT.TOKEN, `\n\n**Error:** ${userMsg}`);
          fullResponse += `\n\n**Error:** ${userMsg}`;
        } else {
          throw err;
        }
      }
    } finally {
      activeStreams.delete(notebookId);
    }

    const msgId = addAssistantMessage(notebookId, fullResponse, JSON.stringify(citations));
    touchNotebook(notebookId);

    return { id: msgId, content: fullResponse, citations };
  });

  ipcMain.handle(IPC.CHAT.STOP, async (_event, notebookId: string) => {
    const entry = activeStreams.get(notebookId);
    if (entry) {
      entry.stopped = true;
      entry.controller.abort();
    }
    return { success: true };
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
