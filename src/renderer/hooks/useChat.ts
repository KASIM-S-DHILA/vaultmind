import { useState, useEffect } from 'react';
import type { Message, Citation } from '../../shared/types';

interface ChatResult {
  id: string;
  content: string;
  citations: Citation[];
}

export function useChat(notebookId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!notebookId) return;
    loadHistory();
  }, [notebookId]);

  async function loadHistory() {
    try {
      const history = await window.vaultmind.chat.getHistory(notebookId);
      setMessages(history);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function sendMessage(text: string, activeSourceIds?: string[]) {
    if (!text.trim() || isStreaming) return;

    const userMsg: Message = { id: String(Date.now()), notebook_id: notebookId, role: 'user', content: text, citations_json: null, created_at: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent('');
    setError(null);

    let accumulated = '';

    try {
      const result: ChatResult = await window.vaultmind.chat.send(notebookId, text, (token) => {
        accumulated += token;
        setStreamingContent(accumulated);
      }, activeSourceIds);

      setMessages(prev => [...prev, {
        id: result.id,
        notebook_id: notebookId,
        role: 'assistant',
        content: result.content,
        citations: result.citations,
        citations_json: JSON.stringify(result.citations),
        created_at: Date.now(),
      }]);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      setMessages(prev => [...prev, {
        id: String(Date.now()),
        notebook_id: notebookId,
        role: 'assistant',
        content: msg,
        citations: [],
        citations_json: '[]',
        created_at: Date.now(),
      }]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }

  async function clearHistory() {
    await window.vaultmind.chat.clearHistory(notebookId);
    setMessages([]);
  }

  return { messages, isStreaming, streamingContent, sendMessage, clearHistory, error };
}
