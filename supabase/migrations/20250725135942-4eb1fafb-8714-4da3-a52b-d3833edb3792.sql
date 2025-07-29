-- Create users profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create agents table
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'paused', 'error')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('gmail', 'telegram', 'scheduler', 'webhook')),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  workflow_steps JSONB NOT NULL DEFAULT '[]',
  generated_code TEXT,
  schedule_config JSONB DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Create policies for agents
CREATE POLICY "Users can view their own agents" 
ON public.agents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agents" 
ON public.agents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents" 
ON public.agents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents" 
ON public.agents 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create agent executions table
CREATE TABLE public.agent_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  trigger_data JSONB DEFAULT '{}',
  execution_log TEXT,
  error_message TEXT,
  output_data JSONB DEFAULT '{}',
  duration_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;

-- Create policies for agent executions
CREATE POLICY "Users can view their own executions" 
ON public.agent_executions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own executions" 
ON public.agent_executions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own executions" 
ON public.agent_executions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create service connections table
CREATE TABLE public.service_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('gmail', 'notion', 'telegram', 'slack')),
  service_config JSONB NOT NULL DEFAULT '{}',
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, service_type)
);

-- Enable RLS
ALTER TABLE public.service_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for service connections
CREATE POLICY "Users can view their own connections" 
ON public.service_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections" 
ON public.service_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections" 
ON public.service_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
ON public.service_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create workflow templates table
CREATE TABLE public.workflow_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  template_config JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for workflow templates (public read)
CREATE POLICY "Anyone can view public templates" 
ON public.workflow_templates 
FOR SELECT 
USING (is_public = true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_connections_updated_at
  BEFORE UPDATE ON public.service_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_agents_user_id ON public.agents(user_id);
CREATE INDEX idx_agents_status ON public.agents(status);
CREATE INDEX idx_agents_next_run_at ON public.agents(next_run_at) WHERE status = 'active';
CREATE INDEX idx_agent_executions_agent_id ON public.agent_executions(agent_id);
CREATE INDEX idx_agent_executions_user_id ON public.agent_executions(user_id);
CREATE INDEX idx_agent_executions_started_at ON public.agent_executions(started_at);
CREATE INDEX idx_service_connections_user_id ON public.service_connections(user_id);

-- Insert sample workflow templates
INSERT INTO public.workflow_templates (name, description, category, trigger_type, template_config) VALUES
('Email to Notion', 'Automatically save email summaries to Notion when receiving emails with specific labels', 'Productivity', 'gmail', '{
  "trigger": {
    "type": "gmail",
    "config": {"label": "invoices", "query": "has:attachment"}
  },
  "steps": [
    {"type": "llm_summarize", "config": {"prompt": "Summarize this email in 2-3 sentences"}},
    {"type": "notion_create", "config": {"database_id": "", "properties": {"title": "{{subject}}", "summary": "{{summary}}"}}}
  ]
}'),
('Daily Tweet Summary', 'Fetch trending tweets daily and create a blog draft', 'Content', 'scheduler', '{
  "trigger": {
    "type": "scheduler",
    "config": {"cron": "0 9 * * *", "timezone": "UTC"}
  },
  "steps": [
    {"type": "webhook_call", "config": {"url": "https://api.twitter.com/2/tweets/search/recent", "method": "GET"}},
    {"type": "llm_process", "config": {"prompt": "Create a blog post summary from these trending tweets"}},
    {"type": "notion_create", "config": {"database_id": "", "properties": {"title": "Daily Tweet Summary {{date}}", "content": "{{blog_content}}"}}}
  ]
}'),
('GitHub Issue Notifier', 'Assign GitHub issues to developers and notify on Telegram', 'Development', 'webhook', '{
  "trigger": {
    "type": "webhook",
    "config": {"endpoint": "/github-webhook", "events": ["issues.opened"]}
  },
  "steps": [
    {"type": "llm_analyze", "config": {"prompt": "Analyze this GitHub issue and suggest the best developer to assign based on the description"}},
    {"type": "github_assign", "config": {"assignee": "{{suggested_dev}}"}},
    {"type": "telegram_send", "config": {"chat_id": "", "message": "New issue assigned: {{issue_title}} to {{assignee}}"}}
  ]
}');