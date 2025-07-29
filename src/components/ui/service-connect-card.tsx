import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircle2, 
  Unlink,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Service } from '@/store/useServiceStore';

interface ServiceConnectCardProps {
  service: Service;
  isConnecting?: boolean;
  onConnect?: (serviceId: string) => void;
  onDisconnect?: (serviceId: string) => void;
}

export function ServiceConnectCard({ 
  service, 
  isConnecting = false,
  onConnect, 
  onDisconnect 
}: ServiceConnectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover-lift shadow-soft hover:shadow-medium transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-3">
            <div className="text-2xl animate-float">
              {service.icon}
            </div>
            <div>
              <h3 className="font-semibold leading-none tracking-tight">
                {service.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {service.connected ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          
          {service.connected ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          )}
        </CardHeader>
        
        <CardContent>
          {service.connected && service.accountInfo ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {service.accountInfo.name || service.accountInfo.email}
                  </p>
                  {service.accountInfo.email && service.accountInfo.name && (
                    <p className="text-xs text-muted-foreground">
                      {service.accountInfo.email}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="status-active">
                  Connected
                </Badge>
              </div>
              
              {service.connectedAt && (
                <p className="text-xs text-muted-foreground">
                  Connected {formatDistanceToNow(service.connectedAt, { addSuffix: true })}
                </p>
              )}
              
              {service.scopes && service.scopes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {service.scopes.map((scope) => (
                    <Badge key={scope} variant="secondary" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDisconnect?.(service.id)}
                className="w-full"
              >
                <Unlink className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your {service.name} account to enable automation workflows.
              </p>
              
              <Button
                onClick={() => onConnect?.(service.id)}
                disabled={isConnecting}
                className="w-full gradient-primary hover:opacity-90 transition-opacity"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Connect {service.name}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}