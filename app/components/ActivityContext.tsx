'use client';

import React, { createContext, useContext } from 'react';

interface ActivityContextType {
  incrementAiRequests: () => void;
  incrementManualEdits: () => void;
}

export const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export function useActivityContext() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivityContext must be used within an ActivityProvider');
  }
  return context;
}

interface ActivityProviderProps {
  children: React.ReactNode;
  incrementAiRequests: () => void;
  incrementManualEdits: () => void;
}

export function ActivityProvider({ children, incrementAiRequests, incrementManualEdits }: ActivityProviderProps) {
  return (
    <ActivityContext.Provider value={{ incrementAiRequests, incrementManualEdits }}>
      {children}
    </ActivityContext.Provider>
  );
}