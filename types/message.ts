export interface Message {
  id: string;
  user_id: string;
  assistant_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
