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
    console.log('Scheduler function triggered');

    // Get all active agents that need to run
    const now = new Date();
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('status', 'active')
      .lte('next_run_at', now.toISOString());

    if (error) {
      console.error('Error fetching agents:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${agents?.length || 0} agents to process`);

    const results = [];
    
    for (const agent of agents || []) {
      try {
        console.log(`Processing agent: ${agent.name} (${agent.id})`);

        // Check if agent should run based on trigger type
        const shouldRun = await shouldAgentRun(agent);
        
        if (!shouldRun.run) {
          console.log(`Agent ${agent.name} should not run: ${shouldRun.reason}`);
          continue;
        }

        // Execute the agent
        const executionResult = await executeAgent(agent, shouldRun.triggerData);
        
        results.push({
          agent_id: agent.id,
          agent_name: agent.name,
          success: executionResult.success,
          error: executionResult.error,
        });

        // Calculate next run time
        const nextRunAt = calculateNextRunTime(agent);
        
        // Update agent status
        await supabase
          .from('agents')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunAt,
            status: executionResult.success ? 'active' : 'error',
          })
          .eq('id', agent.id);

        console.log(`Agent ${agent.name} processed successfully`);

      } catch (agentError) {
        console.error(`Error processing agent ${agent.name}:`, agentError);
        results.push({
          agent_id: agent.id,
          agent_name: agent.name,
          success: false,
          error: agentError.message,
        });
      }
    }

    return new Response(JSON.stringify({ 
      processed: results.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scheduler function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function shouldAgentRun(agent: any) {
  try {
    switch (agent.trigger_type) {
      case 'scheduler':
        return { run: true, triggerData: { scheduled_time: new Date().toISOString() } };
      
      case 'gmail':
        return await checkGmailTrigger(agent);
      
      case 'webhook':
        // Webhook triggers are handled separately
        return { run: false, reason: 'Webhook triggers are event-driven' };
      
      case 'telegram':
        return await checkTelegramTrigger(agent);
      
      default:
        return { run: false, reason: 'Unknown trigger type' };
    }
  } catch (error) {
    return { run: false, reason: error.message };
  }
}

async function checkGmailTrigger(agent: any) {
  // Get user's Gmail connection
  const { data: connection } = await supabase
    .from('service_connections')
    .select('*')
    .eq('user_id', agent.user_id)
    .eq('service_type', 'gmail')
    .eq('is_active', true)
    .single();

  if (!connection) {
    return { run: false, reason: 'Gmail connection not found' };
  }

  // Check for new emails matching criteria
  const config = agent.trigger_config;
  const query = config.query || '';
  const label = config.label || '';

  // Simulate Gmail API check
  // In real implementation, you'd use Gmail API to check for new emails
  const hasNewEmails = Math.random() > 0.7; // 30% chance of new emails

  if (hasNewEmails) {
    return {
      run: true,
      triggerData: {
        emails: [
          {
            id: 'email_' + Date.now(),
            subject: 'Sample Email Subject',
            body: 'This is a sample email body',
            from: 'sender@example.com',
            date: new Date().toISOString(),
          }
        ]
      }
    };
  }

  return { run: false, reason: 'No new emails matching criteria' };
}

async function checkTelegramTrigger(agent: any) {
  // Get user's Telegram connection
  const { data: connection } = await supabase
    .from('service_connections')
    .select('*')
    .eq('user_id', agent.user_id)
    .eq('service_type', 'telegram')
    .eq('is_active', true)
    .single();

  if (!connection) {
    return { run: false, reason: 'Telegram connection not found' };
  }

  // Check for new messages
  // In real implementation, you'd use Telegram Bot API to check for updates
  const hasNewMessages = Math.random() > 0.8; // 20% chance of new messages

  if (hasNewMessages) {
    return {
      run: true,
      triggerData: {
        messages: [
          {
            id: 'msg_' + Date.now(),
            text: 'Sample Telegram message',
            from: 'user123',
            date: new Date().toISOString(),
          }
        ]
      }
    };
  }

  return { run: false, reason: 'No new Telegram messages' };
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

function calculateNextRunTime(agent: any): string {
  const scheduleConfig = agent.schedule_config || {};
  const interval = scheduleConfig.interval || 'hourly';
  
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
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // Default to hourly
  }
}