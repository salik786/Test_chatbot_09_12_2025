export interface Assistant {
  id: string;
  name: string;
  description: string | null;
  openai_assistant_id: string;
  active: boolean;
  available_for_random_assignment: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssistantWithUserCount extends Assistant {
  user_count: number;
}

export interface UserAssignment {
  id: string;
  user_id: string;
  assistant_id: string;
  openai_thread_id: string | null;
  assigned_at: string;
  assigned_by: string | null;
}
