const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Environment variables validation
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY environment variable is required');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Import Supabase client inside the handler to avoid module loading issues
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.7.1');
    
    // Initialize Supabase client with service role for server-side operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // Authenticate user
    const authResult = await authenticateUser(req);
    if (!authResult.success) {
      return createErrorResponse(authResult.error, authResult.status, corsHeaders);
    }
    const { user, supabase: userSupabase } = authResult;

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0);
    const agentId = pathSegments[pathSegments.length - 1];
    const method = req.method;

    console.log(`Processing request: ${method} for user ${user.id}`);

    // Route handling
    switch (method) {
      case 'GET':
        if (agentId && agentId !== 'agents') {
          return await getAgent(user.id, agentId, supabase);
        } else {
          return await getAgents(user.id, supabase);
        }

      case 'POST':
        return await createAgent(req, user.id, supabase);

      case 'PUT':
        if (!agentId || agentId === 'agents') {
          return createErrorResponse('Agent ID is required for updates', 400, corsHeaders);
        }
        return await updateAgent(req, user.id, agentId, supabase);

      case 'DELETE':
        if (!agentId || agentId === 'agents') {
          return createErrorResponse('Agent ID is required for deletion', 400, corsHeaders);
        }
        return await deleteAgent(user.id, agentId, supabase);

      default:
        return createErrorResponse('Method not allowed', 405, corsHeaders);
    }

  } catch (error) {
    console.error('Unhandled error in agents function:', error);
    return createErrorResponse('Internal server error', 500, corsHeaders);
  }
});

// Authentication helper
async function authenticateUser(req: Request) {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.7.1');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return { 
        success: false, 
        error: 'Authorization header is required', 
        status: 401 
      };
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return { 
        success: false, 
        error: 'Invalid authorization header format', 
        status: 401 
      };
    }

    const { data: user, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('Auth error:', authError);
      return { 
        success: false, 
        error: 'Authentication failed', 
        status: 401 
      };
    }

    if (!user?.user) {
      return { 
        success: false, 
        error: 'User not found', 
        status: 401 
      };
    }

    return { 
      success: true, 
      user: user.user,
      supabase
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { 
      success: false, 
      error: 'Authentication failed', 
      status: 401 
    };
  }
}

