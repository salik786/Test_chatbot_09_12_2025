import { Message } from '@/types/message';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Parse JSON responses to extract the "response" field
  let displayContent = message.content;
  if (!isUser && message.content) {
    try {
      const jsonContent = JSON.parse(message.content);
      if (jsonContent.response) {
        displayContent = jsonContent.response;
      }
    } catch {
      // If not JSON, display as-is
      displayContent = message.content;
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fadeIn`}>
      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-3 shadow-md ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
            : 'bg-white border border-purple-100 text-gray-800'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-gray-600">Assistant</span>
          </div>
        )}
        {isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-6 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-white/90">You</span>
          </div>
        )}
        <div className={`whitespace-pre-wrap break-words leading-relaxed ${isUser ? 'text-white' : 'text-gray-800'}`}>
          {displayContent}
        </div>
        <div className={`text-xs mt-2 flex items-center gap-1 ${isUser ? 'text-white/70' : 'text-gray-500'}`}>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
