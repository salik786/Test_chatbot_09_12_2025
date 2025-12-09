'use client';

import { useState, useEffect, useRef } from 'react';
import { Message } from '@/types/message';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import LogoutButton from '@/components/ui/LogoutButton';

interface ChatInterfaceProps {
  assistantName: string;
  isAdmin?: boolean;
}

export default function ChatInterface({ assistantName, isAdmin = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const response = await fetch('/api/chat/history');
      if (!response.ok) throw new Error('Failed to load chat history');

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading chat history:', err);
      setError('Failed to load chat history');
    }
  };

  const sendMessage = async (content: string) => {
    setError('');
    setIsLoading(true);

    // Add user message to UI immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      user_id: '',
      assistant_id: '',
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullMessage += chunk;

          // Try to parse JSON and extract response field for display
          let displayMessage = fullMessage;
          try {
            const jsonResponse = JSON.parse(fullMessage);
            if (jsonResponse.response) {
              displayMessage = jsonResponse.response;
            }
          } catch {
            // If not valid JSON yet, display as-is (still streaming)
            displayMessage = fullMessage;
          }

          setStreamingMessage(displayMessage);
        }

        // Parse final message for storage
        let finalContent = fullMessage;
        try {
          const jsonResponse = JSON.parse(fullMessage);
          if (jsonResponse.response) {
            finalContent = jsonResponse.response;
          }
        } catch {
          // If not JSON, use full message as-is
          finalContent = fullMessage;
        }

        // Add complete assistant message
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          user_id: '',
          assistant_id: '',
          role: 'assistant',
          content: finalContent,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessage('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Remove the user message if there was an error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">
            Chat with {assistantName}
          </h1>
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <a
                href="/admin"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Admin Panel
              </a>
            )}
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {messages.length === 0 && !streamingMessage && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg">No messages yet</p>
            <p className="text-sm mt-2">Start a conversation with your assistant!</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Streaming message */}
        {streamingMessage && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[70%] rounded-lg px-4 py-2 bg-gray-200 text-gray-900">
              <div className="text-xs font-semibold mb-1 opacity-75">Assistant</div>
              <div className="whitespace-pre-wrap break-words">{streamingMessage}</div>
              <div className="text-xs mt-1 opacity-60">Typing...</div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !streamingMessage && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[70%] rounded-lg px-4 py-2 bg-gray-200 text-gray-900">
              <div className="text-xs font-semibold mb-1 opacity-75">Assistant</div>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
