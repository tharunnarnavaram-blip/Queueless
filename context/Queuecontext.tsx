import React, { createContext, useContext, useState } from 'react';

type QueueContextType = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeTab, setActiveTab] = useState('scanner');

  return (
    <QueueContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = (): QueueContextType => {
  const context = useContext(QueueContext);

  if (!context) {
    throw new Error('useQueue must be used inside QueueProvider');
  }

  return context;
};
