import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter,
  Search,
  Eye,
  RefreshCw,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAgentStore } from '@/store/useAgentStore';
import { TopNav } from '@/components/layout/TopNav';
import { useApi } from '@/hooks/useApi';
import { useEffect } from 'react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function AgentLogs() {
  const { logs, agents, setLogs } = useAgentStore();
  const { getAgentLogs, retryExecution } = useApi();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const logsData = await getAgentLogs();
        if (logsData?.logs) {
          setLogs(logsData.logs);
        }
      } catch (error) {
        console.error('Failed to load logs:', error);
      }
    };
    
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.output?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.error?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesAgent = agentFilter === 'all' || log.agentId === agentFilter;
    
    return matchesSearch && matchesStatus && matchesAgent;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="status-active">Success</Badge>;
      case 'failed':
        return <Badge className="status-error">Failed</Badge>;
      default:
        return <Badge className="status-paused">Pending</Badge>;
    }
  };

  const LogDetailsDialog = ({ log }: { log: any }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Execution Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium">Agent:</span>
              <p className="text-sm text-muted-foreground">{log.agentName}</p>
            </div>
            <div>
              <span className="text-sm font-medium">Status:</span>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusIcon(log.status)}
                {getStatusBadge(log.status)}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium">Trigger Time:</span>
              <p className="text-sm text-muted-foreground">
                {format(log.triggerTime, 'PPpp')}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium">Duration:</span>
              <p className="text-sm text-muted-foreground">
                {log.duration ? `${(log.duration / 1000).toFixed(1)}s` : 'N/A'}
              </p>
            </div>
          </div>
          
          {log.output && (
            <div>
              <span className="text-sm font-medium">Output:</span>
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <pre className="text-sm whitespace-pre-wrap">{log.output}</pre>
              </div>
            </div>
          )}
          
          {log.error && (
            <div>
              <span className="text-sm font-medium text-destructive">Error:</span>
              <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <pre className="text-sm text-destructive whitespace-pre-wrap">{log.error}</pre>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto p-6"
      >
        {/* Header */}
        <motion.div variants={item} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Agent Logs</h1>
              <p className="text-muted-foreground mt-2">
                Monitor your automation workflows and track their performance
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item} className="mb-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Logs Table */}
        <motion.div variants={item}>
          <Card className="shadow-soft">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Trigger Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Output Preview</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(log.status)}
                          {getStatusBadge(log.status)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.agentName}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">
                            {format(log.triggerTime, 'MMM dd, HH:mm')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(log.triggerTime, { addSuffix: true })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.duration ? (
                          <span className="text-sm">
                            {(log.duration / 1000).toFixed(1)}s
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm">
                          {log.output || log.error || 'No output'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <LogDetailsDialog log={log} />
                          {log.status === 'failed' && (
                            <Button variant="ghost" size="icon">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
              
              {filteredLogs.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4 animate-float">📊</div>
                  <h3 className="text-lg font-semibold mb-2">No logs found</h3>
                  <p className="text-muted-foreground">
                    {logs.length === 0 
                      ? "Your agents haven't run yet. Create and activate an agent to see logs here."
                      : "Try adjusting your filters to see more results."
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}