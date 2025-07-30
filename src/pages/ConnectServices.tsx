import { motion } from 'framer-motion';
import { Shield, Zap, Info, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ServiceConnectCard } from '@/components/ui/service-connect-card';
import { useToast } from '@/hooks/use-toast';
import { TopNav } from '@/components/layout/TopNav';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

export default function ConnectServices() {
  const [services, setServices] = useState([]);
  const [isConnecting, setIsConnecting] = useState(null);
  const [isNotionModalOpen, setIsNotionModalOpen] = useState(false);
  const [notionToken, setNotionToken] = useState('');
  const [loading, setLoading] = useState(true);
  const { connectService: connectServiceApi, disconnectService: disconnectServiceApi, startGoogleOAuth, getServiceConnections } = useApi();
  const { toast } = useToast();
  const { user } = useAuth();

  // Load service connections on component mount
  useEffect(() => {
    loadServiceConnections();
  }, [user]);

  const loadServiceConnections = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { connections } = await getServiceConnections();
      
      // Create services array with connection status
      const servicesData = [
        {
          id: 'gmail',
          name: 'Gmail',
          icon: '📧',
          connected: false,
          connectedAt: null,
          scopes: ['read', 'send'],
          accountInfo: null
        },
        {
          id: 'notion',
          name: 'Notion',
          icon: '📝',
          connected: false,
          connectedAt: null,
          scopes: ['read', 'write'],
          accountInfo: null
        },
        {
          id: 'telegram',
          name: 'Telegram',
          icon: '💬',
          connected: false,
          connectedAt: null,
          scopes: ['send'],
          accountInfo: null
        }
      ];

      // Update services with actual connection data
      connections?.forEach(conn => {
        const service = servicesData.find(s => s.id === conn.service_type);
        if (service && conn.is_active) {
          service.connected = true;
          service.connectedAt = new Date(conn.connected_at);
          service.accountInfo = {
            email: conn.service_config?.email,
            name: conn.service_config?.name || conn.service_config?.bot_name,
          };
        }
      });

      setServices(servicesData);
    } catch (error) {
      console.error('Failed to load service connections:', error);
      toast({
        title: 'Failed to load connections',
        description: 'Please try refreshing the page',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (serviceId: string) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to connect services',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsConnecting(serviceId);
      
      if (serviceId === 'gmail') {
        // Start Google OAuth flow
        const { auth_url } = await startGoogleOAuth();
        
        // Open OAuth popup
        const popup = window.open(auth_url, 'gmail-oauth', 'width=500,height=600,scrollbars=yes,resizable=yes');
        
        // Listen for OAuth completion
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'GMAIL_CONNECTED') {
            popup?.close();
            window.removeEventListener('message', handleMessage);
            
            if (event.data.success) {
              updateServiceInState(serviceId, { 
                connected: true, 
                connectedAt: new Date(),
                accountInfo: { email: 'Connected via OAuth' }
              });
              
              toast({
                title: "Gmail Connected",
                description: "Successfully connected to Gmail",
              });
            } else {
              toast({
                title: "Connection Failed", 
                description: event.data.error || "Failed to connect Gmail",
                variant: "destructive",
              });
            }
            setIsConnecting(null);
          }
        };
        
        window.addEventListener('message', handleMessage);
        
      } else if (serviceId === 'telegram') {
        // For now, show a message that Telegram will be implemented later
        toast({
          title: "Coming Soon",
          description: "Telegram integration will be available soon",
        });
      } else if (serviceId === 'notion') {
        // Open Notion token input modal
        setIsNotionModalOpen(true);
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed", 
        description: error.message || "Failed to connect service",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const handleNotionConnect = async () => {
    if (!notionToken.trim()) {
      toast({
        title: "Token Required",
        description: "Please enter your Notion integration token",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConnecting('notion');
      
      await connectServiceApi({
        service_type: 'notion',
        access_token: notionToken,
        service_config: {},
      });
      
      // Reload connections to get updated data
      await loadServiceConnections();
      
      toast({
        title: "Notion Connected",
        description: "Successfully connected to Notion",
      });
      
      setIsNotionModalOpen(false);
      setNotionToken('');
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Notion",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const updateServiceInState = (serviceId: string, updates: any) => {
    setServices(prev => prev.map(service =>
      service.id === serviceId
        ? { ...service, ...updates }
        : service
    ));
  };

  const handleDisconnect = (serviceId: string) => {
    try {
      disconnectServiceApi(serviceId);
      updateServiceInState(serviceId, {
        connected: false,
        connectedAt: null,
        accountInfo: null
      });
    } catch (error) {
      console.error('Failed to disconnect service:', error);
    }
    
    const service = services.find(s => s.id === serviceId);
    toast({
      title: `${service?.name} disconnected`,
      description: "This service is no longer available for workflows.",
    });
  };

  const connectedCount = services.filter(s => s.connected).length;
  
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-6xl mx-auto p-6"
      >
        {/* Header */}
        <motion.div variants={item} className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-primary p-3 rounded-lg shadow-glow">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Connect Services</h1>
              <p className="text-muted-foreground">
                Link your accounts to enable powerful automation workflows
              </p>
            </div>
          </div>
          
          <Alert className="bg-primary-subtle border-primary">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{connectedCount} of {services.length} services connected.</strong>
              {connectedCount < services.length && 
                " Connect more services to unlock additional automation possibilities."
              }
            </AlertDescription>
          </Alert>
        </motion.div>

        {/* Security Notice */}
        <motion.div variants={item} className="mb-8">
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                <Shield className="h-5 w-5" />
                <span>Security & Privacy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-green-700 dark:text-green-300">
              <p className="text-sm">
                All connections use OAuth 2.0 for secure authentication. We only access 
                the permissions you explicitly grant and never store your passwords. 
                You can revoke access at any time.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Services Grid */}
        <motion.div variants={item}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ServiceConnectCard
                  service={service}
                  isConnecting={isConnecting === service.id}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Integration Benefits */}
        <motion.div variants={item} className="mt-12">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>What you can do with connected services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="text-2xl">📧</div>
                  <h3 className="font-semibold">Gmail</h3>
                  <p className="text-sm text-muted-foreground">
                    Trigger workflows from incoming emails, send automated responses, 
                    and process attachments with AI.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="text-2xl">📝</div>
                  <h3 className="font-semibold">Notion</h3>
                  <p className="text-sm text-muted-foreground">
                    Create pages, update databases, and organize information 
                    automatically based on triggers.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="text-2xl">💬</div>
                  <h3 className="font-semibold">Telegram</h3>
                  <p className="text-sm text-muted-foreground">
                    Send notifications, summaries, and alerts to your Telegram 
                    channels or direct messages.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Notion Token Input Modal */}
      <Dialog open={isNotionModalOpen} onOpenChange={setIsNotionModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Notion</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need to create a Notion integration first. Visit{' '}
                <a 
                  href="https://www.notion.so/my-integrations" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  notion.so/my-integrations
                </a>{' '}
                to create one.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="notion-token">Integration Token</Label>
              <Input
                id="notion-token"
                type="password"
                placeholder="secret_..."
                value={notionToken}
                onChange={(e) => setNotionToken(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsNotionModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleNotionConnect}
                disabled={isConnecting === 'notion'}
                className="flex-1"
              >
                {isConnecting === 'notion' ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}