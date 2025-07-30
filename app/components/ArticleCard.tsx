'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Save, Send } from 'lucide-react';
import ChatInterface from './ChatInterface';

interface Article {
  id: string;
  title: string;
  content: string;
}

interface ArticleCardProps {
  article: Article;
  onSave?: (articleId: string, updatedContent: string) => void;
  onSend?: (articleId: string) => void;
}

export default function ArticleCard({ article, onSave, onSend }: ArticleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedContent, setEditedContent] = useState(article.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(article.id, editedContent);
    } catch (error) {
      console.error('Error saving article:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!onSend) return;
    
    try {
      await onSend(article.id);
    } catch (error) {
      console.error('Error sending article:', error);
    }
  };

  const getContentPreview = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 transition-all duration-200 hover:shadow-lg">
      {/* Header */}
      <div
        className="p-6 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {article.title}
          </h3>
          {!isExpanded && (
            <p className="text-gray-600 text-sm">
              {getContentPreview(editedContent)}
            </p>
          )}
        </div>
        <button
          className="ml-4 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Content Editor */}
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Article Content
            </label>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-40 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
              placeholder="Enter article content..."
            />
          </div>

          {/* Chat Interface */}
          <div className="px-6 pb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Chat with Claude
            </h4>
            <ChatInterface 
              articleId={article.id}
              articleContent={editedContent}
              onSave={(messages) => {
                // TODO: Implement chat history saving
                console.log('Saving chat history:', messages);
              }}
              onUpdateContent={async (newContent) => {
                setEditedContent(newContent);
                // Auto-save the AI suggestions
                if (onSave) {
                  setIsSaving(true);
                  try {
                    await onSave(article.id, newContent);
                  } catch (error) {
                    console.error('Error saving AI suggestions:', error);
                  } finally {
                    setIsSaving(false);
                  }
                }
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="px-6 pb-6 flex justify-end space-x-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={handleSend}
              className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 transition-colors flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}