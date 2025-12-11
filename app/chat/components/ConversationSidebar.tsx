'use client';

import { useState } from 'react';
import { Database } from '@/types/database';

type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  assistants?: { name: string };
};

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen,
  onClose,
}: ConversationSidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    setDeletingId(conversationId);
    try {
      await onDeleteConversation(conversationId);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Overlay (shown when sidebar is open) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:bg-black/20"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-80 bg-white/80 backdrop-blur-lg border-r border-purple-100 shadow-xl`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Conversations</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-purple-50 transition"
                title="Close sidebar"
              >
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <button
              onClick={onNewConversation}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-medium text-sm shadow-md flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Conversation
            </button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto py-2 px-2">
            {conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="inline-flex items-center justify-center h-12 w-12 bg-purple-100 rounded-full mb-3">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">No conversations yet</p>
                <p className="text-xs text-gray-500 mt-1">Start a new conversation to begin</p>
              </div>
            ) : (
              conversations.map((conversation) => {
                const isActive = conversation.id === currentConversationId;
                const isDeleting = deletingId === conversation.id;

                return (
                  <button
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation.id)}
                    disabled={isDeleting}
                    className={`w-full text-left p-3 rounded-xl mb-2 transition-all group relative ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-purple-200 shadow-sm'
                        : 'hover:bg-purple-50 border border-transparent'
                    } ${isDeleting ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-medium truncate ${
                          isActive ? 'text-purple-900' : 'text-gray-900'
                        }`}>
                          {conversation.title || 'New Conversation'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(conversation.updated_at)}
                        </p>
                      </div>

                      {!isDeleting && (
                        <button
                          onClick={(e) => handleDelete(e, conversation.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 transition-all flex-shrink-0"
                          title="Delete conversation"
                        >
                          <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
