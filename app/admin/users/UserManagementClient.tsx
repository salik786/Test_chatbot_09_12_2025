'use client';

import { useState } from 'react';
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

export default function UserManagementClient({ users: initialUsers, assistants }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleAssignAssistant = async (userId: string, assistantId: string) => {
    setLoading(userId);
    try {
      const response = await fetch('/api/admin/users/assign-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, assistantId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign assistant');
      }

      const { data } = await response.json();

      // Update the user's assignment in the state
      setUsers(users.map(user => {
        if (user.id === userId) {
          const assistant = assistants.find(a => a.id === assistantId);
          return {
            ...user,
            user_assistant: assistant ? [{
              assistant_id: assistantId,
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
                    <select
                      value={assignedAssistant?.id || ''}
                      onChange={(e) => handleAssignAssistant(user.id, e.target.value)}
                      disabled={loading === user.id}
                      className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {!assignedAssistant && <option value="">No assistant</option>}
                      {assistants.map((assistant) => (
                        <option key={assistant.id} value={assistant.id}>
                          {assistant.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
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
    </div>
  );
}
