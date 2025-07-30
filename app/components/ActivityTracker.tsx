'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useActivityTracker } from '@/lib/activityTracker';
import { ActivityProvider } from './ActivityContext';

interface ActivityTrackerProps {
  articleId: string;
  userId: string;
  children?: React.ReactNode;
}

export default function ActivityTracker({ articleId, userId, children }: ActivityTrackerProps) {
  const [initialSessionData, setInitialSessionData] = useState<any>(null);
  const { session, getFinalSessionData, incrementAiRequests, incrementManualEdits } = useActivityTracker(articleId, userId, initialSessionData);
  const lastSaveTime = useRef<number>(Date.now());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Save session data
  const saveSessionData = async (data: any) => {
    try {
      // Include session ID if we have one
      const sessionData = {
        ...data,
        sessionId: sessionIdRef.current,
      };
      
      const response = await fetch('/api/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        // Failed to save session data
      } else {
        const result = await response.json();
        // Store the session ID for future updates
        if (result.sessionId) {
          sessionIdRef.current = result.sessionId;
        }
      }
    } catch (error) {
    }
  };

  // Periodic save function
  const periodicSave = useCallback(() => {
    const currentSession = getFinalSessionData();
    saveSessionData(currentSession);
    lastSaveTime.current = Date.now();
  }, [getFinalSessionData]);

  // Set up periodic saving
  useEffect(() => {
    // Save every 30 seconds
    const interval = setInterval(() => {
      periodicSave();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [session, periodicSave]);

  // Save on unmount
  useEffect(() => {
    return () => {
      // Clear any pending save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Save final session data
      const finalSession = getFinalSessionData();
      
      // Include session ID in final save
      const sessionData = {
        ...finalSession,
        sessionId: sessionIdRef.current,
      };
      
      // Use sendBeacon for reliable unmount saves
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(sessionData)], {
          type: 'application/json',
        });
        navigator.sendBeacon('/api/workers', blob);
      } else {
        // Fallback to regular fetch
        saveSessionData(sessionData);
      }
    };
  }, [getFinalSessionData]);

  // Load existing session on mount or article change
  useEffect(() => {
    const loadExistingSession = async () => {
      try {
        const response = await fetch(`/api/workers?userId=${userId}&articleId=${articleId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.session) {
            sessionIdRef.current = data.sessionId;
            
            // Set initial session data with existing counts
            setInitialSessionData({
              timeSpentSeconds: data.session.time_spent_seconds || 0,
              focusCount: data.session.focus_count || 0,
              blurCount: data.session.blur_count || 0,
              aiRequestsCount: data.session.ai_requests_count || 0,
              readPercentage: data.session.read_percentage || 0,
              manualEditsCount: data.session.manual_edits_count || 0,
            });
          } else {
            // No existing session, start fresh
            setInitialSessionData(null);
          }
        }
      } catch (error) {
        setInitialSessionData(null);
      }
    };
    
    // Reset session ID when article changes
    sessionIdRef.current = null;
    
    // Load any existing session
    loadExistingSession();
    
    // Save previous session data when article changes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Small delay to ensure we don't save immediately on mount
    saveTimeoutRef.current = setTimeout(() => {
      const currentTime = Date.now();
      if (currentTime - lastSaveTime.current > 5000) { // Only save if last save was more than 5 seconds ago
        periodicSave();
      }
    }, 1000);
  }, [articleId, userId, periodicSave]);

  // Create wrapped increment functions that trigger saves
  const wrappedIncrementAiRequests = useCallback(() => {
    incrementAiRequests();
    // Trigger save after AI request
    setTimeout(() => {
      periodicSave();
    }, 1000);
  }, [incrementAiRequests, periodicSave]);
  
  const wrappedIncrementManualEdits = useCallback(() => {
    incrementManualEdits();
    // Trigger save after manual edit (with debounce)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      periodicSave();
    }, 2000); // Save after 2 seconds of no edits
  }, [incrementManualEdits, periodicSave]);

  // Wrap children with ActivityProvider
  return (
    <ActivityProvider 
      incrementAiRequests={wrappedIncrementAiRequests}
      incrementManualEdits={wrappedIncrementManualEdits}
    >
      {children}
    </ActivityProvider>
  );
}