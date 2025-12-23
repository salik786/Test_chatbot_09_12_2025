'use client';

import { useState, useEffect, useRef } from 'react';
import { Database } from '@/types/database';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = Database['public']['Tables']['messages']['Row'];

interface PublicChatInterfaceProps {
  sessionId: string;
  sessionToken: string;
  assistantName: string;
  assistantDescription: string;
}

export default function PublicChatInterface({
  sessionId,
  sessionToken,
  assistantName,
  assistantDescription,
}: PublicChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [inputMessage, setInputMessage] = useState('');
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

  // Mark session as ended when window/tab is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Send beacon to mark session as ended (doesn't block page close)
      navigator.sendBeacon(`/api/public/chat/end-session`, JSON.stringify({ sessionToken }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also try to mark as ended on component unmount
      handleBeforeUnload();
    };
  }, [sessionToken]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() || isLoading) return;

    const content = inputMessage.trim();
    setInputMessage('');
    setError('');
    setIsLoading(true);

    // Add user message to UI immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      user_id: null,
      assistant_id: '',
      conversation_id: null,
      session_id: sessionId,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      is_public: true,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch('/api/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          message: content,
        }),
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

          // Safely try to parse JSON and extract response or text field for display
          let displayMessage = fullMessage;
          try {
            const trimmed = fullMessage.trim();
            // Only try to parse if it looks like complete JSON
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
              const jsonResponse = JSON.parse(trimmed);
              if (jsonResponse && typeof jsonResponse === 'object') {
                if (jsonResponse.response) {
                  displayMessage = jsonResponse.response;
                } else if (jsonResponse.text) {
                  displayMessage = jsonResponse.text;
                } else if (jsonResponse.message) {
                  displayMessage = jsonResponse.message;
                } else {
                  // Handle structured JSON - convert to readable format
                  displayMessage = JSON.stringify(jsonResponse, null, 2);
                }
              }
            } else {
              // Not complete JSON yet, display as-is (still streaming)
              displayMessage = fullMessage;
            }
          } catch (error) {
            // If JSON parsing fails, display as-is (still streaming)
            console.debug('Streaming partial content, not yet valid JSON');
            displayMessage = fullMessage;
          }

          setStreamingMessage(displayMessage);
        }

        // Safely parse final message for storage
        let finalContent = fullMessage;
        try {
          const trimmed = fullMessage.trim();
          // Only try to parse if it looks like JSON
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            const jsonResponse = JSON.parse(trimmed);
            if (jsonResponse && typeof jsonResponse === 'object') {
              if (jsonResponse.response) {
                finalContent = jsonResponse.response;
              } else if (jsonResponse.text) {
                finalContent = jsonResponse.text;
              } else if (jsonResponse.message) {
                finalContent = jsonResponse.message;
              } else {
                // Handle structured JSON - convert to readable format
                finalContent = JSON.stringify(jsonResponse, null, 2);
              }
            }
          }
        } catch (error) {
          // If JSON parsing fails, use full message as-is
          console.debug('Final message not JSON, using as-is');
          finalContent = fullMessage;
        }

        // Add complete assistant message
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          user_id: null,
          assistant_id: '',
          conversation_id: null,
          session_id: sessionId,
          role: 'assistant',
          content: finalContent,
          timestamp: new Date().toISOString(),
          is_public: true,
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-purple-100 px-3 sm:px-4 md:px-6 py-3 sm:py-4 shadow-sm">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl shadow-lg">
            <svg className="h-4 w-4 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
              {assistantName}
            </h1>
            <p className="text-xs text-gray-500 truncate">{assistantDescription || 'AI Assistant'}</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs sm:text-sm text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          {messages.length === 0 && !streamingMessage && (
            <div className="text-center mt-8 sm:mt-12 md:mt-20 px-4">
              <div className="inline-flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-3 sm:mb-4">
                <svg className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Start a Conversation
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Send a message to begin chatting with {assistantName}
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-3 sm:mb-4`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[85%] md:max-w-[75%] rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                    : 'bg-white shadow-md border border-purple-100'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <div className="h-5 w-5 sm:h-6 sm:w-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="h-3 w-3 sm:h-4 sm:w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">Assistant</span>
                  </div>
                )}
                <div className={`text-xs sm:text-sm break-words leading-relaxed ${
                  message.role === 'user' ? 'text-white' : 'text-gray-800'
                } prose prose-sm max-w-none ${message.role === 'user' ? 'prose-invert' : ''}`}>
                  {message.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ node, ...props }) => <h1 className="text-base sm:text-lg font-bold mt-2 mb-1" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-sm sm:text-base font-bold mt-2 mb-1" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-xs sm:text-sm font-semibold mt-1 mb-1" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-0.5 my-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-0.5 my-1" {...props} />,
                        li: ({ node, ...props }) => <li className="ml-1" {...props} />,
                        p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                        code: ({ node, inline, ...props }: any) =>
                          inline ? (
                            <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                          ) : (
                            <code className="block bg-gray-100 text-gray-800 p-2 rounded my-1 overflow-x-auto text-xs font-mono" {...props} />
                          ),
                        a: ({ node, ...props }) => <a className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer" {...props} />,
                        blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-gray-300 pl-2 italic my-1" {...props} />,
                        hr: ({ node, ...props }) => <hr className="my-2 border-gray-300" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                        em: ({ node, ...props }) => <em className="italic" {...props} />,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Streaming message */}
          {streamingMessage && (
            <div className="flex justify-start mb-3 sm:mb-4 animate-fadeIn">
              <div className="max-w-[90%] sm:max-w-[85%] md:max-w-[75%] rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 bg-white shadow-md border border-purple-100">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <div className="h-5 w-5 sm:h-6 sm:w-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="h-3 w-3 sm:h-4 sm:w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-gray-600">Assistant</span>
                </div>
                <div className="text-xs sm:text-sm text-gray-800 break-words leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ node, ...props }) => <h1 className="text-base sm:text-lg font-bold mt-2 mb-1" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-sm sm:text-base font-bold mt-2 mb-1" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-xs sm:text-sm font-semibold mt-1 mb-1" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-0.5 my-1" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-0.5 my-1" {...props} />,
                      li: ({ node, ...props }) => <li className="ml-1" {...props} />,
                      p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                      code: ({ node, inline, ...props }: any) =>
                        inline ? (
                          <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                        ) : (
                          <code className="block bg-gray-100 text-gray-800 p-2 rounded my-1 overflow-x-auto text-xs font-mono" {...props} />
                        ),
                      a: ({ node, ...props }) => <a className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer" {...props} />,
                      blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-gray-300 pl-2 italic my-1" {...props} />,
                      hr: ({ node, ...props }) => <hr className="my-2 border-gray-300" {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                      em: ({ node, ...props }) => <em className="italic" {...props} />,
                    }}
                  >
                    {streamingMessage}
                  </ReactMarkdown>
                </div>
                <div className="flex items-center gap-1 mt-1.5 sm:mt-2">
                  <span className="text-xs text-purple-600 font-medium">Typing</span>
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1 h-1 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && !streamingMessage && (
            <div className="flex justify-start mb-3 sm:mb-4">
              <div className="rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 bg-white shadow-md border border-purple-100">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <div className="h-5 w-5 sm:h-6 sm:w-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="h-3 w-3 sm:h-4 sm:w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-gray-600">Assistant</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white/80 backdrop-blur-lg border-t border-purple-100 px-3 sm:px-4 py-3 sm:py-4 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl shadow-sm text-sm sm:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105 font-medium text-sm sm:text-base whitespace-nowrap"
            >
              <span className="hidden sm:inline">Send</span>
              <svg className="h-5 w-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
