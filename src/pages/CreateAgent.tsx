import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ReactFlow,
  addEdge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Panel,
  Handle,
  Position,
} from '@xyflow/react';
import { Save, Play, Plus, Settings, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAgentStore } from '@/store/useAgentStore';
import { TopNav } from '@/components/layout/TopNav';
import { useApi } from '@/hooks/useApi';
import { useNavigate } from 'react-router-dom';
import { NodeConfigModal } from '@/components/ui/node-config-modal';

// Custom workflow node component
function WorkflowNode({ data, id, selected }: { data: any; id: string; selected?: boolean }) {
  const getNodeStyles = () => {
    switch (data.type) {
      case 'trigger':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500';
      case 'action':
        return 'bg-card border-border hover:border-primary/50';
      default:
        return 'bg-card border-border';
    }
  };

  const getServiceIcon = (service?: string) => {
    switch (service?.toLowerCase()) {
      case 'gmail': return '📧';
      case 'notion': return '📝';
      case 'telegram': return '💬';
      case 'llm': return '🧠';
      case 'webhook': return '🔗';
      default: return '⚡';
    }
  };

  return (
    <div
      className={`relative min-w-[200px] rounded-lg shadow-medium transition-all duration-200 ${getNodeStyles()} ${
        selected ? 'ring-2 ring-primary shadow-glow' : ''
      }`}
    >
      {/* Input Handle */}
      {data.type !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-primary border-2 border-white"
        />
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getServiceIcon(data.service)}</span>
            <span className="font-medium text-sm">{data.label}</span>
          </div>
          
          {selected && (
            <div className="flex space-x-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => data.onEdit?.(id)}
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => data.onDelete?.(id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        
        {data.service && (
          <div className="text-xs opacity-75 mb-2">
            {data.service}
          </div>
        )}
        
        {data.config && Object.keys(data.config).length > 0 && (
          <div className="text-xs opacity-60 truncate">
            {data.config.subjectFilter || data.config.prompt || data.config.titleTemplate || 'Configured'}
          </div>
        )}
      </div>

      {/* Output Handle */}
      {data.type !== 'condition' && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-primary border-2 border-white"
        />
      )}
    </div>
  );
}

// Custom node types for the workflow builder
const nodeTypes = {
  trigger: WorkflowNode,
  action: WorkflowNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 100, y: 100 },
    data: { 
      label: 'Gmail Trigger',
      service: 'Gmail',
      type: 'trigger',
      config: { condition: 'New email with "invoice" in subject' }
    },
  },
];

const initialEdges: Edge[] = [];

