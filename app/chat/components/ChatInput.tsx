import { useState } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-purple-100 p-3 md:p-4 bg-white/80 backdrop-blur-lg">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-2 md:gap-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={disabled}
              rows={1}
              className="w-full resize-none border-2 border-purple-200 rounded-xl md:rounded-2xl px-4 md:px-5 py-2.5 md:py-3 pr-10 md:pr-12 text-sm md:text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:border-purple-300 bg-white"
              style={{
                minHeight: '44px',
                maxHeight: '200px',
              }}
            />
            <div className="absolute right-2 md:right-3 bottom-2.5 md:bottom-3 flex items-center gap-1 text-xs text-gray-400 hidden sm:flex">
              <svg className="h-3 w-3 md:h-3.5 md:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="hidden md:inline">Enter</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="px-4 md:px-8 py-2.5 md:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl md:rounded-2xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg disabled:shadow-none font-medium flex items-center gap-1.5 md:gap-2 flex-shrink-0"
          >
            <span className="text-sm md:text-base">Send</span>
            <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 hidden sm:flex items-center gap-2 md:gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Enter</kbd>
            <span className="text-xs">to send</span>
          </span>
          <span className="hidden md:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Shift</kbd>
            <span className="text-xs">+</span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Enter</kbd>
            <span className="text-xs">for new line</span>
          </span>
        </p>
      </div>
    </form>
  );
}
