import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bot, Zap, Brain, ArrowRight, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-neural opacity-5" />
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="relative z-10">
        {/* Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-between items-center p-6"
        >
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-primary p-2 rounded-lg shadow-glow">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-neural bg-clip-text text-transparent">
              FlowBot AI
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link to="/auth">
              <Button variant="outline" className="hover-lift">
                Sign In
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button className="gradient-primary">
                Dashboard
              </Button>
            </Link>
          </div>
        </motion.header>

        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-primary p-4 rounded-2xl shadow-glow animate-pulse-glow">
                <Bot className="h-12 w-12 text-white" />
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-neural bg-clip-text text-transparent">
              FlowBot AI
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Build intelligent AI agents with no code. Automate your workflows across 
              <span className="text-primary font-semibold"> Gmail</span>, 
              <span className="text-primary font-semibold"> Notion</span>, and 
              <span className="text-primary font-semibold"> Telegram</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gradient-primary hover:opacity-90 transition-opacity shadow-glow text-lg px-8 py-4">
                  <Play className="mr-2 h-5 w-5" />
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              
              <Link to="/connect-services">
                <Button size="lg" variant="outline" className="hover-lift text-lg px-8 py-4">
                  <Zap className="mr-2 h-5 w-5" />
                  Connect Services
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <Card className="hover-lift shadow-soft group">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-primary p-3 rounded-xl shadow-glow mx-auto mb-4 w-fit animate-float">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Drag & Drop Builder</h3>
                <p className="text-muted-foreground">
                  Create complex workflows visually with our intuitive drag-and-drop interface. 
                  No coding required.
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover-lift shadow-soft group">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-primary p-3 rounded-xl shadow-glow mx-auto mb-4 w-fit animate-float" style={{ animationDelay: '0.5s' }}>
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">AI-Powered Logic</h3>
                <p className="text-muted-foreground">
                  Leverage advanced AI to process emails, summarize content, and make 
                  intelligent decisions automatically.
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover-lift shadow-soft group">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-primary p-3 rounded-xl shadow-glow mx-auto mb-4 w-fit animate-float" style={{ animationDelay: '1s' }}>
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Smart Integrations</h3>
                <p className="text-muted-foreground">
                  Connect seamlessly with Gmail, Notion, and Telegram. More integrations 
                  coming soon.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Index;
