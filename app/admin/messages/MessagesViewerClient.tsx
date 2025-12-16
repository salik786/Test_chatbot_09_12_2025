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

interface UserConversationSummary {
  userId: string;
  userEmail: string;
  fullName: string | null;
  conversationCount: number;
  totalMessages: number;
  lastMessageTime: string;
  conversations: {
    assistantId: string;
    assistantName: string;
    messageCount: number;
    lastMessageTime: string;
    messages: MessageWithDetails[];
  }[];
}

export default function MessagesViewerClient({ messages: initialMessages, users, assistants }: Props) {
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedAssistant, setSelectedAssistant] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [selectedConversation, setSelectedConversation] = useState<{
    userId: string;
    assistantId: string;
    messages: MessageWithDetails[];
  } | null>(null);

  // Group messages by user
  const userSummaries = useMemo(() => {
    const userMap = new Map<string, UserConversationSummary>();

    initialMessages.forEach(message => {
      if (!userMap.has(message.user_id)) {
        userMap.set(message.user_id, {
          userId: message.user_id,
          userEmail: message.profiles?.email || 'Unknown',
          fullName: message.profiles?.full_name || null,
          conversationCount: 0,
          totalMessages: 0,
          lastMessageTime: message.timestamp,
          conversations: []
        });
      }

      const summary = userMap.get(message.user_id)!;
      summary.totalMessages++;

      if (new Date(message.timestamp) > new Date(summary.lastMessageTime)) {
        summary.lastMessageTime = message.timestamp;
      }

      // Find or create conversation
      let conversation = summary.conversations.find(
        c => c.assistantId === message.assistant_id
      );

      if (!conversation) {
        conversation = {
          assistantId: message.assistant_id,
          assistantName: message.assistants?.name || 'Unknown',
          messageCount: 0,
          lastMessageTime: message.timestamp,
          messages: []
        };
        summary.conversations.push(conversation);
        summary.conversationCount++;
      }

      conversation.messageCount++;
      conversation.messages.push(message);

      if (new Date(message.timestamp) > new Date(conversation.lastMessageTime)) {
        conversation.lastMessageTime = message.timestamp;
      }
    });

    return Array.from(userMap.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [initialMessages]);

  // Filter user summaries
  const filteredSummaries = useMemo(() => {
    return userSummaries.filter(summary => {
      if (selectedUser !== 'all' && summary.userId !== selectedUser) return false;
      if (selectedAssistant !== 'all') {
        const hasAssistant = summary.conversations.some(c => c.assistantId === selectedAssistant);
        if (!hasAssistant) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesEmail = summary.userEmail.toLowerCase().includes(query);
        const matchesName = summary.fullName?.toLowerCase().includes(query);
        if (!matchesEmail && !matchesName) return false;
      }
      return true;
    });
  }, [userSummaries, selectedUser, selectedAssistant, searchQuery]);

  // Paginate user summaries
  const paginatedSummaries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredSummaries.slice(start, end);
  }, [filteredSummaries, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSummaries.length / itemsPerPage);

  const openConversation = (userId: string, assistantId: string, messages: MessageWithDetails[]) => {
    const sortedMessages = messages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    setSelectedConversation({ userId, assistantId, messages: sortedMessages });
  };

  const closeConversation = () => {
    setSelectedConversation(null);
  };

  // Download messages as CSV for personality analysis
  const downloadMessagesCSV = () => {
    // Get filtered messages based on current filters
    const filteredMessages = initialMessages.filter(message => {
      if (selectedUser !== 'all' && message.user_id !== selectedUser) return false;
      if (selectedAssistant !== 'all' && message.assistant_id !== selectedAssistant) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesEmail = message.profiles?.email?.toLowerCase().includes(query);
        const matchesName = message.profiles?.full_name?.toLowerCase().includes(query);
        if (!matchesEmail && !matchesName) return false;
      }
      return true;
    });

    // Sort by timestamp
    const sortedMessages = filteredMessages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Create CSV header - simplified for personality analysis
    const headers = [
      'Timestamp',
      'Assistant Type',
      'User Message',
      'Assistant Reply'
    ];

    // Group messages into conversation pairs (user question → assistant answer)
    const conversationPairs: Array<{
      timestamp: string;
      assistantType: string;
      userMessage: string;
      assistantReply: string;
    }> = [];

    for (let i = 0; i < sortedMessages.length; i++) {
      const message = sortedMessages[i];

      if (message.role === 'user') {
        // Find the next assistant message
        const nextMessage = sortedMessages[i + 1];
        if (nextMessage && nextMessage.role === 'assistant') {
          conversationPairs.push({
            timestamp: message.timestamp,
            assistantType: message.assistants?.name || 'Unknown',
            userMessage: message.content || '',
            assistantReply: nextMessage.content || ''
          });
          i++; // Skip the assistant message since we've already paired it
        } else {
          // User message without reply
          conversationPairs.push({
            timestamp: message.timestamp,
            assistantType: message.assistants?.name || 'Unknown',
            userMessage: message.content || '',
            assistantReply: '[No reply yet]'
          });
        }
      }
    }

    // Create CSV rows
    const rows = conversationPairs.map(pair => {
      const date = new Date(pair.timestamp);
      return [
        `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
        pair.assistantType,
        // Escape quotes and preserve newlines with proper CSV formatting
        `"${pair.userMessage.replace(/"/g, '""')}"`,
        `"${pair.assistantReply.replace(/"/g, '""')}"`
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `assistant-personality-analysis-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download messages as JSON for personality analysis
  const downloadMessagesJSON = () => {
    // Get filtered messages based on current filters
    const filteredMessages = initialMessages.filter(message => {
      if (selectedUser !== 'all' && message.user_id !== selectedUser) return false;
      if (selectedAssistant !== 'all' && message.assistant_id !== selectedAssistant) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesEmail = message.profiles?.email?.toLowerCase().includes(query);
        const matchesName = message.profiles?.full_name?.toLowerCase().includes(query);
        if (!matchesEmail && !matchesName) return false;
      }
      return true;
    });

    // Sort by timestamp
    const sortedMessages = filteredMessages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Group by assistant type for personality analysis
    const assistantGroups: Record<string, Array<{
      timestamp: string;
      userMessage: string;
      assistantReply: string;
    }>> = {};

    for (let i = 0; i < sortedMessages.length; i++) {
      const message = sortedMessages[i];

      if (message.role === 'user') {
        const assistantName = message.assistants?.name || 'Unknown';

        if (!assistantGroups[assistantName]) {
          assistantGroups[assistantName] = [];
        }

        // Find the next assistant message
        const nextMessage = sortedMessages[i + 1];
        if (nextMessage && nextMessage.role === 'assistant') {
          assistantGroups[assistantName].push({
            timestamp: message.timestamp,
            userMessage: message.content || '',
            assistantReply: nextMessage.content || ''
          });
          i++; // Skip the assistant message since we've already paired it
        } else {
          // User message without reply
          assistantGroups[assistantName].push({
            timestamp: message.timestamp,
            userMessage: message.content || '',
            assistantReply: '[No reply yet]'
          });
        }
      }
    }

    // Create JSON export focused on personality analysis
    const exportData = {
      exportDate: new Date().toISOString(),
      purpose: 'Assistant Personality Analysis',
      totalExchanges: sortedMessages.length / 2,
      filters: {
        user: selectedUser === 'all' ? 'All Users' : users.find(u => u.id === selectedUser)?.email || 'Unknown',
        assistant: selectedAssistant === 'all' ? 'All Assistants' : assistants.find(a => a.id === selectedAssistant)?.name || 'Unknown',
        searchQuery: searchQuery || 'None'
      },
      assistantPersonalities: Object.keys(assistantGroups).map(assistantName => ({
        assistantType: assistantName,
        totalExchanges: assistantGroups[assistantName].length,
        conversations: assistantGroups[assistantName]
      }))
    };

    // Create blob and download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `assistant-personality-analysis-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-8">
      {/* Filters */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700">
                Filter by User
              </label>
              <select
                id="user-filter"
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  setCurrentPage(1);
                }}
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
                onChange={(e) => {
                  setSelectedAssistant(e.target.value);
                  setCurrentPage(1);
                }}
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
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                Search User
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="items-per-page" className="block text-sm font-medium text-gray-700">
                Items per page
              </label>
              <select
                id="items-per-page"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Showing {paginatedSummaries.length} of {filteredSummaries.length} users
              ({initialMessages.length} total messages)
            </div>

            {/* Download Buttons */}
            <div className="flex gap-2">
              <button
                onClick={downloadMessagesCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
              >
                <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download CSV
              </button>

              <button
                onClick={downloadMessagesJSON}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
              >
                <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Summary Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conversations
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Messages
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Activity
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedSummaries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No conversations found matching your filters.
                </td>
              </tr>
            ) : (
              paginatedSummaries.map((summary) => (
                <tr key={summary.userId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{summary.userEmail}</div>
                    {summary.fullName && (
                      <div className="text-sm text-gray-500">{summary.fullName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {summary.conversations.map((conv) => (
                        <button
                          key={conv.assistantId}
                          onClick={() => openConversation(summary.userId, conv.assistantId, conv.messages)}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition"
                        >
                          {conv.assistantName}
                          <span className="ml-1 text-purple-600">({conv.messageCount})</span>
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{summary.totalMessages}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <ClientDateDisplay date={summary.lastMessageTime} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        if (summary.conversations.length > 0) {
                          openConversation(
                            summary.userId,
                            summary.conversations[0].assistantId,
                            summary.conversations[0].messages
                          );
                        }
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View All
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white px-6 py-4 rounded-lg shadow">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
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
              className="px-3 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Conversation Detail Modal */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Conversation Details
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedConversation.messages[0]?.profiles?.email || 'Unknown User'}
                  {' → '}
                  {selectedConversation.messages[0]?.assistants?.name || 'Unknown Assistant'}
                </p>
              </div>
              <button
                onClick={closeConversation}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium opacity-75">
                          {message.role === 'user' ? 'User' : message.assistants?.name}
                        </span>
                        <span className="text-xs opacity-60">
                          {new Date(message.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {selectedConversation.messages.length} messages in this conversation
              </div>
              <button
                onClick={closeConversation}
                className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
