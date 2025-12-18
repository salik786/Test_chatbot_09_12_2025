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
    const end = session.ended_at ? new Date(session.ended_at) : new Date();
    const durationMs = end.getTime() - start.getTime();

    const minutes = Math.floor(durationMs / 60000);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
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

      {/* Filters */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
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

            <div className="flex items-end">
              <div className="text-sm text-gray-500">
                Showing {filteredSessions.length} of {sessions.length} sessions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
            {filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No public sessions found.
                </td>
              </tr>
            ) : (
              filteredSessions.map((session) => {
                const assistant = Array.isArray(session.assistants) ? session.assistants[0] : session.assistants;
                return (
                  <tr key={session.id} className="hover:bg-gray-50">
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openSession(session)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Messages
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
