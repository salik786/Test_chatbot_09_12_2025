'use client';

import { useState, useMemo, useEffect } from 'react';
import { Database } from '@/types/database';

type Message = Database['public']['Tables']['messages']['Row'];

interface MessageWithDetails extends Message {
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
  assistants: {
    name: string;
  } | null;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface Assistant {
  id: string;
  name: string;
}

interface Props {
  messages: MessageWithDetails[];
  users: User[];
  assistants: Assistant[];
}

// Client-side date component to avoid hydration errors
function ClientDateDisplay({ date }: { date: string }) {
  const [formattedDate, setFormattedDate] = useState('');
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    const d = new Date(date);
    setFormattedDate(d.toLocaleDateString());
    setFormattedTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [date]);

  if (!formattedDate) return <span>Loading...</span>;

  return (
    <>
      <div>{formattedDate}</div>
      <div>{formattedTime}</div>
    </>
  );
}

interface ConversationGroup {
  userId: string;
  userEmail: string;
  assistantName: string;
  messages: MessageWithDetails[];
  lastMessageTime: string;
}

export default function MessagesViewerClient({ messages: initialMessages, users, assistants }: Props) {
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedAssistant, setSelectedAssistant] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'conversation'>('conversation');
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const toggleConversation = (key: string) => {
    setExpandedConversations(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const filteredMessages = useMemo(() => {
    return initialMessages.filter(message => {
      if (selectedUser !== 'all' && message.user_id !== selectedUser) return false;
      if (selectedAssistant !== 'all' && message.assistant_id !== selectedAssistant) return false;
      if (selectedRole !== 'all' && message.role !== selectedRole) return false;
      if (searchQuery && !message.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [initialMessages, selectedUser, selectedAssistant, selectedRole, searchQuery]);

  // Group messages by user and assistant for conversation view
  const conversations = useMemo(() => {
    const grouped = new Map<string, ConversationGroup>();

    filteredMessages.forEach(message => {
      const key = `${message.user_id}-${message.assistant_id}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          userId: message.user_id,
          userEmail: message.profiles?.email || 'Unknown User',
          assistantName: message.assistants?.name || 'Unknown Assistant',
          messages: [],
          lastMessageTime: message.timestamp,
        });
      }

      const group = grouped.get(key)!;
      group.messages.push(message);

      // Update last message time
      if (new Date(message.timestamp) > new Date(group.lastMessageTime)) {
        group.lastMessageTime = message.timestamp;
      }
    });

    // Sort conversations by last message time (most recent first)
    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [filteredMessages]);

  // Paginate conversations
  const paginatedConversations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return conversations.slice(start, end);
  }, [conversations, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(conversations.length / itemsPerPage);

  return (
    <div className="mt-8">
      {/* Filters */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <div>
              <label htmlFor="view-mode" className="block text-sm font-medium text-gray-700">
                View Mode
              </label>
              <select
                id="view-mode"
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'list' | 'conversation')}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="conversation">Conversation</option>
                <option value="list">All Messages</option>
              </select>
            </div>

            <div>
              <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700">
                Filter by User
              </label>
              <select
                id="user-filter"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="assistant-filter" className="block text-sm font-medium text-gray-700">
                Filter by Assistant
              </label>
              <select
                id="assistant-filter"
                value={selectedAssistant}
                onChange={(e) => setSelectedAssistant(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Assistants</option>
                {assistants.map((assistant) => (
                  <option key={assistant.id} value={assistant.id}>
                    {assistant.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700">
                Filter by Role
              </label>
              <select
                id="role-filter"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="assistant">Assistant</option>
              </select>
            </div>

            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                Search Content
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <div>
              {viewMode === 'conversation'
                ? `Showing ${paginatedConversations.length} of ${conversations.length} conversations (${filteredMessages.length} total messages)`
                : `Showing ${filteredMessages.length} of ${initialMessages.length} messages`
              }
            </div>
            {viewMode === 'conversation' && (
              <div className="flex items-center gap-2">
                <label htmlFor="items-per-page" className="text-sm">Items per page:</label>
                <select
                  id="items-per-page"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Display */}
      {viewMode === 'conversation' ? (
        <>
          <div className="space-y-4">
            {paginatedConversations.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-lg shadow-lg sm:rounded-2xl px-6 py-12 text-center text-gray-500 border border-purple-100">
                No conversations found matching your filters.
              </div>
            ) : (
              paginatedConversations.map((conversation) => {
                const conversationKey = `${conversation.userId}-${conversation.assistantName}`;
                const isExpanded = expandedConversations.has(conversationKey);

                return (
                  <div key={conversationKey} className="bg-white/80 backdrop-blur-lg shadow-lg sm:rounded-2xl overflow-hidden border border-purple-100">
                    {/* Conversation Header - Clickable */}
                    <button
                      onClick={() => toggleConversation(conversationKey)}
                      className="w-full bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-purple-100 hover:from-purple-100 hover:to-blue-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-left">
                          <svg
                            className={`h-5 w-5 text-purple-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {conversation.userEmail}
                            </h3>
                            <p className="text-sm text-gray-600">
                              with {conversation.assistantName} • {conversation.messages.length} messages
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 text-right">
                          <ClientDateDisplay date={conversation.lastMessageTime} />
                        </div>
                      </div>
                    </button>

                    {/* Conversation Messages - Collapsible */}
                    {isExpanded && (
                      <div className="divide-y divide-gray-100">
                        {conversation.messages
                          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                          .map((message) => (
                            <div
                              key={message.id}
                              className={`px-6 py-4 ${
                                message.role === 'user' ? 'bg-blue-50/50' : 'bg-white'
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <span
                                    className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${
                                      message.role === 'user'
                                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                                        : 'bg-gradient-to-br from-green-500 to-teal-600 text-white'
                                    }`}
                                  >
                                    {message.role === 'user' ? 'U' : 'A'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-medium text-gray-900">
                                      {message.role === 'user' ? 'User' : message.assistants?.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      <ClientDateDisplay date={message.timestamp} />
                                    </p>
                                  </div>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                    {message.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between bg-white/80 backdrop-blur-lg px-6 py-4 rounded-2xl shadow-lg border border-purple-100">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="divide-y divide-gray-200">
            {filteredMessages.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No messages found matching your filters.
              </div>
            ) : (
              filteredMessages.map((message) => (
                <div key={message.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            message.role === 'user'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {message.role}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {message.profiles?.email || 'Unknown User'}
                        </span>
                        <span className="text-sm text-gray-500">→</span>
                        <span className="text-sm text-gray-700">
                          {message.assistants?.name || 'Unknown Assistant'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <div className="text-xs text-gray-500 text-right">
                        <ClientDateDisplay date={message.timestamp} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
