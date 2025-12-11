export interface Message {
  id: string;
  user_id: string;
  assistant_id: string;
  conversation_id: string | null;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
