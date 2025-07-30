import { useEffect, useState, useRef, useCallback } from 'react';

export interface ActivitySession {
  articleId: string;
  userId: string;
  sessionStart: Date;
  timeSpentSeconds: number;
  focusCount: number;
  blurCount: number;
  isActive: boolean;
  aiRequestsCount: number;
  readPercentage: number;
  manualEditsCount: number;
}

export function useActivityTracker(articleId: string, userId: string, initialSessionData?: Partial<ActivitySession>) {
  // Initialize with initial data if provided
  const getInitialSession = () => ({
    articleId,
    userId,
    sessionStart: new Date(),
    timeSpentSeconds: initialSessionData?.timeSpentSeconds || 0,
    focusCount: initialSessionData?.focusCount || 0,
    blurCount: initialSessionData?.blurCount || 0,
    isActive: !document.hidden,
    aiRequestsCount: initialSessionData?.aiRequestsCount || 0,
    readPercentage: initialSessionData?.readPercentage || 0,
    manualEditsCount: initialSessionData?.manualEditsCount || 0,
  });
  
  const [session, setSession] = useState<ActivitySession>(getInitialSession);

  const lastActiveTime = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<ActivitySession>(session);

  // Keep sessionRef in sync with session state
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Update time spent
  const updateTimeSpent = useCallback(() => {
    if (!document.hidden && sessionRef.current.isActive) {
      const now = Date.now();
      const elapsed = (now - lastActiveTime.current) / 1000;
      
      setSession(prev => ({
        ...prev,
        timeSpentSeconds: prev.timeSpentSeconds + elapsed,
      }));
      
      lastActiveTime.current = now;
    }
  }, []);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Tab became hidden
      updateTimeSpent();
      setSession(prev => ({
        ...prev,
        isActive: false,
        blurCount: prev.blurCount + 1,
      }));
    } else {
      // Tab became visible
      lastActiveTime.current = Date.now();
      setSession(prev => ({
        ...prev,
        isActive: true,
        focusCount: prev.focusCount + 1,
      }));
    }
  }, [updateTimeSpent]);

  // Increment AI requests count
  const incrementAiRequests = useCallback(() => {
    setSession(prev => ({
      ...prev,
      aiRequestsCount: prev.aiRequestsCount + 1,
    }));
  }, []);

  // Increment manual edits count
  const incrementManualEdits = useCallback(() => {
    setSession(prev => {
      const newCount = prev.manualEditsCount + 1;
      return {
        ...prev,
        manualEditsCount: newCount,
      };
    });
  }, []);

  // Update read percentage based on scroll position
  const updateReadPercentage = useCallback(() => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || window.pageYOffset;
    
    if (documentHeight > windowHeight) {
      const scrollPercentage = Math.min(
        100,
        Math.round((scrollTop / (documentHeight - windowHeight)) * 100)
      );
      
      setSession(prev => ({
        ...prev,
        readPercentage: Math.max(prev.readPercentage, scrollPercentage)
      }));
    }
  }, []);

  // Get final session data
  const getFinalSessionData = useCallback((): ActivitySession => {
    // Update time one last time if active
    if (!document.hidden && sessionRef.current.isActive) {
      const now = Date.now();
      const elapsed = (now - lastActiveTime.current) / 1000;
      
      return {
        ...sessionRef.current,
        timeSpentSeconds: sessionRef.current.timeSpentSeconds + elapsed,
      };
    }
    
    return sessionRef.current;
  }, []);

  // Set up visibility change listener and scroll tracking
  useEffect(() => {
    let scrollTimer: NodeJS.Timeout;
    
    // Handle scroll events (debounced)
    const handleScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(updateReadPercentage, 200);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('scroll', handleScroll);
    
    // Set up interval to update time periodically
    intervalRef.current = setInterval(() => {
      updateTimeSpent();
    }, 1000); // Update every second
    
    // Initial read percentage calculation
    updateReadPercentage();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [handleVisibilityChange, updateTimeSpent, updateReadPercentage]);

  // Update session when articleId or userId changes
  useEffect(() => {
    setSession({
      articleId,
      userId,
      sessionStart: new Date(),
      timeSpentSeconds: 0,
      focusCount: 0,
      blurCount: 0,
      isActive: !document.hidden,
      aiRequestsCount: 0,
      readPercentage: 0,
      manualEditsCount: 0,
    });
    // Reset the last active time
    lastActiveTime.current = Date.now();
  }, [articleId, userId]);

  // Update session counts when initial data is provided
  useEffect(() => {
    if (initialSessionData && Object.keys(initialSessionData).length > 0) {
      setSession(prev => ({
        ...prev,
        timeSpentSeconds: initialSessionData.timeSpentSeconds || prev.timeSpentSeconds,
        focusCount: initialSessionData.focusCount || prev.focusCount,
        blurCount: initialSessionData.blurCount || prev.blurCount,
        aiRequestsCount: initialSessionData.aiRequestsCount || prev.aiRequestsCount,
        readPercentage: initialSessionData.readPercentage || prev.readPercentage,
        manualEditsCount: initialSessionData.manualEditsCount || prev.manualEditsCount,
      }));
    }
  }, [initialSessionData]);

  return {
    session,
    getFinalSessionData,
    incrementAiRequests,
    incrementManualEdits,
    updateReadPercentage,
  };
}