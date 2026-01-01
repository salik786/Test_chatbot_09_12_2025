'use client';

import { useState } from 'react';

interface ProlificIdModalProps {
  isOpen: boolean;
  onSubmit: (prolificId: string) => void;
}

export default function ProlificIdModal({ isOpen, onSubmit }: ProlificIdModalProps) {
  const [prolificId, setProlificId] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedId = prolificId.trim();

    if (!trimmedId) {
      setError('Prolific ID is required');
      return;
    }

    if (trimmedId.length < 5) {
      setError('Please enter a valid Prolific ID');
      return;
    }

    onSubmit(trimmedId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-fadeIn">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full mb-4">
            <svg className="h-7 w-7 sm:h-8 sm:w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Welcome to the Study
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Please enter your Prolific ID to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="prolific-id" className="block text-sm font-semibold text-gray-700 mb-2">
              Prolific ID <span className="text-red-500">*</span>
            </label>
            <input
              id="prolific-id"
              type="text"
              value={prolificId}
              onChange={(e) => {
                setProlificId(e.target.value);
                setError('');
              }}
              placeholder="Enter your Prolific ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            Start Chat
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-500 text-center">
          Your Prolific ID will be used solely for research purposes
        </p>
      </div>
    </div>
  );
}
