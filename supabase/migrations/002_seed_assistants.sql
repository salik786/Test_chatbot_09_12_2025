-- Insert sample AI assistants
INSERT INTO assistants (name, description, model_id, system_prompt, active, available_for_random_assignment) VALUES
(
  'General Assistant',
  'A helpful general-purpose AI assistant',
  'gpt-4',
  'You are a helpful, friendly, and knowledgeable AI assistant. Provide clear, accurate, and helpful responses to user questions.',
  true,
  true
),
(
  'Technical Support',
  'Specialized in technical and programming questions',
  'gpt-4',
  'You are a technical support specialist. Help users with programming, debugging, and technical issues. Provide clear explanations and code examples when helpful.',
  true,
  true
),
(
  'Creative Writing',
  'Helps with creative writing and storytelling',
  'gpt-4',
  'You are a creative writing assistant. Help users with creative writing, storytelling, brainstorming ideas, and improving their narrative skills.',
  true,
  true
);
