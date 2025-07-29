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

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const GOOGLE_REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth/callback`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Start OAuth flow
    if (path.includes('/start')) {
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

      // Store user ID in state parameter for callback
      const state = btoa(JSON.stringify({ 
        user_id: user.user.id,
        timestamp: Date.now()
      }));

      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ].join(' ');

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      return new Response(JSON.stringify({ 
        auth_url: authUrl.toString() 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle OAuth callback
    if (path.includes('/callback')) {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        return new Response(`
          <html>
            <body>
              <h1>OAuth Error</h1>
              <p>Error: ${error}</p>
              <script>window.close();</script>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (!code || !state) {
        return new Response(`
          <html>
            <body>
              <h1>OAuth Error</h1>
              <p>Missing authorization code or state</p>
              <script>window.close();</script>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      try {
        // Decode state to get user ID
        const stateData = JSON.parse(atob(state));
        const userId = stateData.user_id;

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: GOOGLE_REDIRECT_URI,
          }),
        });

        const tokens = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error(tokens.error_description || 'Failed to exchange code for tokens');
        }

        // Get user info
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
          },
        });

        const userInfo = await userInfoResponse.json();

        // Store connection in database
        const { error: dbError } = await supabase
          .from('service_connections')
          .upsert({
            user_id: userId,
            service_type: 'gmail',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_in ? 
              new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
            service_config: {
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
              scopes: ['gmail.readonly', 'gmail.send'],
            },
            is_active: true,
            connected_at: new Date().toISOString(),
          });

        if (dbError) {
          throw new Error('Failed to save connection: ' + dbError.message);
        }

        return new Response(`
          <html>
            <body>
              <h1>Gmail Connected Successfully!</h1>
              <p>You can now close this window and return to FlowBot AI.</p>
              <script>
                window.opener?.postMessage({ type: 'GMAIL_CONNECTED', success: true }, '*');
                setTimeout(() => window.close(), 2000);
              </script>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });

      } catch (error) {
        console.error('OAuth callback error:', error);
        return new Response(`
          <html>
            <body>
              <h1>Connection Failed</h1>
              <p>Error: ${error.message}</p>
              <script>
                window.opener?.postMessage({ type: 'GMAIL_CONNECTED', success: false, error: '${error.message}' }, '*');
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in google-oauth function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});