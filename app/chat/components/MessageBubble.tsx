import { Message } from '@/types/message';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Safely parse JSON responses to extract the "response" field
  let displayContent = message.content || '';

  if (!isUser && displayContent) {
    try {
      // Only try to parse if it looks like JSON
      const trimmed = displayContent.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const jsonContent = JSON.parse(trimmed);
        if (jsonContent && typeof jsonContent === 'object') {
          if (jsonContent.response) {
            displayContent = jsonContent.response;
          } else if (jsonContent.text) {
            displayContent = jsonContent.text;
          } else if (jsonContent.message) {
            displayContent = jsonContent.message;
          }
        }
      }
    } catch (error) {
      // If JSON parsing fails, use content as-is
      console.debug('Not JSON content, displaying as-is');
      displayContent = message.content;
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 md:mb-4 animate-fadeIn`}>
      <div
        className={`max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-[70%] rounded-2xl px-4 py-3 md:px-5 shadow-md ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
            : 'bg-white border border-purple-100 text-gray-800'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-5 md:h-6 md:w-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="h-3 w-3 md:h-4 md:w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-gray-600">Assistant</span>
          </div>
        )}
        {isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-5 md:h-6 md:w-6 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="h-3 w-3 md:h-4 md:w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-white/90">You</span>
          </div>
        )}
        <div className={`text-sm md:text-base break-words leading-relaxed ${isUser ? 'text-white' : 'text-gray-800'} prose prose-sm md:prose-base max-w-none ${isUser ? 'prose-invert' : ''}`}>
          {isUser ? (
            // User messages: plain text with line breaks
            <div className="whitespace-pre-wrap">{displayContent}</div>
          ) : (
            // Assistant messages: render as markdown
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Style headings
                h1: ({ node, ...props }) => <h1 className="text-xl md:text-2xl font-bold mt-4 mb-2" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-lg md:text-xl font-bold mt-3 mb-2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-base md:text-lg font-semibold mt-2 mb-1" {...props} />,
                // Style lists
                ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 my-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 my-2" {...props} />,
                li: ({ node, ...props }) => <li className="ml-2" {...props} />,
                // Style paragraphs
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                // Style code blocks
                code: ({ node, inline, ...props }: any) =>
                  inline ? (
                    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                  ) : (
                    <code className="block bg-gray-100 text-gray-800 p-3 rounded-lg my-2 overflow-x-auto text-sm font-mono" {...props} />
                  ),
                // Style links
                a: ({ node, ...props }) => <a className="text-blue-600 hover:text-blue-700 underline" target="_blank" rel="noopener noreferrer" {...props} />,
                // Style blockquotes
                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2" {...props} />,
                // Style horizontal rules
                hr: ({ node, ...props }) => <hr className="my-4 border-gray-300" {...props} />,
                // Style strong/bold
                strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                // Style emphasis/italic
                em: ({ node, ...props }) => <em className="italic" {...props} />,
              }}
            >
              {displayContent}
            </ReactMarkdown>
          )}
        </div>
        <div className={`text-xs mt-2 flex items-center gap-1 ${isUser ? 'text-white/70' : 'text-gray-500'}`}>
          <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
