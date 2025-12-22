// Helper types for Supabase queries to fix type inference issues
import { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Assistant = Database['public']['Tables']['assistants']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type UserAssistant = Database['public']['Tables']['user_assistant']['Row'];
export type PublicSession = Database['public']['Tables']['public_sessions']['Row'];

// Query result types with proper inference
export type SingleResult<T> = { data: T | null; error: any };
export type ArrayResult<T> = { data: T[] | null; error: any };
