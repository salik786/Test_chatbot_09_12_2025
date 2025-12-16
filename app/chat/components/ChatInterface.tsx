'use client';

import { useState, useEffect, useRef } from 'react';
import { Message } from '@/types/message';
import { Database } from '@/types/database';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import LogoutButton from '@/components/ui/LogoutButton';
import ConversationSidebar from './ConversationSidebar';

type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  assistants?: { name: string };
};

interface ChatInterfaceProps {
  assistantName: string;
  isAdmin?: boolean;
}

export default function ChatInterface({ assistantName, isAdmin = false }: ChatInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadConversationMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Failed to load conversations');

      const data = await response.json();
      setConversations(data.conversations || []);

      // Auto-select the most recent conversation
      if (data.conversations && data.conversations.length > 0) {
        setCurrentConversationId(data.conversations[0].id);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages');
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to create conversation');

      const data = await response.json();
      setConversations([data.conversation, ...conversations]);
      setCurrentConversationId(data.conversation.id);
      setMessages([]);
      setIsSidebarOpen(false);
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError('Failed to create new conversation');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete conversation');

      // Remove from list
      const updatedConversations = conversations.filter(c => c.id !== conversationId);
      setConversations(updatedConversations);

      // If we deleted the current conversation, select another one
      if (conversationId === currentConversationId) {
        setCurrentConversationId(updatedConversations[0]?.id || null);
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError('Failed to delete conversation');
    }
  };

  const selectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setIsSidebarOpen(false);
  };

  const sendMessage = async (content: string) => {
    setError('');
    setIsLoading(true);

    // If no conversation is selected, create one first
    if (!currentConversationId) {
      await createNewConversation();
      // Wait a bit for state to update, then send the message
      setTimeout(() => sendMessageToConversation(content), 100);
      return;
    }

    await sendMessageToConversation(content);
  };

  const sendMessageToConversation = async (content: string) => {
    // Add user message to UI immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      user_id: '',
      assistant_id: '',
      conversation_id: currentConversationId,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId: currentConversationId,
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

          // Try to parse JSON and extract response or text field for display
          let displayMessage = fullMessage;
          try {
            const jsonResponse = JSON.parse(fullMessage);
            // Check for simple text fields first
            if (jsonResponse.response) {
              displayMessage = jsonResponse.response;
            } else if (jsonResponse.text) {
              displayMessage = jsonResponse.text;
            } else {
              // Handle structured JSON - convert to readable format
              displayMessage = JSON.stringify(jsonResponse, null, 2);
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
          // Check for simple text fields first
          if (jsonResponse.response) {
            finalContent = jsonResponse.response;
          } else if (jsonResponse.text) {
            finalContent = jsonResponse.text;
          } else {
            // Handle structured JSON - convert to readable format
            finalContent = JSON.stringify(jsonResponse, null, 2);
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
          conversation_id: currentConversationId,
          role: 'assistant',
          content: finalContent,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessage('');

        // Reload conversations to update the "updated_at" timestamp
        loadConversations();
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
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Conversation Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={selectConversation}
        onNewConversation={createNewConversation}
        onDeleteConversation={deleteConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-0'}`}>
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg border-b border-purple-100 px-3 md:px-6 py-3 md:py-4 shadow-sm">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
              {/* Toggle Sidebar Button (All Screens) */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-purple-50 transition flex-shrink-0"
                title={isSidebarOpen ? "Hide conversations" : "Show conversations"}
              >
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* AI Assistant Icon */}
              <div className="flex items-center justify-center h-8 w-8 md:h-10 md:w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg md:rounded-xl shadow-lg flex-shrink-0">
                <svg className="h-4 w-4 md:h-6 md:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base md:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                  {assistantName}
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">AI Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
              {isAdmin && (
                <a
                  href="/admin"
                  className="text-xs md:text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-lg hover:bg-purple-50 transition"
                >
                  <svg className="h-3 w-3 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline">Admin</span>
                </a>
              )}
              <LogoutButton />
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-3 py-4 md:px-4 md:py-6 lg:px-6">
          <div className="max-w-4xl mx-auto">
            {error && (
              <div className="mb-4 p-3 md:p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 md:h-5 md:w-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs md:text-sm text-red-800 font-medium">{error}</p>
                </div>
              </div>
            )}

            {messages.length === 0 && !streamingMessage && (
              <div className="text-center mt-12 md:mt-20 px-4">
                <div className="inline-flex items-center justify-center h-16 w-16 md:h-20 md:w-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-4">
                  <svg className="h-8 w-8 md:h-10 md:w-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  Start a Conversation
                </h2>
                <p className="text-sm md:text-base text-gray-600">
                  Send a message to begin chatting with your AI assistant
                </p>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Streaming message */}
            {streamingMessage && (
              <div className="flex justify-start mb-4 animate-fadeIn">
                <div className="max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[70%] rounded-2xl px-4 py-3 md:px-5 bg-white shadow-md border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-5 md:h-6 md:w-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="h-3 w-3 md:h-4 md:w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">Assistant</span>
                  </div>
                  <div className="text-sm md:text-base text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{streamingMessage}</div>
                  <div className="flex items-center gap-1 mt-2">
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
              <div className="flex justify-start mb-4">
                <div className="rounded-2xl px-4 py-3 md:px-5 bg-white shadow-md border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-5 md:h-6 md:w-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="h-3 w-3 md:h-4 md:w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-gray-600">Assistant</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
