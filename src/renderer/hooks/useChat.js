import { useState, useEffect, useRef } from 'react';

export function useChat(notebookId) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!notebookId) return;
    loadHistory();
  }, [notebookId]);

  async function loadHistory() {
    try {
      const history = await window.vaultmind.chat.getHistory(notebookId);
      setMessages(history);
    } catch (e) {
      setError(e.message);
    }
  }

  async function sendMessage(text) {
    if (!text.trim() || isStreaming) return;

    const userMsg = { id: Date.now(), role: 'user', content: text, created_at: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent('');
    setError(null);

    let accumulated = '';

    try {
      const result = await window.vaultmind.chat.send(notebookId, text, (token) => {
        accumulated += token;
        setStreamingContent(accumulated);
      });

      setMessages(prev => [...prev, {
        id: result.id,
        role: 'assistant',
        content: result.content,
        citations: result.citations || [],
        created_at: Date.now(),
      }]);
    } catch (e) {
      setError(e.message);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `Error: ${e.message}`,
        citations: [],
        created_at: Date.now(),
        isError: true,
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
