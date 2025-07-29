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
    const url = new URL(req.url);
    const webhookPath = url.pathname.replace('/functions/v1/webhook-handler', '');
    
    console.log(`Webhook received: ${req.method} ${webhookPath}`);

    // Parse webhook payload
    let payload: any = {};
    try {
      if (req.method !== 'GET') {
        payload = await req.json();
      }
    } catch (error) {
      console.log('No JSON payload or parsing error:', error);
    }

    // Find agents that should be triggered by this webhook
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('trigger_type', 'webhook')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching webhook agents:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const matchingAgents = agents?.filter(agent => {
      const config = agent.trigger_config;
      const agentEndpoint = config.endpoint || '';
      
      // Check if webhook path matches agent endpoint
      if (agentEndpoint && webhookPath.startsWith(agentEndpoint)) {
        // Check if event type matches (for services like GitHub)
        if (config.events && config.events.length > 0) {
          const eventType = getEventType(req.headers, payload);
          return config.events.includes(eventType);
        }
        return true;
      }
      return false;
    }) || [];

    console.log(`Found ${matchingAgents.length} matching agents for webhook`);

    const results = [];

    // Execute each matching agent
    for (const agent of matchingAgents) {
      try {
        console.log(`Triggering agent: ${agent.name} (${agent.id})`);

        const executionResult = await executeAgent(agent, {
          webhook_path: webhookPath,
          method: req.method,
          headers: Object.fromEntries(req.headers.entries()),
          payload,
          timestamp: new Date().toISOString(),
        });

        results.push({
          agent_id: agent.id,
          agent_name: agent.name,
          success: executionResult.success,
          error: executionResult.error,
        });

        // Update agent last run time
        await supabase
          .from('agents')
          .update({
            last_run_at: new Date().toISOString(),
            status: executionResult.success ? 'active' : 'error',
          })
          .eq('id', agent.id);

      } catch (agentError) {
        console.error(`Error executing agent ${agent.name}:`, agentError);
        results.push({
          agent_id: agent.id,
          agent_name: agent.name,
          success: false,
          error: agentError.message,
        });
      }
    }

    // Return success response
    return new Response(JSON.stringify({
      message: 'Webhook processed successfully',
      agents_triggered: results.length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in webhook-handler function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getEventType(headers: Headers, payload: any): string {
  // GitHub webhook event type
  const githubEvent = headers.get('x-github-event');
  if (githubEvent) {
    return `github.${githubEvent}`;
  }

  // Slack webhook event type
  if (payload.type) {
    return `slack.${payload.type}`;
  }

  // Generic webhook event type
  if (payload.event_type) {
    return payload.event_type;
  }

  return 'unknown';
}

async function executeAgent(agent: any, triggerData: any) {
  try {
    // Call the execute-agent function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/execute-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        agent_id: agent.id,
        trigger_data: triggerData,
      }),
    });

    const result = await response.json();
    return {
      success: result.success || false,
      error: result.error || null,
      output: result.output || {},
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: {},
    };
  }
}