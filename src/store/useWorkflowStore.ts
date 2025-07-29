import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

export interface WorkflowNode extends Node {
  data: {
    label: string;
    type: 'trigger' | 'action' | 'condition';
    service?: string;
    config?: Record<string, any>;
  };
}

interface WorkflowStore {
  nodes: WorkflowNode[];
  edges: Edge[];
  isValid: boolean;
  
  // Actions
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: string, data: Partial<WorkflowNode['data']>) => void;
  deleteNode: (id: string) => void;
  validateWorkflow: () => boolean;
  saveWorkflow: (name: string) => Promise<void>;
  loadWorkflow: (workflow: any) => void;
  clearWorkflow: () => void;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  isValid: false,

  setNodes: (nodes) => set({ nodes }),
  
  setEdges: (edges) => set({ edges }),

  addNode: (node) => set(state => ({ 
    nodes: [...state.nodes, node] 
  })),

  updateNode: (id, data) => set(state => ({
    nodes: state.nodes.map(node =>
      node.id === id
        ? { ...node, data: { ...node.data, ...data } }
        : node
    )
  })),

  deleteNode: (id) => set(state => ({
    nodes: state.nodes.filter(node => node.id !== id),
    edges: state.edges.filter(edge => edge.source !== id && edge.target !== id)
  })),

  validateWorkflow: () => {
    const { nodes, edges } = get();
    
    // Basic validation: need at least one trigger and one action
    const hasTrigger = nodes.some(node => node.data.type === 'trigger');
    const hasAction = nodes.some(node => node.data.type === 'action');
    const hasConnections = edges.length > 0;
    
    const isValid = hasTrigger && hasAction && hasConnections;
    set({ isValid });
    return isValid;
  },

  saveWorkflow: async (name) => {
    const { nodes, edges, validateWorkflow } = get();
    
    if (!validateWorkflow()) {
      throw new Error('Workflow is not valid');
    }
    
    // Simulate save to backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real app, this would save to backend
    console.log('Saving workflow:', { name, nodes, edges });
  },

  loadWorkflow: (workflow) => {
    set({
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
    });
  },

  clearWorkflow: () => set({
    nodes: [],
    edges: [],
    isValid: false
  }),
}));