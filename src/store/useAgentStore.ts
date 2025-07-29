import { create } from 'zustand';

export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error';
  lastRun?: Date;
  description?: string;
  workflow?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentLog {
  id: string;
  agentId: string;
  agentName: string;
  triggerTime: Date;
  status: 'success' | 'failed';
  output?: string;
  error?: string;
  duration?: number;
}

interface AgentStore {
  agents: Agent[];
  logs: AgentLog[];
  isLoading: boolean;
  
  // Actions
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  addLog: (log: Omit<AgentLog, 'id'>) => void;
  setLoading: (loading: boolean) => void;
  setAgents: (agents: Agent[]) => void;
  setLogs: (logs: AgentLog[]) => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [
    // Sample data
    {
      id: '1',
      name: 'Invoice Processor',
      status: 'active',
      lastRun: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      description: 'Processes Gmail invoices and creates Notion pages',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: '2', 
      name: 'Meeting Summarizer',
      status: 'paused',
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      description: 'Summarizes meeting recordings and sends to Telegram',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      id: '3',
      name: 'Lead Qualifier',
      status: 'error',
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      description: 'Qualifies leads from Gmail and updates Notion database',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 14 days ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    }
  ],
  
  logs: [
    {
      id: '1',
      agentId: '1',
      agentName: 'Invoice Processor',
      triggerTime: new Date(Date.now() - 1000 * 60 * 30),
      status: 'success',
      output: 'Processed invoice #12345 and created Notion page',
      duration: 1200
    },
    {
      id: '2',
      agentId: '2',
      agentName: 'Meeting Summarizer', 
      triggerTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
      status: 'success',
      output: 'Summarized 45-minute team meeting',
      duration: 800
    },
    {
      id: '3',
      agentId: '3',
      agentName: 'Lead Qualifier',
      triggerTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
      status: 'failed',
      error: 'Gmail API rate limit exceeded',
      duration: 300
    }
  ],
  
  isLoading: false,

  addAgent: (agentData) => set((state) => ({
    agents: [...state.agents, {
      ...agentData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }]
  })),

  updateAgent: (id, updates) => set((state) => ({
    agents: state.agents.map(agent => 
      agent.id === id 
        ? { ...agent, ...updates, updatedAt: new Date() }
        : agent
    )
  })),

  deleteAgent: (id) => set((state) => ({
    agents: state.agents.filter(agent => agent.id !== id)
  })),

  addLog: (logData) => set((state) => ({
    logs: [{ ...logData, id: Date.now().toString() }, ...state.logs]
  })),

  setLoading: (loading) => set({ isLoading: loading }),

  setAgents: (agents) => set({ agents }),

  setLogs: (logs) => set({ logs }),
}));