import { create } from 'zustand';

export interface Service {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  connectedAt?: Date;
  scopes?: string[];
  accountInfo?: {
    email?: string;
    name?: string;
    avatar?: string;
  };
}

interface ServiceStore {
  services: Service[];
  isConnecting: string | null;
  
  // Actions
  connectService: (serviceId: string) => Promise<void>;
  disconnectService: (serviceId: string) => void;
  updateServiceInfo: (serviceId: string, info: Partial<Service>) => void;
  setConnecting: (serviceId: string | null) => void;
}

export const useServiceStore = create<ServiceStore>((set, get) => ({
  services: [
    {
      id: 'gmail',
      name: 'Gmail',
      icon: '📧',
      connected: true,
      connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
      scopes: ['read', 'send'],
      accountInfo: {
        email: 'arsh@example.com',
        name: 'Arsh',
      }
    },
    {
      id: 'notion',
      name: 'Notion',
      icon: '📝',
      connected: true,
      connectedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
      scopes: ['read', 'write'],
      accountInfo: {
        name: 'Arsh\'s Workspace',
      }
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: '💬',
      connected: false,
    }
  ],
  
  isConnecting: null,

  connectService: async (serviceId) => {
    set({ isConnecting: serviceId });
    
    // Simulate OAuth flow
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    set(state => ({
      services: state.services.map(service =>
        service.id === serviceId
          ? {
              ...service,
              connected: true,
              connectedAt: new Date(),
              accountInfo: {
                email: 'user@example.com',
                name: 'User Account',
              }
            }
          : service
      ),
      isConnecting: null
    }));
  },

  disconnectService: (serviceId) => set(state => ({
    services: state.services.map(service =>
      service.id === serviceId
        ? {
            ...service,
            connected: false,
            connectedAt: undefined,
            accountInfo: undefined
          }
        : service
    )
  })),

  updateServiceInfo: (serviceId, info) => set(state => ({
    services: state.services.map(service =>
      service.id === serviceId
        ? { ...service, ...info }
        : service
    )
  })),

  setConnecting: (serviceId) => set({ isConnecting: serviceId }),
}));