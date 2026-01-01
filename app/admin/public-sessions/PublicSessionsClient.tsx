'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/database';

type PublicSession = Database['public']['Tables']['public_sessions']['Row'] & {
  assistants?: { id: string; name: string } | { id: string; name: string }[] | null;
};

type Message = Database['public']['Tables']['messages']['Row'];

interface Props {
  sessions: PublicSession[];
}

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

export default function PublicSessionsClient({ sessions: initialSessions }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [selectedSession, setSelectedSession] = useState<PublicSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'ended'>('all');
  const [filterAssistant, setFilterAssistant] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Get unique assistants for filter
  const assistants = Array.from(
    new Map(
      sessions
        .map(s => {
          const assistant = Array.isArray(s.assistants) ? s.assistants[0] : s.assistants;
          return assistant ? [assistant.id, assistant] : null;
        })
        .filter((a): a is [string, { id: string; name: string }] => a !== null)
    ).values()
  );

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    if (filterStatus === 'active' && session.ended_at) return false;
    if (filterStatus === 'ended' && !session.ended_at) return false;

    if (filterAssistant !== 'all') {
      const assistant = Array.isArray(session.assistants) ? session.assistants[0] : session.assistants;
      if (!assistant || assistant.id !== filterAssistant) return false;
    }

    return true;
  });

  // Paginate filtered sessions
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterAssistant]);

  const loadSessionMessages = async (sessionId: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/admin/public-sessions/${sessionId}/messages`);
      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const openSession = async (session: PublicSession) => {
    setSelectedSession(session);
    await loadSessionMessages(session.id);
  };

  const closeSession = () => {
    setSelectedSession(null);
    setMessages([]);
  };

  const deleteSession = async (sessionId: string, assistantName: string) => {
    if (!confirm(`Are you sure you want to delete this ${assistantName} session? This will also delete all messages in this session. This action cannot be undone.`)) {
      return;
    }

    setDeletingId(sessionId);
    try {
      const response = await fetch('/api/admin/public-sessions/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      // Remove from list
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const downloadFullChats = async () => {
    // Collect all session data with messages
    const allSessionsData = [];

    for (const session of filteredSessions) {
      try {
        const response = await fetch(`/api/admin/public-sessions/${session.id}/messages`);
        if (!response.ok) continue;

        const data = await response.json();
        const assistant = Array.isArray(session.assistants) ? session.assistants[0] : session.assistants;

        allSessionsData.push({
          sessionId: session.id.substring(0, 8),
          prolificId: session.prolific_id || 'N/A',
          assistant: assistant?.name || 'Unknown',
          status: session.ended_at ? 'Ended' : 'Active',
          messageCount: session.message_count,
          duration: getDuration(session),
          createdAt: new Date(session.created_at).toLocaleString(),
          messages: data.messages || []
        });
      } catch (error) {
        console.error(`Error loading messages for session ${session.id}:`, error);
      }
    }

    // Create CSV with conversation pairs
    const csvRows = [];
    csvRows.push(['Session ID', 'Prolific ID', 'Assistant', 'Status', 'Duration', 'Created At', 'User Message', 'Assistant Reply']);

    allSessionsData.forEach(sessionData => {
      const { sessionId, prolificId, assistant, status, duration, createdAt, messages } = sessionData;

      // Group messages into conversation pairs
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        if (message.role === 'user') {
          const nextMessage = messages[i + 1];
          const userMessage = message.content?.replace(/"/g, '""') || '';
          const assistantReply = (nextMessage && nextMessage.role === 'assistant')
            ? nextMessage.content?.replace(/"/g, '""') || ''
            : '';

          csvRows.push([
            sessionId,
            prolificId,
            assistant,
            status,
            duration,
            createdAt,
            `"${userMessage}"`,
            `"${assistantReply}"`
          ]);

          if (nextMessage && nextMessage.role === 'assistant') {
            i++; // Skip the assistant message since we've already paired it
          }
        }
      }
    });

    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(','));
    const csvString = csvContent.join('\n');

    // Download CSV
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `public-sessions-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const downloadFullChatsJSON = async () => {
    // Collect all session data with messages
    const allSessionsData = [];

    for (const session of filteredSessions) {
      try {
        const response = await fetch(`/api/admin/public-sessions/${session.id}/messages`);
        if (!response.ok) continue;

        const data = await response.json();
        const assistant = Array.isArray(session.assistants) ? session.assistants[0] : session.assistants;

        // Group messages into conversation pairs
        const conversationPairs = [];
        const messages = data.messages || [];

        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];
          if (message.role === 'user') {
            const nextMessage = messages[i + 1];
            conversationPairs.push({
              userMessage: message.content || '',
              assistantReply: (nextMessage && nextMessage.role === 'assistant')
                ? nextMessage.content || ''
                : '',
              timestamp: message.created_at
            });

            if (nextMessage && nextMessage.role === 'assistant') {
              i++; // Skip the assistant message since we've already paired it
            }
          }
        }

        allSessionsData.push({
          sessionId: session.id.substring(0, 8),
          fullSessionId: session.id,
          prolificId: session.prolific_id || 'N/A',
          assistant: assistant?.name || 'Unknown',
          status: session.ended_at ? 'Ended' : 'Active',
          messageCount: session.message_count,
          duration: getDuration(session),
          createdAt: session.created_at,
          endedAt: session.ended_at,
          lastActivityAt: session.last_activity_at,
          conversations: conversationPairs
        });
      } catch (error) {
        console.error(`Error loading messages for session ${session.id}:`, error);
      }
    }

    // Group by assistant for personality analysis
    const groupedByAssistant: { [key: string]: any[] } = {};
    allSessionsData.forEach(session => {
      if (!groupedByAssistant[session.assistant]) {
        groupedByAssistant[session.assistant] = [];
      }
      groupedByAssistant[session.assistant].push(session);
    });

    const jsonData = {
      exportDate: new Date().toISOString(),
      totalSessions: allSessionsData.length,
      assistants: Object.keys(groupedByAssistant).map(assistantName => ({
        name: assistantName,
        sessionCount: groupedByAssistant[assistantName].length,
        totalConversations: groupedByAssistant[assistantName].reduce((sum, s) => sum + s.conversations.length, 0),
        sessions: groupedByAssistant[assistantName]
      })),
      allSessions: allSessionsData
    };

    // Download JSON
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `public-sessions-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // Calculate summary statistics
  const summaryStats = assistants.map(assistant => {
    const assistantSessions = sessions.filter(session => {
      const sessionAssistant = Array.isArray(session.assistants) ? session.assistants[0] : session.assistants;
      return sessionAssistant?.id === assistant.id;
    });

    return {
      name: assistant.name,
      totalSessions: assistantSessions.length,
      activeSessions: assistantSessions.filter(s => !s.ended_at).length,
      totalMessages: assistantSessions.reduce((sum, s) => sum + s.message_count, 0)
    };
  });

  const getStatusBadge = (session: PublicSession) => {
    if (session.ended_at) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Ended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  const getDuration = (session: PublicSession) => {
    const start = new Date(session.created_at);
    // Use ended_at if session ended, otherwise use last_activity_at to show actual session duration
    const end = session.ended_at
      ? new Date(session.ended_at)
      : new Date(session.last_activity_at);
    const durationMs = end.getTime() - start.getTime();

    // Handle negative durations or very small durations
    if (durationMs < 0) return '0s';

    const seconds = Math.floor(durationMs / 1000);
    if (seconds < 1) return '0s';
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="mt-8">
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Public Chat Sessions</h1>
          <p className="mt-2 text-sm text-gray-700">
            Anonymous chat sessions created via shareable links
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {summaryStats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {stat.totalSessions}
                  </dd>
                  <div className="mt-2 flex items-center text-sm text-gray-600">
                    <span className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      {stat.activeSessions} active
                    </span>
                    <span className="ml-3">
                      {stat.totalMessages} msgs
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Actions Bar */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {(filterStatus !== 'all' || filterAssistant !== 'all') && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Active
                  </span>
                )}
              </button>
              <div className="text-sm text-gray-500">
                Showing {paginatedSessions.length} of {filteredSessions.length} sessions
                {filteredSessions.length !== sessions.length && ` (${sessions.length} total)`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadFullChats}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>
              <button
                onClick={downloadFullChatsJSON}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                JSON
              </button>
            </div>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                    Filter by Status
                  </label>
                  <select
                    id="status-filter"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="all">All Sessions</option>
                    <option value="active">Active Only</option>
                    <option value="ended">Ended Only</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="assistant-filter" className="block text-sm font-medium text-gray-700">
                    Filter by Assistant
                  </label>
                  <select
                    id="assistant-filter"
                    value={filterAssistant}
                    onChange={(e) => setFilterAssistant(e.target.value)}
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
            </div>
          )}
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Session ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prolific ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assistant
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Messages
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
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
            {paginatedSessions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  No public sessions found.
                </td>
              </tr>
            ) : (
              paginatedSessions.map((session) => {
                const assistant = Array.isArray(session.assistants) ? session.assistants[0] : session.assistants;
                const isDeleting = deletingId === session.id;
                return (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-mono text-gray-500">
                        {session.id.substring(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {session.prolific_id || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {assistant?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(session)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.message_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDuration(session)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <ClientDateDisplay date={session.created_at} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <ClientDateDisplay date={session.last_activity_at} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => openSession(session)}
                        className="text-blue-600 hover:text-blue-900"
                        disabled={isDeleting}
                      >
                        View Messages
                      </button>
                      <button
                        onClick={() => deleteSession(session.id, assistant?.name || 'Unknown')}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-lg">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, filteredSessions.length)}</span> of{' '}
                <span className="font-medium">{filteredSessions.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Last
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Messages Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col mx-4">
            <div className="flex justify-between items-start p-6 border-b">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Session Messages
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {(() => {
                    const assistant = Array.isArray(selectedSession.assistants)
                      ? selectedSession.assistants[0]
                      : selectedSession.assistants;
                    return assistant?.name || 'Unknown Assistant';
                  })()}
                  {' • '}
                  {selectedSession.message_count} messages
                  {' • '}
                  {getDuration(selectedSession)}
                </p>
              </div>
              <button
                onClick={closeSession}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingMessages ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="mt-2 text-gray-500">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No messages in this session
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="text-xs font-semibold mb-1 opacity-75">
                          {message.role === 'user' ? 'User' : 'Assistant'}
                        </div>
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t">
              <button
                onClick={closeSession}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
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
