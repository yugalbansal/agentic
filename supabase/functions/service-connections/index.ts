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

    // GET /service-connections - List user connections
    if (method === 'GET') {
      const { data: connections, error } = await supabase
        .from('service_connections')
        .select('*')
        .eq('user_id', user.user.id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Don't expose sensitive tokens in the response
      const safeConnections = connections?.map(conn => ({
        id: conn.id,
        service_type: conn.service_type,
        is_active: conn.is_active,
        connected_at: conn.connected_at,
        service_config: conn.service_config,
      }));

      return new Response(JSON.stringify({ connections: safeConnections }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /service-connections - Create or update connection
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
      
      const { service_type, service_config, access_token, refresh_token } = body;

      // Validate the connection based on service type
      const validationResult = await validateServiceConnection(service_type, access_token, service_config);
      
      if (!validationResult.valid) {
        return new Response(JSON.stringify({ error: validationResult.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: connection, error } = await supabase
        .from('service_connections')
        .upsert({
          user_id: user.user.id,
          service_type,
          service_config: { ...service_config, ...validationResult.metadata },
          access_token,
          refresh_token,
          is_active: true,
          connected_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        connection: {
          id: connection.id,
          service_type: connection.service_type,
          is_active: connection.is_active,
          connected_at: connection.connected_at,
          service_config: connection.service_config,
        }
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /service-connections/{service_type} - Disconnect service
    if (method === 'DELETE') {
      const serviceType = url.pathname.split('/').pop();
      
      const { error } = await supabase
        .from('service_connections')
        .update({ is_active: false })
        .eq('user_id', user.user.id)
        .eq('service_type', serviceType);

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
    console.error('Error in service-connections function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function validateServiceConnection(serviceType: string, accessToken: string, config: any) {
  try {
    switch (serviceType) {
      case 'gmail':
        return await validateGmailConnection(accessToken);
      case 'notion':
        return await validateNotionConnection(accessToken);
      case 'telegram':
        return await validateTelegramConnection(accessToken, config);
      case 'slack':
        return await validateSlackConnection(accessToken);
      default:
        return { valid: false, error: 'Unsupported service type' };
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

async function validateGmailConnection(accessToken: string) {
  try {
    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return { valid: false, error: 'Invalid Gmail access token' };
    }

    const data = await response.json();
    return { 
      valid: true, 
      metadata: { 
        email: data.emailAddress,
        total_messages: data.messagesTotal 
      } 
    };
  } catch (error) {
    return { valid: false, error: 'Failed to validate Gmail connection' };
  }
}

async function validateNotionConnection(accessToken: string) {
  try {
    const response = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (!response.ok) {
      return { valid: false, error: 'Invalid Notion access token' };
    }

    const data = await response.json();
    return { 
      valid: true, 
      metadata: { 
        user_id: data.id,
        name: data.name 
      } 
    };
  } catch (error) {
    return { valid: false, error: 'Failed to validate Notion connection' };
  }
}

async function validateTelegramConnection(botToken: string, config: any) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    
    if (!response.ok) {
      return { valid: false, error: 'Invalid Telegram bot token' };
    }

    const data = await response.json();
    if (!data.ok) {
      return { valid: false, error: 'Invalid Telegram bot token' };
    }

    return { 
      valid: true, 
      metadata: { 
        bot_username: data.result.username,
        bot_name: data.result.first_name 
      } 
    };
  } catch (error) {
    return { valid: false, error: 'Failed to validate Telegram connection' };
  }
}

async function validateSlackConnection(accessToken: string) {
  try {
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    if (!data.ok) {
      return { valid: false, error: 'Invalid Slack access token' };
    }

    return { 
      valid: true, 
      metadata: { 
        team: data.team,
        user: data.user,
        team_id: data.team_id 
      } 
    };
  } catch (error) {
    return { valid: false, error: 'Failed to validate Slack connection' };
  }
}