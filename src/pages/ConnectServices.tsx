import { motion } from 'framer-motion';
import { Shield, Zap, Info } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ServiceConnectCard } from '@/components/ui/service-connect-card';
import { useServiceStore } from '@/store/useServiceStore';
import { useToast } from '@/hooks/use-toast';
import { TopNav } from '@/components/layout/TopNav';
import { useApi } from '@/hooks/useApi';

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
  const { services, isConnecting, connectService, disconnectService, updateServiceInfo, setConnecting } = useServiceStore();
  const { connectService: connectServiceApi, disconnectService: disconnectServiceApi, startGoogleOAuth } = useApi();
  const { toast } = useToast();

  const handleConnect = async (serviceId: string) => {
    try {
      setConnecting(serviceId);
      
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
              updateServiceInfo(serviceId, { 
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
            setConnecting(null);
          }
        };
        
        window.addEventListener('message', handleMessage);
        
      } else if (serviceId === 'telegram') {
        const botToken = prompt('Enter your Telegram Bot Token:');
        const chatId = prompt('Enter your Telegram Chat ID:');
        
        if (botToken && chatId) {
          await connectServiceApi({
            service_type: 'telegram',
            access_token: botToken,
            service_config: { chat_id: chatId },
          });
          
          updateServiceInfo(serviceId, { 
            connected: true, 
            connectedAt: new Date(),
            accountInfo: { name: 'Telegram Bot' }
          });
          
          toast({
            title: "Telegram Connected",
            description: "Successfully connected Telegram bot",
          });
        }
      } else if (serviceId === 'notion') {
        const token = prompt('Enter your Notion Integration Token:');
        
        if (token) {
          await connectServiceApi({
            service_type: 'notion',
            access_token: token,
            service_config: {},
          });
          
          updateServiceInfo(serviceId, { 
            connected: true, 
            connectedAt: new Date(),
            accountInfo: { name: 'Notion Workspace' }
          });
          
          toast({
            title: "Notion Connected",
            description: "Successfully connected to Notion",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed", 
        description: error.message || "Failed to connect service",
        variant: "destructive",
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    disconnectService(serviceId);
    toast({
      title: `${service?.name} disconnected`,
      description: "This service is no longer available for workflows.",
    });
  };

  const connectedCount = services.filter(s => s.connected).length;

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
    </div>
  );
}