import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';

export interface Notification {
  id: number;
  message: string;
  type: 'challenge' | 'mastery' | 'vinyl' | 'generic';
}

interface NotificationContextType {
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  notifications: Notification[];
  removeNotification: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    setNotifications(prev => [...prev, { ...notification, id: Date.now() }]);
  }, []);
  
  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const value: NotificationContextType = { addNotification, notifications, removeNotification };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
