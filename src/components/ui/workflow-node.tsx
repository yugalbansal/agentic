import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface WorkflowNodeProps {
  data: {
    label: string;
    type: 'trigger' | 'action' | 'condition';
    service?: string;
    config?: Record<string, any>;
  };
  selected?: boolean;
  id: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function WorkflowNode({ data, selected, id, onEdit, onDelete }: WorkflowNodeProps) {
  const getNodeStyles = () => {
    switch (data.type) {
      case 'trigger':
        return 'gradient-primary text-white border-primary';
      case 'action':
        return 'bg-card border-border';
      case 'condition':
        return 'bg-gradient-secondary border-muted';
      default:
        return 'bg-card border-border';
    }
  };

  const getServiceIcon = (service?: string) => {
    switch (service?.toLowerCase()) {
      case 'gmail':
        return '📧';
      case 'notion':
        return '📝';
      case 'telegram':
        return '💬';
      case 'llm':
        return '🧠';
      default:
        return '⚡';
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
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

      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="p-4">
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
                  onClick={() => onEdit?.(id)}
                >
                  <Settings className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => onDelete?.(id)}
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
              {JSON.stringify(data.config)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output Handle */}
      {data.type !== 'action' && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-primary border-2 border-white"
        />
      )}
    </motion.div>
  );
}