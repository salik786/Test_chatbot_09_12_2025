'use client';

import { useState, useEffect } from 'react';
import ProlificIdModal from './ProlificIdModal';
import PublicChatInterface from './PublicChatInterface';

interface PublicChatClientProps {
  assistantId: string;
  masterLinkToken: string;
}

export default function PublicChatClient({ assistantId, masterLinkToken }: PublicChatClientProps) {
  const [showModal, setShowModal] = useState(false);
  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    sessionToken: string;
    prolificId: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if we already have a session in sessionStorage for this link
    const storageKey = `public_session_${masterLinkToken}`;
    const stored = sessionStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsedData = JSON.parse(stored);
        setSessionData(parsedData);
        setIsLoading(false);
      } catch (err) {
        // Invalid stored data, show modal
        sessionStorage.removeItem(storageKey);
        setShowModal(true);
        setIsLoading(false);
      }
    } else {
      // No session yet, show modal
      setShowModal(true);
      setIsLoading(false);
    }
  }, [masterLinkToken]);

  const handleProlificIdSubmit = async (prolificId: string) => {
    setError('');
    setIsLoading(true);

    try {
      // Generate a unique session token
      const sessionToken = crypto.randomUUID();

      // Create the session via API
      const response = await fetch('/api/public/chat/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId,
          masterLinkToken,
          sessionToken,
          prolificId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data = await response.json();

      // Store session data
      const sessionInfo = {
        sessionId: data.sessionId,
        sessionToken,
        prolificId,
      };

      // Save to sessionStorage so we don't create duplicates
      const storageKey = `public_session_${masterLinkToken}`;
      sessionStorage.setItem(storageKey, JSON.stringify(sessionInfo));

      setSessionData(sessionInfo);
      setShowModal(false);
      setIsLoading(false);
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-4">
            <svg className="h-12 w-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-red-900 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={() => {
              setError('');
              setShowModal(true);
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ProlificIdModal
        isOpen={showModal}
        onSubmit={handleProlificIdSubmit}
      />

      {sessionData && (
        <PublicChatInterface
          sessionId={sessionData.sessionId}
          sessionToken={sessionData.sessionToken}
          assistantName="ChatBot"
          assistantDescription="Your AI assistant ready to help you"
        />
      )}
    </>
  );
}
