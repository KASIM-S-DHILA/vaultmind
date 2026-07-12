import { ipcMain, dialog } from 'electron';
import { IPC } from '../../shared/constants';
import { streamChat } from '../engine/rag-engine';
import { getMessageHistory, addUserMessage, addAssistantMessage, clearMessageHistory } from '../database/messages.repository';
import { listSessions, ensureDefaultSession, getSession } from '../database/chat-sessions.repository';
import { touchNotebook } from '../database/notebooks.repository';
import { writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Citation } from '../../shared/types';

const activeStreams = new Map<string, { controller: AbortController; stopped: boolean }>();

function streamKey(notebookId: string, sessionId?: string): string {
  return sessionId ? `${notebookId}:${sessionId}` : notebookId;
}

export function registerChatHandlers(): void {
  ipcMain.handle(IPC.CHAT.SEND, async (event, notebookId: string, message: string, activeSourceIds?: string[], webSearch?: boolean, sessionId?: string) => {
    const key = streamKey(notebookId, sessionId);
    const entry = { controller: new AbortController(), stopped: false };
    activeStreams.set(key, entry);

    // Ensure a session exists
    const session = ensureDefaultSession(notebookId);
    const sid = sessionId || session.id;

    addUserMessage(notebookId, message, sid);

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
        if (msg.includes('does not support image input') || msg.includes('does not support images')) {
          const userMsg = 'This model does not support image input. Text content was sent — this may be caused by garbled binary data in a source file. Check your uploaded sources for non-text files.';
          event.sender.send(IPC.CHAT.TOKEN, `\n\n**Error:** ${userMsg}`);
          fullResponse += `\n\n**Error:** ${userMsg}`;
        } else {
          throw err;
        }
      }
    } finally {
      activeStreams.delete(key);
    }

    const msgId = addAssistantMessage(notebookId, fullResponse, JSON.stringify(citations), sid);
    touchNotebook(notebookId);

    return { id: msgId, content: fullResponse, citations };
  });

  ipcMain.handle(IPC.CHAT.STOP, async (_event, notebookId: string, sessionId?: string) => {
    const key = streamKey(notebookId, sessionId);
    const entry = activeStreams.get(key);
    if (entry) {
      entry.stopped = true;
      entry.controller.abort();
    }
    return { success: true };
  });

  ipcMain.handle(IPC.CHAT.HISTORY, async (_event, notebookId: string, sessionId?: string) => {
    const rows = getMessageHistory(notebookId, sessionId);
    return rows.map(r => ({ ...r, citations: r.citations_json ? JSON.parse(r.citations_json) : [] }));
  });

  ipcMain.handle(IPC.CHAT.CLEAR, async (_event, notebookId: string, sessionId?: string) => {
    clearMessageHistory(notebookId, sessionId);
    return { success: true };
  });

  ipcMain.handle(IPC.CHAT.EXPORT, async (_event, notebookId: string, sessionId?: string) => {
    const rows = getMessageHistory(notebookId, sessionId);
    if (rows.length === 0) throw new Error('No messages to export.');

    const session = sessionId ? getSession(sessionId) : null;
    const sessionTitle = session?.title || 'Chat';

    // Build Markdown
    let md = `# ${sessionTitle}\n\n`;
    md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

    let footnoteNum = 1;
    const footnotes: string[] = [];

    for (const msg of rows) {
      const role = msg.role === 'user' ? '**You**' : '**VaultMind**';
      md += `### ${role}\n\n`;
      md += msg.content + '\n\n';

      if (msg.citations_json) {
        try {
          const citations: Citation[] = JSON.parse(msg.citations_json);
          if (citations.length > 0) {
            md += `*Citations:* `;
            for (const c of citations) {
              md += `[^{${footnoteNum}}]`;
              footnotes.push(`[^{${footnoteNum}}]: **${c.sourceTitle}**${c.page > 0 ? ` (p. ${c.page})` : ''} — ${c.chunkText.slice(0, 200)}`);
              footnoteNum++;
            }
            md += '\n\n';
          }
        } catch {}
      }

      const time = new Date(msg.created_at).toLocaleString();
      md += `*${time}*\n\n---\n\n`;
    }

    if (footnotes.length > 0) {
      md += `## Footnotes\n\n${footnotes.join('\n\n')}\n`;
    }

    const result = await dialog.showSaveDialog({
      title: 'Export Chat',
      defaultPath: path.join(os.homedir(), `${sessionTitle.replace(/[^a-zA-Z0-9]/g, '_')}.md`),
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false };
    }

    await writeFile(result.filePath, md, 'utf-8');
    return { success: true, filePath: result.filePath };
  });
}
