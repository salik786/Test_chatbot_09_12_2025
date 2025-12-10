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

          <div className="mt-4 text-sm text-gray-500">
            {viewMode === 'conversation'
              ? `Showing ${conversations.length} conversations with ${filteredMessages.length} total messages`
              : `Showing ${filteredMessages.length} of ${initialMessages.length} messages`
            }
          </div>
        </div>
      </div>

      {/* Messages Display */}
      {viewMode === 'conversation' ? (
        <div className="space-y-6">
          {conversations.length === 0 ? (
            <div className="bg-white shadow sm:rounded-lg px-6 py-12 text-center text-gray-500">
              No conversations found matching your filters.
            </div>
          ) : (
            conversations.map((conversation, idx) => (
              <div key={`${conversation.userId}-${conversation.assistantName}`} className="bg-white shadow sm:rounded-lg overflow-hidden">
                {/* Conversation Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {conversation.userEmail}
                      </h3>
                      <p className="text-sm text-gray-500">
                        with {conversation.assistantName} • {conversation.messages.length} messages
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      <ClientDateDisplay date={conversation.lastMessageTime} />
                    </div>
                  </div>
                </div>

                {/* Conversation Messages */}
                <div className="divide-y divide-gray-100">
                  {conversation.messages
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    .map((message) => (
                      <div
                        key={message.id}
                        className={`px-6 py-4 ${
                          message.role === 'user' ? 'bg-blue-50' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <span
                              className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${
                                message.role === 'user'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-green-500 text-white'
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
              </div>
            ))
          )}
        </div>
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