// Get all agents for a user
async function getAgents(userId: string, supabase: any) {
  try {
    console.log(`Fetching agents for user: ${userId}`);

    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching agents:', error);
      return createErrorResponse('Failed to fetch agents', 500, corsHeaders);
    }

    console.log(`Found ${agents?.length || 0} agents for user ${userId}`);

    return new Response(JSON.stringify({ 
      success: true,
      agents: agents || [] 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in getAgents:', error);
    return createErrorResponse('Failed to fetch agents', 500, corsHeaders);
  }
}

// Get a specific agent
async function getAgent(userId: string, agentId: string, supabase: any) {
  try {
    console.log(`Fetching agent ${agentId} for user: ${userId}`);

    // Validate UUID format
    if (!isValidUUID(agentId)) {
      return createErrorResponse('Invalid agent ID format', 400, corsHeaders);
    }

    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Database error fetching agent:', error);
      if (error.code === 'PGRST116') {
        return createErrorResponse('Agent not found', 404, corsHeaders);
      }
      return createErrorResponse('Failed to fetch agent', 500, corsHeaders);
    }

    return new Response(JSON.stringify({ 
      success: true,
      agent 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in getAgent:', error);
    return createErrorResponse('Failed to fetch agent', 500, corsHeaders);
  }
}

// Create a new agent
async function createAgent(req: Request, userId: string, supabase: any) {
  try {
    console.log(`Creating agent for user: ${userId}`);

    // Parse and validate request body
    const bodyResult = await parseRequestBody(req);
    if (!bodyResult.success) {
      return createErrorResponse(bodyResult.error, 400, corsHeaders);
    }

    const body = bodyResult.data;
    const validationResult = validateAgentData(body);
    if (!validationResult.success) {
      return createErrorResponse(validationResult.error, 400, corsHeaders);
    }

    const { name, description, trigger_type, trigger_config, workflow_steps, schedule_config } = body;

    // Generate AI code for the agent
    console.log('Generating AI code for agent...');
    const generatedCode = await generateAgentCode({
      name,
      trigger_type,
      trigger_config,
      workflow_steps,
    });

    // Calculate next run time for scheduled agents
    const nextRunAt = trigger_type === 'scheduler' ? calculateNextRunTime(schedule_config) : null;

    // Insert agent into database
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || null,
        trigger_type,
        trigger_config: trigger_config || {},
        workflow_steps: workflow_steps || [],
        schedule_config: schedule_config || {},
        generated_code: generatedCode,
        status: 'inactive',
        next_run_at: nextRunAt,
        version: 1,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error creating agent:', error);
      return createErrorResponse('Failed to create agent', 500, corsHeaders);
    }

    console.log(`Agent created successfully: ${agent.id}`);

    return new Response(JSON.stringify({ 
      success: true,
      agent 
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in createAgent:', error);
    return createErrorResponse('Failed to create agent', 500, corsHeaders);
  }
}

// Update an existing agent
async function updateAgent(req: Request, userId: string, agentId: string, supabase: any) {
  try {
    console.log(`Updating agent ${agentId} for user: ${userId}`);

    // Validate UUID format
    if (!isValidUUID(agentId)) {
      return createErrorResponse('Invalid agent ID format', 400, corsHeaders);
    }

    // Parse request body
    const bodyResult = await parseRequestBody(req);
    if (!bodyResult.success) {
      return createErrorResponse(bodyResult.error, 400, corsHeaders);
    }

    const updates = bodyResult.data;

    // Validate updates if they contain agent data
    if (updates.name || updates.trigger_type || updates.workflow_steps) {
      const validationResult = validateAgentData(updates, false);
      if (!validationResult.success) {
        return createErrorResponse(validationResult.error, 400, corsHeaders);
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only include fields that are provided
    const allowedFields = [
      'name', 'description', 'status', 'trigger_type', 'trigger_config', 
      'workflow_steps', 'schedule_config'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // Regenerate code if workflow changed
    if (updates.workflow_steps || updates.trigger_type || updates.trigger_config) {
      console.log('Regenerating AI code due to workflow changes...');
      
      // Get current agent data to merge with updates
      const { data: currentAgent } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .eq('user_id', userId)
        .single();

      if (currentAgent) {
        const mergedData = { ...currentAgent, ...updates };
        updateData.generated_code = await generateAgentCode({
          name: mergedData.name,
          trigger_type: mergedData.trigger_type,
          trigger_config: mergedData.trigger_config,
          workflow_steps: mergedData.workflow_steps,
        });
        updateData.version = (currentAgent.version || 1) + 1;
      }
    }

    // Update next run time for scheduled agents
    if (updates.schedule_config && updates.trigger_type === 'scheduler') {
      updateData.next_run_at = calculateNextRunTime(updates.schedule_config);
    }

    // Perform the update
    const { data: agent, error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', agentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Database error updating agent:', error);
      if (error.code === 'PGRST116') {
        return createErrorResponse('Agent not found', 404, corsHeaders);
      }
      return createErrorResponse('Failed to update agent', 500, corsHeaders);
    }

    console.log(`Agent updated successfully: ${agentId}`);

    return new Response(JSON.stringify({ 
      success: true,
      agent 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in updateAgent:', error);
    return createErrorResponse('Failed to update agent', 500, corsHeaders);
  }
}

// Delete an agent
async function deleteAgent(userId: string, agentId: string, supabase: any) {
  try {
    console.log(`Deleting agent ${agentId} for user: ${userId}`);

    // Validate UUID format
    if (!isValidUUID(agentId)) {
      return createErrorResponse('Invalid agent ID format', 400, corsHeaders);
    }

    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId)
      .eq('user_id', userId);

    if (error) {
      console.error('Database error deleting agent:', error);
      return createErrorResponse('Failed to delete agent', 500, corsHeaders);
    }

    console.log(`Agent deleted successfully: ${agentId}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Agent deleted successfully' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in deleteAgent:', error);
    return createErrorResponse('Failed to delete agent', 500, corsHeaders);
  }
}

// Generate AI code for agent using OpenRouter
async function generateAgentCode(config: any): Promise<string> {
  try {
    if (!OPENROUTER_API_KEY) {
      console.warn('OpenRouter API key not configured, returning placeholder code');
      return generatePlaceholderCode(config);
    }

    const prompt = createCodeGenerationPrompt(config);

    console.log('Calling OpenRouter API for code generation...');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://flowbot-ai.com',
        'X-Title': 'FlowBot AI Agent Generator',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { 
            role: 'system', 
            content: 'You are a Python and LangChain expert. Generate clean, executable, production-ready code only. Include proper error handling, logging, and documentation.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 3000,
        temperature: 0.3,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenRouter response structure:', data);
      throw new Error('Invalid response from OpenRouter API');
    }
    
    const generatedCode = data.choices[0].message.content;
    console.log('AI code generated successfully');
    
    return generatedCode;

  } catch (error) {
    console.error('Error generating agent code:', error);
    return generatePlaceholderCode(config, error.message);
  }
}

// Create a detailed prompt for code generation
function createCodeGenerationPrompt(config: any): string {
  return `Generate a production-ready LangChain Python script for FlowBot AI agent: "${config.name}"

REQUIREMENTS:
- Use LangChain framework with proper imports
- Include comprehensive error handling and logging
- Use environment variables for all API keys and secrets
- Make the code modular with clear functions
- Add docstrings and comments
- Handle rate limits and API failures gracefully

AGENT CONFIGURATION:
Name: ${config.name}
Trigger Type: ${config.trigger_type}
Trigger Config: ${JSON.stringify(config.trigger_config, null, 2)}
Workflow Steps: ${JSON.stringify(config.workflow_steps, null, 2)}

STRUCTURE:
1. Import necessary libraries (langchain, os, logging, etc.)
2. Setup logging and environment variables
3. Define main agent class with methods for each workflow step
4. Implement error handling and retry logic
5. Add main execution function

OUTPUT: Only clean, executable Python code with no explanations.`;
}

// Generate placeholder code when AI generation fails
function generatePlaceholderCode(config: any, error?: string): string {
  const errorComment = error ? `# Error generating AI code: ${error}\n` : '';
  
  return `${errorComment}#!/usr/bin/env python3
"""
FlowBot AI Agent: ${config.name}
Generated: ${new Date().toISOString()}
Trigger: ${config.trigger_type}
"""

import os
import logging
from typing import Dict, Any, List
from langchain.schema import BaseMessage
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FlowBotAgent:
    """FlowBot AI Agent for ${config.name}"""
    
    def __init__(self):
        self.name = "${config.name}"
        self.trigger_type = "${config.trigger_type}"
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.7
        )
        
    def execute(self, trigger_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the agent workflow"""
        try:
            logger.info(f"Starting execution of agent: {self.name}")
            
            # Process workflow steps
            result = {"status": "success", "output": {}}
            
            # Add your workflow logic here based on:
            # Trigger Config: ${JSON.stringify(config.trigger_config)}
            # Workflow Steps: ${JSON.stringify(config.workflow_steps)}
            
            logger.info("Agent execution completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Agent execution failed: {str(e)}")
            return {"status": "error", "error": str(e)}

def main():
    """Main execution function"""
    agent = FlowBotAgent()
    result = agent.execute({})
    print(f"Agent result: {result}")

if __name__ == "__main__":
    main()
`;
}

// Validation helpers
function validateAgentData(data: any, requireAll: boolean = true): { success: boolean; error?: string } {
  if (requireAll) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      return { success: false, error: 'Agent name is required and must be a non-empty string' };
    }

    if (!data.trigger_type || typeof data.trigger_type !== 'string') {
      return { success: false, error: 'Trigger type is required' };
    }

    const validTriggerTypes = ['gmail', 'telegram', 'scheduler', 'webhook'];
    if (!validTriggerTypes.includes(data.trigger_type)) {
      return { success: false, error: `Invalid trigger type. Must be one of: ${validTriggerTypes.join(', ')}` };
    }
  }

  // Validate name if provided
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      return { success: false, error: 'Agent name must be a non-empty string' };
    }
    if (data.name.length > 255) {
      return { success: false, error: 'Agent name must be less than 255 characters' };
    }
  }

  // Validate description if provided
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      return { success: false, error: 'Description must be a string' };
    }
    if (data.description.length > 1000) {
      return { success: false, error: 'Description must be less than 1000 characters' };
    }
  }

  // Validate status if provided
  if (data.status !== undefined) {
    const validStatuses = ['active', 'inactive', 'paused', 'error'];
    if (!validStatuses.includes(data.status)) {
      return { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
    }
  }

  // Validate workflow_steps if provided
  if (data.workflow_steps !== undefined) {
    if (!Array.isArray(data.workflow_steps)) {
      return { success: false, error: 'Workflow steps must be an array' };
    }
  }

  return { success: true };
}

// Utility functions
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

async function parseRequestBody(req: Request): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const text = await req.text();
    if (!text.trim()) {
      return { success: false, error: 'Request body is required' };
    }

    const data = JSON.parse(text);
    return { success: true, data };
  } catch (error) {
    console.error('Error parsing request body:', error);
    return { success: false, error: 'Invalid JSON in request body' };
  }
}

function createErrorResponse(message: string, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify({ 
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function calculateNextRunTime(scheduleConfig: any): string | null {
  try {
    const interval = scheduleConfig?.interval || 'hourly';
    const now = new Date();
    
    switch (interval) {
      case 'minutely':
        return new Date(now.getTime() + 60 * 1000).toISOString();
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }
  } catch (error) {
    console.error('Error calculating next run time:', error);
    return null;
  }
}