export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      assistants: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          openai_assistant_id: string;
          active: boolean;
          available_for_random_assignment: boolean;
          public_link_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          openai_assistant_id: string;
          active?: boolean;
          available_for_random_assignment?: boolean;
          public_link_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          openai_assistant_id?: string;
          active?: boolean;
          available_for_random_assignment?: boolean;
          public_link_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_assistant: {
        Row: {
          id: string;
          user_id: string;
          assistant_id: string;
          openai_thread_id: string | null;
          assigned_at: string;
          assigned_by: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          assistant_id: string;
          openai_thread_id?: string | null;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          assistant_id?: string;
          openai_thread_id?: string | null;
          assigned_at?: string;
          assigned_by?: string | null;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          assistant_id: string;
          openai_thread_id: string | null;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assistant_id: string;
          openai_thread_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          assistant_id?: string;
          openai_thread_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          user_id: string | null;
          assistant_id: string;
          conversation_id: string | null;
          session_id: string | null;
          role: 'user' | 'assistant';
          content: string;
          timestamp: string;
          is_public: boolean;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          assistant_id: string;
          conversation_id?: string | null;
          session_id?: string | null;
          role: 'user' | 'assistant';
          content: string;
          timestamp?: string;
          is_public?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          assistant_id?: string;
          conversation_id?: string | null;
          session_id?: string | null;
          role?: 'user' | 'assistant';
          content?: string;
          timestamp?: string;
          is_public?: boolean;
        };
      };
      public_sessions: {
        Row: {
          id: string;
          assistant_id: string;
          session_token: string;
          master_link_token: string | null;
          openai_thread_id: string | null;
          created_at: string;
          ended_at: string | null;
          last_activity_at: string;
          message_count: number;
        };
        Insert: {
          id?: string;
          assistant_id: string;
          session_token: string;
          master_link_token?: string | null;
          openai_thread_id?: string | null;
          created_at?: string;
          ended_at?: string | null;
          last_activity_at?: string;
          message_count?: number;
        };
        Update: {
          id?: string;
          assistant_id?: string;
          session_token?: string;
          master_link_token?: string | null;
          openai_thread_id?: string | null;
          created_at?: string;
          ended_at?: string | null;
          last_activity_at?: string;
          message_count?: number;
        };
      };
    };
  };
}
