import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const method = req.method;
    const pathParts = url.pathname.split('/').filter(part => part.length > 0);
    const lastPart = pathParts[pathParts.length - 1];

    console.log('Agent-logs request:', { method, pathParts, searchParams: url.search });

    // GET /agent-logs - List execution logs (when no specific ID in path)
    if (method === 'GET' && (pathParts.length <= 1 || url.searchParams.toString().length > 0)) {
      const agentId = url.searchParams.get('agent_id');
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('agent_executions')
        .select(`
          *,
          agents!inner(name, description)
        `)
        .eq('user_id', user.user.id)
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data: executions, error } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Format the response
      const logs = executions?.map(execution => ({
        id: execution.id,
        agent_id: execution.agent_id,
        agent_name: execution.agents.name,
        status: execution.status,
        trigger_data: execution.trigger_data,
        execution_log: execution.execution_log,
        error_message: execution.error_message,
        output_data: execution.output_data,
        duration_ms: execution.duration_ms,
        started_at: execution.started_at,
        completed_at: execution.completed_at,
      })) || [];

      return new Response(JSON.stringify({ logs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /agent-logs/{id} - Get specific execution log  
    if (method === 'GET' && pathParts.length >= 2 && lastPart !== 'retry') {
      const executionId = lastPart;
      
      const { data: execution, error } = await supabase
        .from('agent_executions')
        .select(`
          *,
          agents!inner(name, description)
        `)
        .eq('id', executionId)
        .eq('user_id', user.user.id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: 'Execution log not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const log = {
        id: execution.id,
        agent_id: execution.agent_id,
        agent_name: execution.agents.name,
        agent_description: execution.agents.description,
        status: execution.status,
        trigger_data: execution.trigger_data,
        execution_log: execution.execution_log,
        error_message: execution.error_message,
        output_data: execution.output_data,
        duration_ms: execution.duration_ms,
        started_at: execution.started_at,
        completed_at: execution.completed_at,
      };

      return new Response(JSON.stringify({ log }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /agent-logs/{execution_id}/retry - Retry failed execution
    if (method === 'POST' && url.pathname.includes('/retry')) {
      const executionId = pathParts[pathParts.length - 2]; // Get execution ID before /retry
      
      // Get the original execution
      const { data: originalExecution, error: fetchError } = await supabase
        .from('agent_executions')
        .select(`
          *,
          agents!inner(*)
        `)
        .eq('id', executionId)
        .eq('user_id', user.user.id)
        .single();

      if (fetchError || !originalExecution) {
        return new Response(JSON.stringify({ error: 'Execution not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Only allow retrying failed executions
      if (originalExecution.status !== 'failed') {
        return new Response(JSON.stringify({ error: 'Can only retry failed executions' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Call execute-agent to retry
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/execute-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          agent_id: originalExecution.agent_id,
          trigger_data: originalExecution.trigger_data,
        }),
      });

      const result = await response.json();

      return new Response(JSON.stringify({
        success: true,
        new_execution_id: result.execution_id,
        message: 'Agent execution retried successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in agent-logs function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});