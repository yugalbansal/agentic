import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function useApi() {
  const { toast } = useToast();
  const { user } = useAuth();

  const callFunction = useCallback(async (functionName: string, body?: any, method: string = 'POST') => {
    try {
      if (!user) {
        throw new Error('Not authenticated - please sign in');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session - please sign in again');
      }

      console.log(`Calling function: ${functionName}`, { body, method });

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: body || null,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        console.error(`Function ${functionName} error:`, error);
        throw new Error(error.message || `Function ${functionName} failed`);
      }

      console.log(`Function ${functionName} response:`, data);
      return data;
    } catch (error: any) {
      console.error(`Error calling ${functionName}:`, error);
      
      // Don't show toast for authentication errors, let the auth system handle it
      if (!error.message?.includes('Not authenticated')) {
        toast({
          title: 'Error',
          description: error.message || 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
      
      throw error;
    }
  }, [toast, user]);

  // Agent Management
  const createAgent = useCallback(async (agentData: any) => {
    return await callFunction('agents', agentData);
  }, [callFunction]);

  const getAgents = useCallback(async () => {
    return await callFunction('agents', null, 'GET');
  }, [callFunction]);

  const getAgent = useCallback(async (agentId: string) => {
    return await callFunction(`agents/${agentId}`, null, 'GET');
  }, [callFunction]);

  const updateAgent = useCallback(async (agentId: string, updates: any) => {
    return await callFunction(`agents/${agentId}`, updates, 'PUT');
  }, [callFunction]);

  const deleteAgent = useCallback(async (agentId: string) => {
    return await callFunction(`agents/${agentId}`, null, 'DELETE');
  }, [callFunction]);

  const executeAgent = useCallback(async (agentId: string, triggerData?: any) => {
    return await callFunction('execute-agent', {
      agent_id: agentId,
      trigger_data: triggerData || {},
    });
  }, [callFunction]);

  // Service Connections
  const getServiceConnections = useCallback(async () => {
    const result = await callFunction('service-connections', null, 'GET');
    return result || { connections: [] };
  }, [callFunction]);

  const connectService = useCallback(async (serviceData: any) => {
    return await callFunction('service-connections', serviceData, 'POST');
  }, [callFunction]);

  const disconnectService = useCallback(async (serviceType: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/service-connections/${serviceType}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect service');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error disconnecting service:', error);
      throw error;
    }
  }, [callFunction]);

  // Google OAuth
  const startGoogleOAuth = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth/start`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to start OAuth flow');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error starting Google OAuth:', error);
      throw error;
    }
  }, [callFunction]);

  // Workflow Templates
  const getWorkflowTemplates = useCallback(async (category?: string, triggerType?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (triggerType) params.append('trigger_type', triggerType);
    
    return await callFunction(`workflow-templates?${params.toString()}`, null, 'GET');
  }, [callFunction]);

  const createWorkflowTemplate = useCallback(async (templateData: any) => {
    return await callFunction('workflow-templates', templateData);
  }, [callFunction]);

  // Agent Logs
  const getAgentLogs = useCallback(async (filters?: { agentId?: string; status?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (filters?.agentId) params.append('agent_id', filters.agentId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    return await callFunction(`agent-logs?${params.toString()}`, null, 'GET');
  }, [callFunction]);

  const getAgentLog = useCallback(async (executionId: string) => {
    return await callFunction(`agent-logs/${executionId}`, null, 'GET');
  }, [callFunction]);

  const retryExecution = useCallback(async (executionId: string) => {
    return await callFunction(`agent-logs/${executionId}/retry`, {});
  }, [callFunction]);

  return {
    // Agent Management
    createAgent,
    getAgents,
    getAgent,
    updateAgent,
    deleteAgent,
    executeAgent,
    
    // Service Connections
    getServiceConnections,
    connectService,
    disconnectService,
    
    // OAuth
    startGoogleOAuth,
    
    // Workflow Templates
    getWorkflowTemplates,
    createWorkflowTemplate,
    
    // Agent Logs
    getAgentLogs,
    getAgentLog,
    retryExecution,
  };
}