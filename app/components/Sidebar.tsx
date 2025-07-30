'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Plus, LogOut, Clock, Edit3, Bot } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface Article {
  id: string;
  title: string;
  content: string;
  status?: string;
  updated_at?: string;
}

interface SidebarProps {
  articles: Article[];
  selectedArticleId: string | null;
  onSelectArticle: (articleId: string) => void;
  onNewArticle?: () => void;
}

export default function Sidebar({ 
  articles, 
  selectedArticleId, 
  onSelectArticle,
  onNewArticle 
}: SidebarProps) {
  const { user, logout, token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  
  // Fetch activity stats
  useEffect(() => {
    const fetchStats = () => {
      if (token && selectedArticleId) {
        // Add timestamp to prevent caching
        fetch(`/api/workers/stats?articleId=${selectedArticleId}&t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache',
          },
        })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setStats(data);
          }
        })
        .catch(() => {}); // Silently handle stats fetch errors
      } else {
        // Clear stats when no article is selected
        setStats(null);
      }
    };
    
    // Fetch immediately
    fetchStats();
    
    // Refresh stats more frequently - every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    
    return () => clearInterval(interval);
  }, [token, selectedArticleId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  return (
    <div className="w-64 flex-shrink-0 bg-gray-900 dark:bg-gray-950 text-white h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 dark:border-gray-800">
        <button
          onClick={onNewArticle}
          className="w-full flex items-center justify-center space-x-2 bg-accent-600 hover:bg-accent-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Article</span>
        </button>
      </div>

      {/* Articles List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {articles.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              No articles yet
            </p>
          ) : (
            <div className="space-y-1">
              {articles.map((article) => (
                <button
                  key={article.id}
                  onClick={() => onSelectArticle(article.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-start space-x-2 ${
                    selectedArticleId === article.id
                      ? 'bg-gray-700 dark:bg-gray-600 text-white'
                      : 'hover:bg-gray-800 dark:hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <FileText className={`w-4 h-4 mt-0.5 flex-shrink-0 ${selectedArticleId === article.id ? 'text-accent-400' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {article.title}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {article.content.substring(0, 50)}...
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Section */}
      {stats && selectedArticleId && (
        <div className="p-4 border-t border-gray-700">
          <h3 className="text-xs font-semibold text-accent-500 uppercase tracking-wider mb-2">
            Activity Stats
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1 text-gray-400">
                <Clock className="w-3 h-3 text-accent-400" />
                <span>Time spent</span>
              </span>
              <span className="text-gray-300">{formatTime(stats.totalTimeSpent)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1 text-gray-400">
                <Bot className="w-3 h-3 text-accent-400" />
                <span>AI requests</span>
              </span>
              <span className="text-gray-300">{stats.totalAiRequests}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1 text-gray-400">
                <Edit3 className="w-3 h-3 text-accent-400" />
                <span>Manual edits</span>
              </span>
              <span className="text-gray-300">{stats.totalManualEdits}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 space-y-3">
        {user && (
          <div className="text-xs text-gray-400 text-center">
            {user.email}
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}