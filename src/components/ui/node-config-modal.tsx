import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeData: any;
  onSave: (config: any) => void;
}

export function NodeConfigModal({ isOpen, onClose, nodeData, onSave }: NodeConfigModalProps) {
  const [config, setConfig] = useState(nodeData?.config || {});

  useEffect(() => {
    setConfig(nodeData?.config || {});
  }, [nodeData]);

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const renderConfigForm = () => {
    const service = nodeData?.service?.toLowerCase();
    
    switch (service) {
      case 'gmail':
        if (nodeData?.type === 'trigger') {
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject-filter">Subject Filter</Label>
                <Input
                  id="subject-filter"
                  placeholder="e.g., invoice, report"
                  value={config.subjectFilter || ''}
                  onChange={(e) => setConfig({ ...config, subjectFilter: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sender-filter">Sender Filter (Optional)</Label>
                <Input
                  id="sender-filter"
                  placeholder="e.g., billing@company.com"
                  value={config.senderFilter || ''}
                  onChange={(e) => setConfig({ ...config, senderFilter: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="check-interval">Check Interval</Label>
                <Select value={config.checkInterval || 'hourly'} onValueChange={(value) => setConfig({ ...config, checkInterval: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5min">Every 5 minutes</SelectItem>
                    <SelectItem value="hourly">Every hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient">Recipient Email</Label>
                <Input
                  id="recipient"
                  placeholder="recipient@example.com"
                  value={config.recipient || ''}
                  onChange={(e) => setConfig({ ...config, recipient: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="subject">Subject Template</Label>
                <Input
                  id="subject"
                  placeholder="{{subject}} - Processed"
                  value={config.subject || ''}
                  onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="body">Email Body Template</Label>
                <Textarea
                  id="body"
                  placeholder="Content: {{content}}"
                  value={config.body || ''}
                  onChange={(e) => setConfig({ ...config, body: e.target.value })}
                />
              </div>
            </div>
          );
        }
      
      case 'llm':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="prompt">AI Prompt Template</Label>
              <Textarea
                id="prompt"
                placeholder="Summarize this email: {{content}}"
                value={config.prompt || ''}
                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="model">AI Model</Label>
              <Select value={config.model || 'gpt-4o-mini'} onValueChange={(value) => setConfig({ ...config, model: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                  <SelectItem value="llama-3.1-8b">Llama 3.1 8B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Input
                id="max-tokens"
                type="number"
                placeholder="1000"
                value={config.maxTokens || ''}
                onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
              />
            </div>
          </div>
        );
      
      case 'notion':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="database-id">Notion Database ID</Label>
              <Input
                id="database-id"
                placeholder="32-character database ID"
                value={config.databaseId || ''}
                onChange={(e) => setConfig({ ...config, databaseId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="title-template">Page Title Template</Label>
              <Input
                id="title-template"
                placeholder="Summary: {{date}}"
                value={config.titleTemplate || ''}
                onChange={(e) => setConfig({ ...config, titleTemplate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="content-template">Content Template</Label>
              <Textarea
                id="content-template"
                placeholder="{{summary}}"
                value={config.contentTemplate || ''}
                onChange={(e) => setConfig({ ...config, contentTemplate: e.target.value })}
              />
            </div>
          </div>
        );
      
      case 'telegram':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="chat-id">Chat ID</Label>
              <Input
                id="chat-id"
                placeholder="Chat ID or @username"
                value={config.chatId || ''}
                onChange={(e) => setConfig({ ...config, chatId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="message-template">Message Template</Label>
              <Textarea
                id="message-template"
                placeholder="Alert: {{content}}"
                value={config.messageTemplate || ''}
                onChange={(e) => setConfig({ ...config, messageTemplate: e.target.value })}
              />
            </div>
          </div>
        );
      
      case 'webhook':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://api.example.com/webhook"
                value={config.webhookUrl || ''}
                onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="method">HTTP Method</Label>
              <Select value={config.method || 'POST'} onValueChange={(value) => setConfig({ ...config, method: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payload-template">Payload Template (JSON)</Label>
              <Textarea
                id="payload-template"
                placeholder='{"data": "{{content}}"}'
                value={config.payloadTemplate || ''}
                onChange={(e) => setConfig({ ...config, payloadTemplate: e.target.value })}
              />
            </div>
          </div>
        );
      
      default:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-config">Configuration (JSON)</Label>
              <Textarea
                id="custom-config"
                placeholder='{"key": "value"}'
                value={JSON.stringify(config, null, 2)}
                onChange={(e) => {
                  try {
                    setConfig(JSON.parse(e.target.value));
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
              />
            </div>
          </div>
        );
    }
  };

  if (!nodeData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Configure {nodeData.label}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {renderConfigForm()}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}