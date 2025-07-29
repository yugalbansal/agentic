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

    const { agent_id, trigger_data } = await req.json();

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agent_id)
      .eq('user_id', user.user.id)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('agent_executions')
      .insert({
        agent_id,
        user_id: user.user.id,
        status: 'running',
        trigger_data,
      })
      .select()
      .single();

    if (execError) {
      return new Response(JSON.stringify({ error: execError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute agent workflow
    const startTime = Date.now();
    const result = await executeAgentWorkflow(agent, trigger_data, user.user.id);
    const duration = Date.now() - startTime;

    // Update execution record
    await supabase
      .from('agent_executions')
      .update({
        status: result.success ? 'completed' : 'failed',
        execution_log: result.log,
        error_message: result.error,
        output_data: result.output,
        duration_ms: duration,
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution.id);

    // Update agent last run
    await supabase
      .from('agents')
      .update({ 
        last_run_at: new Date().toISOString(),
        status: result.success ? 'active' : 'error' 
      })
      .eq('id', agent_id);

    return new Response(JSON.stringify({ 
      execution_id: execution.id,
      success: result.success,
      output: result.output,
      error: result.error
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error executing agent:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeAgentWorkflow(agent: any, triggerData: any, userId: string) {
  const log: string[] = [];
  let output: any = {};
  
  try {
    log.push(`Starting execution of agent: ${agent.name}`);
    log.push(`Trigger data: ${JSON.stringify(triggerData)}`);

    // Get user's service connections
    const { data: connections } = await supabase
      .from('service_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    const serviceMap = new Map();
    connections?.forEach(conn => {
      serviceMap.set(conn.service_type, conn);
    });

    // Process each workflow step
    for (let i = 0; i < agent.workflow_steps.length; i++) {
      const step = agent.workflow_steps[i];
      log.push(`Executing step ${i + 1}: ${step.type}`);

      const stepResult = await executeWorkflowStep(step, output, serviceMap, log);
      
      if (!stepResult.success) {
        throw new Error(`Step ${i + 1} failed: ${stepResult.error}`);
      }

      output = { ...output, ...stepResult.output };
      log.push(`Step ${i + 1} completed successfully`);
    }

    log.push('Agent execution completed successfully');
    return {
      success: true,
      log: log.join('\n'),
      output,
      error: null,
    };

  } catch (error) {
    log.push(`Agent execution failed: ${error.message}`);
    return {
      success: false,
      log: log.join('\n'),
      output,
      error: error.message,
    };
  }
}

async function executeWorkflowStep(step: any, previousOutput: any, serviceMap: Map<string, any>, log: string[]) {
  try {
    switch (step.type) {
      case 'llm':
      case 'llm_summarize':
      case 'llm_process':
      case 'llm_analyze':
        return await executeLLMStep(step, previousOutput, log);
      
      case 'gmail':
      case 'gmail_fetch':
      case 'gmail_send':
        return await executeGmailStep(step, serviceMap.get('gmail'), previousOutput, log);
      
      case 'notion':
      case 'notion_create':
      case 'notion_create_page':
        return await executeNotionStep(step, serviceMap.get('notion'), previousOutput, log);
      
      case 'telegram':
      case 'telegram_send':
      case 'telegram_message':
        return await executeTelegramStep(step, serviceMap.get('telegram'), previousOutput, log);
      
      case 'webhook':
      case 'webhook_call':
        return await executeWebhookStep(step, previousOutput, log);
      
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: {}
    };
  }
}

async function executeLLMStep(step: any, previousOutput: any, log: string[]) {
  try {
    const config = step.config || {};
    const prompt = config.prompt || config.template || 'Summarize the following content:';
    
    // Get content from previous step or trigger data
    let content = '';
    if (previousOutput && typeof previousOutput === 'object') {
      if (previousOutput.emails && previousOutput.emails.length > 0) {
        content = previousOutput.emails[0].body || previousOutput.emails[0].snippet || '';
      } else if (previousOutput.content) {
        content = previousOutput.content;
      } else if (previousOutput.text) {
        content = previousOutput.text;
      } else if (previousOutput.summary) {
        content = previousOutput.summary;
      } else {
        content = JSON.stringify(previousOutput);
      }
    } else {
      content = String(previousOutput || '');
    }

    // Replace variables in prompt
    const finalPrompt = replaceVariables(prompt, { content, previous_output: content });
    log.push(`LLM processing content length: ${content.length} chars`);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that processes content according to user instructions.' },
          { role: 'user', content: `${finalPrompt}\n\nContent to process:\n${content}` }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;
    
    log.push(`LLM processing completed. Output length: ${result.length} chars`);
    
    return {
      success: true,
      output: { 
        llm_result: result, 
        summary: result,
        content: result,
        text: result 
      },
      error: null
    };
  } catch (error) {
    log.push(`LLM step failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      output: {}
    };
  }
}

async function executeGmailStep(step: any, gmailConnection: any, previousOutput: any, log: string[]) {
  try {
    if (!gmailConnection || !gmailConnection.access_token) {
      throw new Error('Gmail connection not found or invalid');
    }

    const config = step.config || {};
    const action = config.action || 'send';
    
    if (action === 'send') {
      const to = replaceVariables(config.to || '', { previous_output: previousOutput });
      const subject = replaceVariables(config.subject || '', { previous_output: previousOutput });
      const content = replaceVariables(config.content || config.body || '', { 
        previous_output: previousOutput,
        summary: previousOutput?.content || previousOutput?.summary || ''
      });

      // Create email message
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        content
      ].join('\n');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gmailConnection.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: btoa(email),
        }),
      });

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      log.push(`Email sent successfully to ${to}`);
      
      return {
        success: true,
        output: {
          message_id: result.id,
          to,
          subject,
        },
        error: null
      };
    } else {
      // For other Gmail operations (read, search, etc.)
      log.push('Gmail read operation (simulated)');
      return {
        success: true,
        output: { 
          emails: [
            {
              subject: 'Sample Email',
              body: 'This is a sample email body',
              from: 'sender@example.com'
            }
          ]
        },
        error: null
      };
    }
  } catch (error) {
    log.push(`Gmail step failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      output: {}
    };
  }
}

async function executeNotionStep(step: any, notionConnection: any, previousOutput: any, log: string[]) {
  try {
    if (!notionConnection || !notionConnection.access_token) {
      throw new Error('Notion connection not found or invalid');
    }

    const config = step.config || {};
    const title = replaceVariables(config.title || 'New Page', { 
      previous_output: previousOutput,
      summary: previousOutput?.content || previousOutput?.summary || ''
    });
    const content = replaceVariables(config.content || '', { 
      previous_output: previousOutput,
      summary: previousOutput?.content || previousOutput?.summary || ''
    });

    // Create page in Notion
    const pageData: any = {
      parent: config.database_id ? 
        { database_id: config.database_id } : 
        { page_id: config.parent_page_id || 'root' },
      properties: {
        title: {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        }
      }
    };

    // Add content as blocks if provided
    if (content) {
      pageData.children = [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: content
                }
              }
            ]
          }
        }
      ];
    }

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionConnection.access_token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify(pageData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Notion API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    log.push(`Notion page created: ${title}`);
    
    return {
      success: true,
      output: { 
        page_id: result.id,
        title,
        url: result.url,
      },
      error: null
    };
  } catch (error) {
    log.push(`Notion step failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      output: {}
    };
  }
}

async function executeTelegramStep(step: any, telegramConnection: any, previousOutput: any, log: string[]) {
  try {
    if (!telegramConnection || !telegramConnection.access_token) {
      throw new Error('Telegram connection not found or invalid');
    }

    const config = step.config || {};
    const botToken = telegramConnection.access_token;
    const chatId = config.chat_id || telegramConnection.service_config?.chat_id;
    const message = replaceVariables(config.message || config.text || '', { 
      previous_output: previousOutput,
      summary: previousOutput?.content || previousOutput?.summary || ''
    });

    if (!chatId) {
      throw new Error('Telegram chat ID not configured');
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Telegram API error: ${response.status} - ${errorData.description || response.statusText}`);
    }

    const result = await response.json();
    log.push(`Telegram message sent to chat ${chatId}`);
    
    return {
      success: true,
      output: {
        message_id: result.result.message_id,
        chat_id: chatId,
      },
      error: null
    };
  } catch (error) {
    log.push(`Telegram step failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      output: {}
    };
  }
}

async function executeWebhookStep(step: any, previousOutput: any, log: string[]) {
  try {
    const config = step.config || {};
    const url = config.url || config.webhook_url || '';
    const method = config.method || 'POST';
    const headers = config.headers || {};
    
    if (!url) {
      throw new Error('Webhook URL not configured');
    }

    // Prepare payload with variable replacement
    let payload = config.payload || {};
    if (typeof payload === 'string') {
      payload = replaceVariables(payload, { 
        previous_output: previousOutput,
        summary: previousOutput?.content || previousOutput?.summary || ''
      });
    } else {
      payload = replaceVariablesInObject(payload, { 
        previous_output: previousOutput,
        summary: previousOutput?.content || previousOutput?.summary || ''
      });
    }

    // If no custom payload, send the previous output
    if (!config.payload && previousOutput) {
      payload = previousOutput;
    }

    const fetchOptions: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FlowBot-AI/1.0',
        ...headers,
      },
    };

    if (method !== 'GET' && payload) {
      fetchOptions.body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    }

    log.push(`Making ${method} request to ${url}`);
    const response = await fetch(url, fetchOptions);
    
    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = await response.text();
    }

    log.push(`Webhook called: ${method} ${url} - Status: ${response.status}`);
    
    return {
      success: response.ok,
      output: {
        status: response.status,
        response: responseData,
        url,
        payload_sent: payload,
      },
      error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
    };
  } catch (error) {
    log.push(`Webhook step failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      output: {}
    };
  }
}

function replaceVariables(text: string, variables: any): string {
  let result = text;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key]);
  });
  return result;
}

function replaceVariablesInObject(obj: any, variables: any): any {
  const result = { ...obj };
  Object.keys(result).forEach(key => {
    if (typeof result[key] === 'string') {
      result[key] = replaceVariables(result[key], variables);
    }
  });
  return result;
}