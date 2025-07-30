'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Clock, Eye, MousePointer, FileText } from 'lucide-react';

interface ArticleMetric {
  articleId: string;
  title: string;
  totalSessions: number;
  totalTimeSpent: number;
  totalAiRequests: number;
  avgTimeSpent: number;
  avgReadPercentage: number;
  lastAccessed: string;
}

interface ActivityAnalyticsProps {
  articleId?: string;
  userId?: string;
}

export default function ActivityAnalytics({ articleId, userId }: ActivityAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        if (articleId) params.append('articleId', articleId);
        if (userId) params.append('userId', userId);
        
        const url = `/api/analytics${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        
        const data = await response.json();
        setAnalyticsData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [articleId, userId]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Error: {error}
      </div>
    );
  }

  // Render for specific article/user analytics
  if (articleId || userId) {
    const { aggregate, sessions } = analyticsData || { aggregate: null, sessions: [] };
    
    if (!aggregate) {
      return <div className="p-4 text-gray-500">No analytics data available.</div>;
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{aggregate.totalSessions}</p>
              </div>
              <BarChart className="w-8 h-8 text-accent-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Time</p>
                <p className="text-2xl font-bold text-gray-900">{formatTime(aggregate.totalTimeSpent)}</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Requests</p>
                <p className="text-2xl font-bold text-gray-900">{aggregate.totalAiRequests}</p>
              </div>
              <MousePointer className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Manual Edits</p>
                <p className="text-2xl font-bold text-gray-900">{aggregate.totalManualEdits || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Read %</p>
                <p className="text-2xl font-bold text-gray-900">{aggregate.avgReadPercentage}%</p>
              </div>
              <Eye className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Session Details */}
        {sessions && sessions.length > 0 && (
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {sessions.slice(0, 10).map((session: any) => (
                <div key={session.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-900 font-medium">
                        {formatDate(session.sessionStart)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatTime(session.timeSpentSeconds)} • {session.readPercentage}% read
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-gray-600">
                        {session.aiRequestsCount} AI requests
                      </p>
                      <p className="text-gray-600">
                        {session.manualEditsCount || 0} manual edits
                      </p>
                      <p className="text-gray-500">
                        {session.focusCount} focus / {session.blurCount} blur
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render overall article metrics
  const { articleMetrics } = analyticsData || { articleMetrics: [] };
  
  if (!articleMetrics || articleMetrics.length === 0) {
    return <div className="p-4 text-gray-500">No analytics data available.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Article Engagement Analytics
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {articleMetrics.map((article: ArticleMetric) => (
            <div key={article.articleId} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{article.title}</h3>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Sessions</p>
                      <p className="font-medium text-gray-900">{article.totalSessions}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Time</p>
                      <p className="font-medium text-gray-900">{formatTime(article.totalTimeSpent)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Avg Time</p>
                      <p className="font-medium text-gray-900">{formatTime(article.avgTimeSpent)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Avg Read</p>
                      <p className="font-medium text-gray-900">{article.avgReadPercentage}%</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Last accessed: {formatDate(article.lastAccessed)}
                  </p>
                </div>
                <div className="ml-4 text-right">
                  <div className="text-2xl font-bold text-accent-600">
                    {article.totalAiRequests}
                  </div>
                  <p className="text-xs text-gray-500">AI requests</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}