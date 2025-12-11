'use client';

import { useState } from 'react';
import { Database } from '@/types/database';

type Assistant = Database['public']['Tables']['assistants']['Row'];

interface AssistantWithStats extends Assistant {
  userCount: number;
  messageCount: number;
}

interface Props {
  assistants: AssistantWithStats[];
}

export default function AssistantManagementClient({ assistants: initialAssistants }: Props) {
  const [assistants, setAssistants] = useState(initialAssistants);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<AssistantWithStats | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    openai_assistant_id: '',
    active: true,
    available_for_random_assignment: true,
  });

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      openai_assistant_id: '',
      active: true,
      available_for_random_assignment: true,
    });
    setShowAddForm(false);
    setEditingAssistant(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('add');

    try {
      const response = await fetch('/api/admin/assistants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create assistant');
      }

      const { data } = await response.json();
      setAssistants([{ ...data, userCount: 0, messageCount: 0 }, ...assistants]);
      showMessage('success', 'Assistant created successfully');
      resetForm();
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to create assistant');
    } finally {
      setLoading(null);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssistant) return;

    setLoading(editingAssistant.id);

    try {
      const response = await fetch('/api/admin/assistants/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAssistant.id,
          ...formData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update assistant');
      }

      const { data } = await response.json();
      setAssistants(assistants.map(a =>
        a.id === editingAssistant.id
          ? { ...data, userCount: a.userCount, messageCount: a.messageCount }
          : a
      ));
      showMessage('success', 'Assistant updated successfully');
      resetForm();
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to update assistant');
    } finally {
      setLoading(null);
    }
  };

  const handleToggleActive = async (assistantId: string, currentStatus: boolean) => {
    setLoading(assistantId);
    try {
      const response = await fetch('/api/admin/assistants/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId, active: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update assistant status');
      }

      setAssistants(assistants.map(a =>
        a.id === assistantId ? { ...a, active: !currentStatus } : a
      ));
      showMessage('success', 'Assistant status updated successfully');
    } catch (error) {
      showMessage('error', 'Failed to update assistant status');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (assistantId: string, assistantName: string) => {
    if (!confirm(`Are you sure you want to delete assistant "${assistantName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(assistantId);
    try {
      const response = await fetch('/api/admin/assistants/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete assistant');
      }

      setAssistants(assistants.filter(a => a.id !== assistantId));
      showMessage('success', 'Assistant deleted successfully');
    } catch (error) {
      showMessage('error', 'Failed to delete assistant');
    } finally {
      setLoading(null);
    }
  };

  const startEdit = (assistant: AssistantWithStats) => {
    setEditingAssistant(assistant);
    setFormData({
      name: assistant.name,
      description: assistant.description || '',
      openai_assistant_id: assistant.openai_assistant_id,
      active: assistant.active,
      available_for_random_assignment: assistant.available_for_random_assignment,
    });
    setShowAddForm(true);
  };

  return (
    <div className="mt-8">
      {message && (
        <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm ? (
        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              {editingAssistant ? 'Edit Assistant' : 'Add New Assistant'}
            </h3>
            <form onSubmit={editingAssistant ? handleEdit : handleAdd} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="openai_assistant_id" className="block text-sm font-medium text-gray-700">
                  OpenAI Assistant ID
                </label>
                <input
                  type="text"
                  id="openai_assistant_id"
                  required
                  placeholder="asst_..."
                  value={formData.openai_assistant_id}
                  onChange={(e) => setFormData({ ...formData, openai_assistant_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <input
                    id="active"
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="available_for_random_assignment"
                    type="checkbox"
                    checked={formData.available_for_random_assignment}
                    onChange={(e) => setFormData({ ...formData, available_for_random_assignment: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="available_for_random_assignment" className="ml-2 block text-sm text-gray-900">
                    Available for Random Assignment
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading !== null}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {editingAssistant ? 'Update' : 'Create'} Assistant
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add New Assistant
          </button>
        </div>
      )}

      {/* Assistants Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                OpenAI ID
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Users
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Messages
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {assistants.map((assistant) => (
              <tr key={assistant.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{assistant.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {assistant.description || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 font-mono">{assistant.openai_assistant_id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    <button
                      onClick={() => handleToggleActive(assistant.id, assistant.active)}
                      disabled={loading === assistant.id}
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        assistant.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      } hover:opacity-80 disabled:opacity-50`}
                    >
                      {assistant.active ? 'Active' : 'Inactive'}
                    </button>
                    {assistant.available_for_random_assignment && (
                      <div className="text-xs text-gray-500">Auto-assign</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {assistant.userCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {assistant.messageCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                  <button
                    onClick={() => startEdit(assistant)}
                    disabled={loading === assistant.id}
                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(assistant.id, assistant.name)}
                    disabled={loading === assistant.id}
                    className="text-red-600 hover:text-red-900 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
