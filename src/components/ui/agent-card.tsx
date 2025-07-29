import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { 
  Play, 
  Pause, 
  AlertCircle, 
  Clock, 
  FileText,
  MoreVertical,
  Settings,
  Trash2
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Agent } from '@/store/useAgentStore';

interface AgentCardProps {
  agent: Agent;
  onStatusToggle?: (id: string, status: 'active' | 'paused') => void;
  onViewLogs?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function AgentCard({ 
  agent, 
  onStatusToggle, 
  onViewLogs, 
  onEdit, 
  onDelete 
}: AgentCardProps) {
  const getStatusIcon = () => {
    switch (agent.status) {
      case 'active':
        return <Play className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = () => {
    switch (agent.status) {
      case 'active':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'error':
        return 'destructive';
    }
  };

  const handleStatusToggle = () => {
    if (agent.status === 'active') {
      onStatusToggle?.(agent.id, 'paused');
    } else {
      onStatusToggle?.(agent.id, 'active');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover-lift shadow-soft hover:shadow-medium transition-all duration-200">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <h3 className="font-semibold leading-none tracking-tight">
              {agent.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {agent.description}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(agent.id)}>
                <Settings className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete?.(agent.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge 
                variant={getStatusVariant()} 
                className="flex items-center space-x-1"
              >
                {getStatusIcon()}
                <span className="capitalize">{agent.status}</span>
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {agent.lastRun ? (
                <span>
                  {formatDistanceToNow(agent.lastRun, { addSuffix: true })}
                </span>
              ) : (
                <span>Never run</span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant={agent.status === 'active' ? 'secondary' : 'default'}
              onClick={handleStatusToggle}
              className="flex-1"
            >
              {agent.status === 'active' ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Activate
                </>
              )}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewLogs?.(agent.id)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}