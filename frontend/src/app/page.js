'use client';

import { useState, useEffect, useRef } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [status, setStatus] = useState({ backend: 'checking', database: 'checking' });
  const [errorMessage, setErrorMessage] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Initialize unique user session ID and load data
  useEffect(() => {
    let sid = '';
    if (typeof window !== 'undefined') {
      sid = localStorage.getItem('chatbot_session_id');
      if (!sid) {
        sid = 'user_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        localStorage.setItem('chatbot_session_id', sid);
      }
      setSessionId(sid);
    }
    checkHealth();
    if (sid) {
      fetchMessages(sid);
    }
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom on message change or loading state
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setStatus({
          backend: 'connected',
          database: data.database === 'connected' ? 'connected' : 'disconnected',
        });
      } else {
        setStatus({ backend: 'disconnected', database: 'disconnected' });
      }
    } catch (err) {
      setStatus({ backend: 'disconnected', database: 'disconnected' });
    }
  };

  const fetchMessages = async (sid = sessionId) => {
    if (!sid) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/messages`, {
        headers: { 'x-session-id': sid },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Could not fetch existing messages:', err);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setErrorMessage('');
    const tempUserMessage = {
      id: Date.now(),
      sender: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({ message: trimmed, sessionId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned error (${res.status})`);
      }

      const data = await res.json();
      const assistantMessage = data.assistantMessage || {
        id: Date.now() + 1,
        sender: 'assistant',
        content: data.reply || 'No reply received.',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setErrorMessage(`Failed to send message: ${err.message}. Please check that the backend is running.`);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          content: `⚠️ Error: ${err.message}. Ensure backend container is running on ${BACKEND_URL}.`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      checkHealth();
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear your conversation history?')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/messages`, {
        method: 'DELETE',
        headers: { 'x-session-id': sessionId },
      });
      if (res.ok) {
        setMessages([]);
      } else {
        alert('Failed to clear messages from server.');
      }
    } catch (err) {
      alert(`Error connecting to server: ${err.message}`);
    }
  };

  const handleNewChat = () => {
    const newSid = 'user_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem('chatbot_session_id', newSid);
    setSessionId(newSid);
    setMessages([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageContent = (content) => {
    // Quick inline formatter for code blocks and bold text
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const code = lines.join('\n');
        return (
          <pre key={index}>
            <code>{code}</code>
          </pre>
        );
      }
      return (
        <span key={index} style={{ whiteSpace: 'pre-wrap' }}>
          {part}
        </span>
      );
    });
  };

  const quickPrompts = [
    'Explain how Docker containers work in simple terms.',
    'What is the difference between Docker images and containers?',
    'How do Docker Compose and internal bridge networks interact?',
  ];

  return (
    <>
      <div className="bg-glow" />
      <div className="chat-app-wrapper">
        {/* Header */}
        <header className="app-header">
          <div className="header-left">
            <div className="brand-icon">🐳</div>
            <div className="brand-text">
              <h1>Dockerized Gemini Chatbot</h1>
              <p>Next.js • Express • PostgreSQL • Google Gemini API</p>
            </div>
          </div>

          <div className="header-right">
            <span className="status-pill" title={`Backend: ${status.backend}, DB: ${status.database}`}>
              <span className={`dot ${status.backend === 'connected' ? 'connected' : status.backend === 'checking' ? 'checking' : 'disconnected'}`} />
              <span>Backend: {status.backend}</span>
            </span>

            <span className="status-pill" title={`Database: ${status.database}`}>
              <span className={`dot ${status.database === 'connected' ? 'connected' : status.database === 'checking' ? 'checking' : 'disconnected'}`} />
              <span>DB: {status.database}</span>
            </span>

            <button onClick={handleNewChat} className="btn-secondary" title="Start a fresh private conversation session">
              + New Chat
            </button>

            {messages.length > 0 && (
              <button onClick={handleClearHistory} className="btn-secondary" title="Clear your conversation history in PostgreSQL">
                Clear
              </button>
            )}
          </div>
        </header>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="alert-banner">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage('')}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Message Feed */}
        <main className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <h3>Welcome to the Dockerized Chatbot</h3>
              <p>
                This full-stack application demonstrates containerization with Docker and Docker Compose. Send a
                message below or click a sample question to test the system.
              </p>
              <div className="quick-prompts">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    className="quick-prompt-btn"
                    onClick={() => {
                      setInput(prompt);
                      textareaRef.current?.focus();
                    }}
                  >
                    👉 {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id || index} className={`message-row ${msg.sender}`}>
                  <div className={`avatar ${isUser ? 'user-avatar' : 'bot-avatar'}`}>
                    {isUser ? '👤' : '✨'}
                  </div>
                  <div className="message-bubble-wrapper">
                    <div className="bubble">{formatMessageContent(msg.content)}</div>
                    <span className="message-time">
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="message-row assistant">
              <div className="avatar bot-avatar">✨</div>
              <div className="message-bubble-wrapper">
                <div className="typing-bubble">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* Input Bar */}
        <footer className="input-area">
          <form className="input-form" onSubmit={handleSendMessage}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything (e.g., questions about Docker, programming, AI)..."
              disabled={isLoading}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!input.trim() || isLoading}
              title="Send message (Enter)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
          <div className="input-footer">
            <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for newline</span>
            <span>Dockerized Architecture: Next.js :3001 ↔ Express :5001 ↔ PostgreSQL :5433</span>
          </div>
        </footer>
      </div>
    </>
  );
}
