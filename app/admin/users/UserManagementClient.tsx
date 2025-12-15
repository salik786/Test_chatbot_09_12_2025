'use client';

import { useState, useEffect } from 'react';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Assistant = Database['public']['Tables']['assistants']['Row'];

interface UserWithAssistant extends Profile {
  user_assistant: Array<{
    assistant_id: string;
    assistants: {
      id: string;
      name: string;
      openai_assistant_id: string;
    } | null;
  }> | null;
}

interface Props {
  users: UserWithAssistant[];
  assistants: Assistant[];
}

// Client-side date component to avoid hydration errors
function ClientDateDisplay({ date }: { date: string }) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    setFormattedDate(new Date(date).toLocaleDateString());
  }, [date]);

  if (!formattedDate) return <span>Loading...</span>;
  return <span>{formattedDate}</span>;
}

export default function UserManagementClient({ users: initialUsers, assistants }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('');

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    setLoading(userId);
    try {
      const response = await fetch('/api/admin/users/toggle-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isAdmin: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update admin status');
      }

      setUsers(users.map(user =>
        user.id === userId ? { ...user, is_admin: !currentStatus } : user
      ));
      showMessage('success', 'Admin status updated successfully');
    } catch (error) {
      showMessage('error', 'Failed to update admin status');
    } finally {
      setLoading(null);
    }
  };

  const handleOpenEditAssistant = (userId: string, currentAssistantId: string | undefined) => {
    setEditingUserId(userId);
    setSelectedAssistantId(currentAssistantId || '');
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setSelectedAssistantId('');
  };

  const handleSaveAssistant = async () => {
    if (!editingUserId) return;

    setLoading(editingUserId);
    try {
      const response = await fetch('/api/admin/users/assign-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editingUserId, assistantId: selectedAssistantId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign assistant');
      }

      // Update the user's assignment in the state
      setUsers(users.map(user => {
        if (user.id === editingUserId) {
          const assistant = assistants.find(a => a.id === selectedAssistantId);
          return {
            ...user,
            user_assistant: assistant ? [{
              assistant_id: selectedAssistantId,
              assistants: {
                id: assistant.id,
                name: assistant.name,
                openai_assistant_id: assistant.openai_assistant_id
              }
            }] : []
          };
        }
        return user;
      }));

      showMessage('success', 'Assistant assigned successfully');
      handleCancelEdit();
    } catch (error) {
      showMessage('error', 'Failed to assign assistant');
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    setLoading(userId);
    try {
      const response = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter(user => user.id !== userId));
      showMessage('success', 'User deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete user');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-8">
      {message && (
        <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Full Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned Assistant
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const assignment = user.user_assistant?.[0];
              const assignedAssistant = assignment?.assistants;

              return (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-500">{user.id.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.full_name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                      disabled={loading === user.id}
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.is_admin
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      } hover:opacity-80 disabled:opacity-50`}
                    >
                      {user.is_admin ? 'Admin' : 'User'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {assignedAssistant ? (
                        <>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {assignedAssistant.name}
                          </span>
                          <button
                            onClick={() => handleOpenEditAssistant(user.id, assignedAssistant.id)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Edit
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-gray-400">Not assigned</span>
                          <button
                            onClick={() => handleOpenEditAssistant(user.id, undefined)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            Assign
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <ClientDateDisplay date={user.created_at} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      disabled={loading === user.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Assistant Modal */}
      {editingUserId && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Assign Assistant
            </h3>

            <div className="mb-4">
              <label htmlFor="assistant-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Assistant
              </label>
              <select
                id="assistant-select"
                value={selectedAssistantId}
                onChange={(e) => setSelectedAssistantId(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              >
                <option value="">-- Select an assistant --</option>
                {assistants.map((assistant) => (
                  <option key={assistant.id} value={assistant.id}>
                    {assistant.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                disabled={loading === editingUserId}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssistant}
                disabled={loading === editingUserId || !selectedAssistantId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === editingUserId ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
