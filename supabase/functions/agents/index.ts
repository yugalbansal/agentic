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
    const path = url.pathname.split('/').pop();
    const method = req.method;

    // GET /agents - List user agents
    if (method === 'GET' && (!path || path === 'agents')) {
      const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ agents }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /agents - Create new agent
    if (method === 'POST') {
      let body;
      try {
        const text = await req.text();
        body = text ? JSON.parse(text) : {};
      } catch (parseError) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const { name, description, trigger_type, trigger_config, workflow_steps, schedule_config } = body;

      // Generate LangChain code for the agent
      const generatedCode = await generateAgentCode({
        trigger_type,
        trigger_config,
        workflow_steps,
      });

      const { data: agent, error } = await supabase
        .from('agents')
        .insert({
          user_id: user.user.id,
          name,
          description,
          trigger_type,
          trigger_config,
          workflow_steps,
          schedule_config,
          generated_code: generatedCode,
          status: 'inactive',
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ agent }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /agents/{id} - Get specific agent
    if (method === 'GET' && path) {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', path)
        .eq('user_id', user.user.id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: 'Agent not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ agent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /agents/{id} - Update agent
    if (method === 'PUT' && path) {
      let body;
      try {
        const text = await req.text();
        body = text ? JSON.parse(text) : {};
      } catch (parseError) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const { data: agent, error } = await supabase
        .from('agents')
        .update(body)
        .eq('id', path)
        .eq('user_id', user.user.id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ agent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /agents/{id} - Delete agent
    if (method === 'DELETE' && path) {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', path)
        .eq('user_id', user.user.id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in agents function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateAgentCode(config: any) {
  try {
    const prompt = `You are FlowBot AI — a no-code AI agent creator.

Build a LangChain Python script that performs:

Trigger:
${JSON.stringify(config.trigger_config, null, 2)}

Steps:
${JSON.stringify(config.workflow_steps, null, 2)}

Use proper LangChain tools and LLM calls. Use placeholders for API keys (Gmail, Notion, etc.). Output only clean, executable Python code.

Requirements:
- Use langchain library
- Include proper error handling
- Add logging
- Use environment variables for API keys
- Make it modular and well-structured`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: 'You are a Python and LangChain expert. Generate clean, executable code only.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenRouter API error:', data);
      return `# Error generating code: ${data.error?.message || response.statusText}`;
    }
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenRouter response structure:', data);
      return `# Error: Invalid response from AI service`;
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating agent code:', error);
    return `# Error generating code: ${error.message}`;
  }
}