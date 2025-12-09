export interface Assistant {
  id: string;
  name: string;
  description: string | null;
  model_id: string;
  system_prompt: string;
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
  assigned_at: string;
  assigned_by: string | null;
}
