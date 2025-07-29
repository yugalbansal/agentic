import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { AgentCard } from '@/components/ui/agent-card';
import { useAgentStore } from '@/store/useAgentStore';
import { TopNav } from '@/components/layout/TopNav';
import { useApi } from '@/hooks/useApi';
import { useEffect } from 'react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { agents, logs, updateAgent, setAgents, setLogs } = useAgentStore();
  const { getAgents, getAgentLogs, updateAgent: updateAgentApi } = useApi();

  useEffect(() => {
    const loadData = async () => {
      try {
        const agentsData = await getAgents();
        if (agentsData?.agents) {
          setAgents(agentsData.agents);
        }
        
        const logsData = await getAgentLogs();
        if (logsData?.logs) {
          setLogs(logsData.logs);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };
    
    loadData();
  }, []);
  
  const activeAgents = agents.filter(agent => agent.status === 'active').length;
  const totalRuns = logs.length;
  const successRate = logs.length > 0 
    ? Math.round((logs.filter(log => log.status === 'success').length / logs.length) * 100)
    : 0;

  const handleStatusToggle = async (id: string, status: 'active' | 'paused') => {
    try {
      await updateAgentApi(id, { status });
      updateAgent(id, { status });
    } catch (error) {
      console.error('Failed to update agent status:', error);
    }
  };

  const handleViewLogs = (id: string) => {
    // Navigate to logs page with agent filter
    window.location.href = `/agent-logs?agent=${id}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-7xl mx-auto p-6"
      >
        {/* Welcome Header */}
        <motion.div variants={item} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome back, Arsh! 👋
              </h1>
              <p className="text-muted-foreground mt-2">
                Here's what's happening with your AI agents today.
              </p>
            </div>
            
            <Link to="/create-agent">
              <Button className="gradient-primary hover:opacity-90 transition-opacity shadow-glow">
                <Plus className="mr-2 h-4 w-4" />
                Create New Agent
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          variants={item}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{activeAgents}</div>
              <p className="text-xs text-muted-foreground">
                {agents.length - activeAgents} paused or error
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalRuns}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last week
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{successRate}%</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Agents Grid */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Your Agents</h2>
            <Link 
              to="/agent-logs" 
              className="text-sm text-primary hover:underline"
            >
              View all logs →
            </Link>
          </div>
          
          {agents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <AgentCard
                    agent={agent}
                    onStatusToggle={handleStatusToggle}
                    onViewLogs={handleViewLogs}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="shadow-soft">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-4xl mb-4 animate-float">🤖</div>
                <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first AI agent to get started with automation.
                </p>
                <Link to="/create-agent">
                  <Button className="gradient-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Agent
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}