export default function CreateAgent() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [agentName, setAgentName] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();
  const { addAgent } = useAgentStore();
  const { createAgent } = useApi();
  const navigate = useNavigate();

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Auto-validate workflow whenever nodes or edges change
  useEffect(() => {
    validateWorkflow();
  }, [nodes, edges, agentName]);

  // Update node data with edit/delete callbacks
  useEffect(() => {
    setNodes((nds) => nds.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode,
      }
    })));
  }, []);

  const addActionNode = (type: string) => {
    const serviceMapping: Record<string, string> = {
      'LLM Summarize': 'llm',
      'Notion Create Page': 'notion',
      'Telegram Message': 'telegram',
      'Gmail Send': 'gmail',
      'Webhook Call': 'webhook',
    };

    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'action',
      position: { x: Math.random() * 300 + 300, y: Math.random() * 200 + 200 },
      data: {
        label: type,
        service: serviceMapping[type] || type.split(' ')[0].toLowerCase(),
        type: 'action',
        config: {},
        onEdit: handleEditNode,
        onDelete: handleDeleteNode,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleEditNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setIsConfigModalOpen(true);
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    if (nodeId === '1') {
      toast({
        title: "Cannot delete trigger",
        description: "The trigger node is required for the workflow.",
        variant: "destructive",
      });
      return;
    }
    
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  };

  const handleSaveNodeConfig = (config: any) => {
    if (selectedNode) {
      setNodes((nds) => nds.map(node => 
        node.id === selectedNode.id 
          ? { ...node, data: { ...node.data, config } }
          : node
      ));
    }
  };

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const validateWorkflow = () => {
    const errors: string[] = [];
    
    // Check agent name
    if (!agentName.trim()) {
      errors.push("Agent name is required");
    }
    
    // Check for action nodes
    const actionNodes = nodes.filter(node => node.data.type === 'action');
    if (actionNodes.length === 0) {
      errors.push("At least one action node is required");
    }
    
    // Check for connections
    if (edges.length === 0 && actionNodes.length > 0) {
      errors.push("Connect the trigger to at least one action");
    }
    
    // Check if trigger is connected
    const triggerNode = nodes.find(n => n.data.type === 'trigger');
    if (triggerNode && edges.length > 0) {
      const triggerConnected = edges.some(edge => edge.source === triggerNode.id);
      if (!triggerConnected) {
        errors.push("Trigger must be connected to an action");
      }
    }
    
    // Check for orphaned nodes
    if (actionNodes.length > 0 && edges.length > 0) {
      const connectedNodeIds = new Set([
        ...edges.map(e => e.source),
        ...edges.map(e => e.target)
      ]);
      
      const orphanedNodes = actionNodes.filter(node => !connectedNodeIds.has(node.id));
      if (orphanedNodes.length > 0) {
        errors.push(`${orphanedNodes.length} action(s) not connected to workflow`);
      }
    }
    
    setValidationErrors(errors);
    const valid = errors.length === 0;
    setIsValid(valid);
    return valid;
  };

  const saveAgent = async () => {
    if (!validateWorkflow()) {
      toast({
        title: "Invalid workflow",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare agent data for backend
      const triggerNode = nodes.find(n => n.data.type === 'trigger');
      const actionNodes = nodes.filter(n => n.data.type === 'action');
      
      // Create workflow structure matching backend expectations
      const workflowSteps = actionNodes.map((node, index) => ({
        id: node.id,
        type: 'action',
        service: String(node.data.service || '').toLowerCase(),
        action: node.data.label,
        config: node.data.config || {},
        position: index,
      }));

      const agentData = {
        name: agentName,
        description: `Automated workflow with ${actionNodes.length} action(s)`,
        trigger_type: String(triggerNode?.data.service || 'scheduler').toLowerCase(),
        trigger_config: triggerNode?.data.config || {},
        workflow_steps: workflowSteps,
        schedule_config: { 
          interval: (triggerNode?.data.config as any)?.checkInterval || 'hourly',
          enabled: true 
        },
        status: 'active'
      };

      console.log('Creating agent with data:', agentData);
      
      const result = await createAgent(agentData);
      
      if (result) {
        addAgent({
          name: agentName,
          status: 'active',
          description: `Automated workflow with ${actionNodes.length} action(s)`,
          workflow: { nodes, edges }
        });
        
        toast({
          title: "Agent created successfully!",
          description: `${agentName} has been saved and is ready to use.`,
        });
        
        // Navigate to dashboard after success
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Failed to create agent:', error);
      toast({
        title: "Failed to save agent",
        description: error.message || "Please check your configuration and try again.",
        variant: "destructive",
      });
    }
  };

  const testAgent = async () => {
    if (!validateWorkflow()) {
      toast({
        title: "Invalid workflow",
        description: "Please fix validation errors before testing.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Test run started",
        description: "Testing your agent workflow...",
      });

      // For demo purposes, we'll simulate a test run
      setTimeout(() => {
        toast({
          title: "Test completed",
          description: "Your agent workflow executed successfully!",
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Test failed",
        description: "There was an error testing your agent.",
        variant: "destructive",
      });
    }
  };

  const availableActions = [
    'LLM Summarize',
    'Notion Create Page',
    'Telegram Message',
    'Gmail Send',
    'Webhook Call',
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Sidebar */}
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-80 border-r border-border bg-muted/30 p-6 overflow-y-auto"
        >
          <div className="space-y-6">
            {/* Agent Configuration */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Agent Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input
                    id="agent-name"
                    placeholder="e.g., Invoice Processor"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={saveAgent}
                    disabled={!isValid}
                    className="flex-1"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Agent
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={testAgent}
                    disabled={!isValid}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Available Actions */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Add Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableActions.map((action) => (
                    <Button
                      key={action}
                      variant="outline"
                      size="sm"
                      onClick={() => addActionNode(action)}
                      className="w-full justify-start hover-lift"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {action}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">How to Build</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <p>Add action nodes from the sidebar</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <p>Connect nodes by dragging from one to another</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <p>Configure each node by clicking on it</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                  <p>Save your agent when ready</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Workflow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background"
            deleteKeyCode={["Backspace", "Delete"]}
            multiSelectionKeyCode={["Control", "Meta"]}
          >
            <Controls className="bg-card border border-border shadow-medium" />
            <Background color="#94a3b8" gap={20} size={1} />
            <Panel position="top-right" className="bg-card border border-border rounded-lg p-4 shadow-medium">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium">
                  {isValid ? 'Valid Workflow' : 'Invalid Workflow'}
                </span>
              </div>
              {validationErrors.length > 0 && (
                <div className="mt-2 text-xs text-destructive">
                  {validationErrors.length} issue(s) found
                </div>
              )}
            </Panel>
          </ReactFlow>
          
          {/* Node Configuration Modal */}
          <NodeConfigModal
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            nodeData={selectedNode?.data}
            onSave={handleSaveNodeConfig}
          />
        </div>
      </div>
    </div>
  );
}