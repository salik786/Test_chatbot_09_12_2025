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
          model_id: string;
          system_prompt: string;
          active: boolean;
          available_for_random_assignment: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          model_id: string;
          system_prompt: string;
          active?: boolean;
          available_for_random_assignment?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          model_id?: string;
          system_prompt?: string;
          active?: boolean;
          available_for_random_assignment?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_assistant: {
        Row: {
          id: string;
          user_id: string;
          assistant_id: string;
          assigned_at: string;
          assigned_by: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          assistant_id: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          assistant_id?: string;
          assigned_at?: string;
          assigned_by?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          user_id: string;
          assistant_id: string;
          role: 'user' | 'assistant';
          content: string;
          timestamp: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assistant_id: string;
          role: 'user' | 'assistant';
          content: string;
          timestamp?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          assistant_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          timestamp?: string;
        };
      };
    };
  };
}
