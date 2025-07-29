import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Brain, 
  Database, 
  Trash2, 
  Save,
  Upload,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { TopNav } from '@/components/layout/TopNav';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Settings() {
  const [profile, setProfile] = useState({
    name: 'Arsh',
    email: 'arsh@example.com',
    avatar: ''
  });
  
  const [preferences, setPreferences] = useState({
    vectorMemory: true,
    theme: 'system',
    defaultNotionDb: '',
    emailNotifications: true,
    slackNotifications: false
  });

  const { toast } = useToast();

  const saveProfile = () => {
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    }, 500);
  };

  const savePreferences = () => {
    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Preferences updated",
        description: "Your settings have been saved.",
      });
    }, 500);
  };

  const deleteAccount = () => {
    // Simulate account deletion
    toast({
      title: "Account scheduled for deletion",
      description: "Your account will be deleted within 24 hours.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto p-6"
      >
        {/* Header */}
        <motion.div variants={item} className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-primary p-3 rounded-lg shadow-glow">
              <SettingsIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground">
                Manage your account and customize your FlowBot AI experience
              </p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-8">
          {/* Profile Settings */}
          <motion.div variants={item}>
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </CardTitle>
                <CardDescription>
                  Update your personal information and avatar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar} alt={profile.name} />
                    <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                      {profile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Change Avatar
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                
                <Button onClick={saveProfile} className="gradient-primary">
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI & Memory Settings */}
          <motion.div variants={item}>
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>AI & Memory</span>
                </CardTitle>
                <CardDescription>
                  Configure how FlowBot AI learns and remembers from your workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Vector Memory</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow AI to learn from your past workflows and improve suggestions
                    </p>
                  </div>
                  <Switch
                    checked={preferences.vectorMemory}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, vectorMemory: checked }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label>Theme Preference</Label>
                  <Select 
                    value={preferences.theme} 
                    onValueChange={(value) => 
                      setPreferences(prev => ({ ...prev, theme: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center space-x-2">
                          <Sun className="h-4 w-4" />
                          <span>Light</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center space-x-2">
                          <Moon className="h-4 w-4" />
                          <span>Dark</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center space-x-2">
                          <Monitor className="h-4 w-4" />
                          <span>System</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Integration Settings */}
          <motion.div variants={item}>
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Integrations</span>
                </CardTitle>
                <CardDescription>
                  Configure default settings for your connected services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Default Notion Database</Label>
                  <Select 
                    value={preferences.defaultNotionDb} 
                    onValueChange={(value) => 
                      setPreferences(prev => ({ ...prev, defaultNotionDb: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a database" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tasks">📋 Tasks Database</SelectItem>
                      <SelectItem value="projects">🚀 Projects Database</SelectItem>
                      <SelectItem value="notes">📝 Notes Database</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <Label className="text-base">Notifications</Label>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about agent runs and errors
                      </p>
                    </div>
                    <Switch
                      checked={preferences.emailNotifications}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, emailNotifications: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Slack Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified in your Slack workspace
                      </p>
                    </div>
                    <Switch
                      checked={preferences.slackNotifications}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, slackNotifications: checked }))
                      }
                    />
                  </div>
                </div>
                
                <Button onClick={savePreferences} className="gradient-primary">
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Danger Zone */}
          <motion.div variants={item}>
            <Card className="border-destructive shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  <span>Danger Zone</span>
                </CardTitle>
                <CardDescription>
                  Irreversible actions that will affect your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Delete Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account, agents, and all data
                      </p>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete Account</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            account and remove all your data from our servers, including:
                            <br />
                            <br />
                            • All your agents and workflows
                            <br />
                            • Connection tokens for integrated services
                            <br />
                            • Execution logs and history
                            <br />
                            • Profile and preferences
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={deleteAccount}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Yes, delete my account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}