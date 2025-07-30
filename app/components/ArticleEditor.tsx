'use client';

import React, { useState, useEffect, useRef, useContext, useCallback, lazy, Suspense } from 'react';
import { Save, Send, Bot, Edit3, Check, X, Pencil, Trash2, Copy, Clock, User, Eye, Code, Loader2 } from 'lucide-react';
import ActivityTracker from './ActivityTracker';
import { useAuth } from './AuthProvider';
import { ActivityContext } from './ActivityContext';
import Toast from './Toast';
import { LoadingButton } from '../../components/LoadingButton';
import { logger } from '@/lib/logger';
import MarkdownRenderer from './MarkdownRenderer';
import DiffApproval from './DiffApproval';

// Lazy load ChatInterfaceV2 to reduce initial bundle size
const ChatInterfaceV2 = lazy(() => import('./ChatInterfaceV2'));

interface Article {
  id: string;
  title: string;
  content: string;
  status?: string;
  updated_at?: string;
  last_editor?: {
    id: string;
    email: string;
  };
}

interface ArticleEditorProps {
  article: Article;
  onSave: (articleId: string, title: string, content: string) => Promise<{ success: boolean; error?: string }>;
  onSend: (articleId: string) => void;
  onDelete?: (articleId: string) => void;
  onDuplicate?: (articleId: string) => void;
}

interface ArticleEditorInnerProps extends ArticleEditorProps {
  user: any;
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
  isSaving: boolean;
  handleSave: () => Promise<void>;
  isSending: boolean;
  handleSend: () => Promise<void>;
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  isEditingTitle: boolean;
  setIsEditingTitle: (editing: boolean) => void;
  tempTitle: string;
  setTempTitle: (title: string) => void;
  handleTitleSave: () => void;
  handleTitleCancel: () => void;
  showDeleteModal: boolean;
  setShowDeleteModal: (show: boolean) => void;
  isDeleting: boolean;
  handleDelete: () => Promise<void>;
  isDuplicating: boolean;
  handleDuplicate: () => Promise<void>;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
  isPreviewMode: boolean;
  setIsPreviewMode: (preview: boolean) => void;
  pendingEdit: any;
  setPendingEdit: (edit: any) => void;
  isAiProcessing: boolean;
  setIsAiProcessing: (processing: boolean) => void;
  formatTimeAgo: (dateString?: string) => string;
  editTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  lastSavedContent: string;
}

// Inner component that has access to ActivityContext
function ArticleEditorInner(props: ArticleEditorInnerProps) {
  const {
    article,
    onSave,
    onSend,
    onDelete,
    onDuplicate,
    user,
    title,
    setTitle,
    content,
    setContent,
    isSaving,
    handleSave,
    isSending,
    handleSend,
    showChat,
    setShowChat,
    isEditingTitle,
    setIsEditingTitle,
    tempTitle,
    setTempTitle,
    handleTitleSave,
    handleTitleCancel,
    showDeleteModal,
    setShowDeleteModal,
    isDeleting,
    handleDelete,
    isDuplicating,
    handleDuplicate,
    toast,
    setToast,
    isPreviewMode,
    setIsPreviewMode,
    pendingEdit,
    setPendingEdit,
    isAiProcessing,
    setIsAiProcessing,
    formatTimeAgo,
    editTimerRef,
    lastSavedContent
  } = props;

  const activityContext = useContext(ActivityContext);
  const initialContentRef = useRef(content);
  const hasEditedRef = useRef(false);

  // Reset when article changes or content is saved
  useEffect(() => {
    initialContentRef.current = lastSavedContent;
    hasEditedRef.current = false;
  }, [article.id, lastSavedContent]); // Reset when article changes or content is saved

  // Stable handler that won't cause re-renders
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    
    // Track manual edits with debouncing
    if (activityContext?.incrementManualEdits) {
      // Clear previous timer
      if (editTimerRef.current) {
        clearTimeout(editTimerRef.current);
      }
      
      // Set new timer to track edit after user stops typing
      editTimerRef.current = setTimeout(() => {
        // Count words in initial content and new content
        const initialWordCount = initialContentRef.current.split(/\s+/).filter(Boolean).length;
        const newWordCount = newContent.split(/\s+/).filter(Boolean).length;
        
        // If word count changed from the last saved content, it's a manual edit
        if (newWordCount !== initialWordCount && !hasEditedRef.current) {
          
          activityContext.incrementManualEdits();
          hasEditedRef.current = true;
        } else if (newWordCount !== initialWordCount && hasEditedRef.current) {
        } else {
        }
      }, 1000); // Track edit after 1 second of no typing
    } else {
    }
  }, [activityContext, setContent, editTimerRef]);

  return (
    <div className="h-full grid grid-rows-[auto_1fr]">
      {/* Header - Fixed height */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
          {/* Title and editor info section */}
          <div className="flex items-center min-w-0">
            <div className="flex items-center space-x-2 flex-shrink-0">
              {isEditingTitle ? (
                <>
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleTitleSave();
                      }
                    }}
                    className="text-2xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-b-2 border-accent-500 outline-none w-full max-w-md"
                    placeholder="Article Title"
                    autoFocus
                  />
                  <button
                    onClick={handleTitleSave}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleTitleCancel}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    title="Edit title"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            {/* Last editor info */}
            {article.last_editor && (
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1 ml-6 truncate">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Last edited by: <span className="text-gray-600 dark:text-accent-400">{article.last_editor.email}</span></span>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="flex-shrink-0">{formatTimeAgo(article.updated_at)}</span>
              </div>
            )}
          </div>
          
          {/* Action buttons section */}
          <div className="flex items-center space-x-2 lg:space-x-3 flex-shrink-0">
            <button
              onClick={() => setShowChat(!showChat)}
              type="button"
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                showChat 
                  ? 'bg-accent-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI Editor</span>
            </button>
            <LoadingButton
              onClick={handleSave}
              loading={isSaving}
              loadingText="Saving..."
              type="button"
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save</span>
            </LoadingButton>
            <LoadingButton
              onClick={handleSend}
              loading={isSending}
              loadingText="Sending..."
              type="button"
              className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span className="hidden lg:inline">Send to n8n</span>
            </LoadingButton>
            {onDuplicate && (
              <LoadingButton
                onClick={handleDuplicate}
                loading={isDuplicating}
                loadingText="Duplicating..."
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                title="Duplicate article"
                type="button"
              >
                <Copy className="w-4 h-4" />
                <span className="hidden lg:inline">Duplicate</span>
              </LoadingButton>
            )}
            {onDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                type="button"
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden lg:inline">Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Area - Uses CSS Grid for consistent layout */}
      <div className={`grid ${showChat ? 'md:grid-cols-2 grid-cols-1' : 'grid-cols-1'} overflow-hidden`}>
        {/* Editor Column */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full relative">
              <div className="p-6 h-full flex flex-col overflow-hidden">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <Edit3 className="w-4 h-4" />
                    <span className="text-sm font-medium">Article Content</span>
                  </div>
                  <button
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {isPreviewMode ? (
                      <>
                        <Code className="w-4 h-4" />
                        <span>Edit</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Preview</span>
                      </>
                    )}
                  </button>
                </div>
                {isPreviewMode ? (
                  <div className="flex-1 w-full p-6 bg-white dark:bg-gray-700 rounded-lg overflow-y-auto relative">
                    {pendingEdit && (
                      <div className="absolute inset-0 bg-white dark:bg-gray-700 z-10 p-6 overflow-y-auto">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Suggested Edit</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{pendingEdit.explanation}</p>
                        </div>
                        <DiffApproval
                          original={pendingEdit.original}
                          modified={pendingEdit.modified}
                          diff={pendingEdit.diff}
                          explanation=""
                          onApprove={() => {
                            const newContent = content.replace(pendingEdit.original, pendingEdit.modified);
                            setContent(newContent);
                            setPendingEdit(null);
                            onSave(article.id, title, newContent);
                            setToast({ message: 'Edit applied successfully!', type: 'success' });
                          }}
                          onReject={() => {
                            setPendingEdit(null);
                            setToast({ message: 'Edit rejected', type: 'info' });
                          }}
                        />
                      </div>
                    )}
                    <MarkdownRenderer content={content || ''} />
                  </div>
                ) : (
                  <div className="flex-1 relative">
                    {isAiProcessing && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-gray-700/50 z-10 flex items-center justify-center">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex items-center space-x-3">
                          <Loader2 className="w-6 h-6 animate-spin text-accent-600 dark:text-accent-400" />
                          <span className="text-gray-700 dark:text-gray-300">AI is processing your request...</span>
                        </div>
                      </div>
                    )}
                    <textarea
                      value={content || ''}
                      onChange={handleContentChange}
                      className="w-full h-full p-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none overflow-y-auto"
                      placeholder="Start writing your article..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Chat Panel */}
        {showChat && (
          <div className="border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-hidden">
            <div className="p-6 pb-4 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Editor Assistant</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Chat with Claude to improve your article</p>
            </div>
            <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden flex flex-col">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              }>
                <ChatInterfaceV2 
                  articleId={article.id}
                  articleContent={content}
                  articleTitle={title}
                  onUpdateContent={(newContent) => {
                    setContent(newContent);
                    setPendingEdit(null); // Clear pending edit after applying
                    // Auto-save after AI update - we need to save with the new content
                    onSave(article.id, title, newContent);
                    setToast({ message: 'Article updated successfully!', type: 'success' });
                  }}
                  onPendingEdit={(edit) => setPendingEdit(edit)}
                  onLoadingChange={(loading) => setIsAiProcessing(loading)}
                />
              </Suspense>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{title}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <LoadingButton
                onClick={handleDelete}
                loading={isDeleting}
                loadingText="Deleting..."
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Delete
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default function ArticleEditor({ article, onSave, onSend, onDelete, onDuplicate }: ArticleEditorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(article.title);
  const [content, setContent] = useState(article.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(article.title);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const editTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{
    original: string;
    modified: string;
    diff: any;
    explanation: string;
  } | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState(article.content);

  useEffect(() => {
    setTitle(article.title);
    setContent(article.content);
    setTempTitle(article.title);
    setShowChat(false);
    setIsEditingTitle(false);
    setShowDeleteModal(false);
    setLastSavedContent(article.content);
  }, [article]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await onSave(article.id, title, content);
      if (result.success) {
        setToast({ message: 'Article saved successfully!', type: 'success' });
        logger.info('Article saved', { articleId: article.id, userId: user?.id });
        // Update last saved content after successful save
        setLastSavedContent(content);
      } else {
        logger.error('Save failed', new Error(result.error || 'Unknown error'), { articleId: article.id });
        setToast({ 
          message: result.error || 'Failed to save article', 
          type: 'error' 
        });
      }
    } catch (error) {
      logger.error('Error saving article', error as Error, { articleId: article.id });
      setToast({ 
        message: error instanceof Error ? error.message : 'Failed to save article', 
        type: 'error' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleSave = async () => {
    setTitle(tempTitle);
    setIsEditingTitle(false);
    // Auto-save when title is changed
    const result = await onSave(article.id, tempTitle, content);
    if (result.success) {
      setLastSavedContent(content);
    }
  };

  const handleTitleCancel = () => {
    setTempTitle(title);
    setIsEditingTitle(false);
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onSend(article.id);
      logger.info('Article sent to n8n', { articleId: article.id, userId: user?.id });
    } catch (error) {
      logger.error('Error sending article to n8n', error as Error, { articleId: article.id });
      setToast({ 
        message: error instanceof Error ? error.message : 'Failed to send article', 
        type: 'error' 
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(article.id);
      setShowDeleteModal(false);
      logger.info('Article deleted', { articleId: article.id, userId: user?.id });
    } catch (error) {
      logger.error('Error deleting article', error as Error, { articleId: article.id });
      setToast({ 
        message: error instanceof Error ? error.message : 'Failed to delete article', 
        type: 'error' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    logger.debug('Duplicate button clicked', { articleId: article.id });
    
    if (!onDuplicate) {
      logger.error('onDuplicate function not provided');
      setToast({ message: 'Duplicate functionality not available', type: 'error' });
      return;
    }
    
    setIsDuplicating(true);
    setToast({ message: 'Creating duplicate...', type: 'info' });
    
    try {
      await onDuplicate(article.id);
      logger.info('Article duplicated successfully', { articleId: article.id, userId: user?.id });
      // Toast will be shown in the parent component after successful duplication
    } catch (error) {
      logger.error('Error duplicating article', error as Error, { articleId: article.id });
      setToast({ 
        message: error instanceof Error ? error.message : 'Failed to duplicate article', 
        type: 'error' 
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'never';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Auto-switch to preview mode when pending edit is ready
  useEffect(() => {
    if (pendingEdit) {
      setIsPreviewMode(true);
    }
  }, [pendingEdit]);

  const props: ArticleEditorInnerProps = {
    article,
    onSave,
    onSend,
    onDelete,
    onDuplicate,
    user,
    title,
    setTitle,
    content,
    setContent,
    isSaving,
    handleSave,
    isSending,
    handleSend,
    showChat,
    setShowChat,
    isEditingTitle,
    setIsEditingTitle,
    tempTitle,
    setTempTitle,
    handleTitleSave,
    handleTitleCancel,
    showDeleteModal,
    setShowDeleteModal,
    isDeleting,
    handleDelete,
    isDuplicating,
    handleDuplicate,
    toast,
    setToast,
    isPreviewMode,
    setIsPreviewMode,
    pendingEdit,
    setPendingEdit,
    isAiProcessing,
    setIsAiProcessing,
    formatTimeAgo,
    editTimerRef,
    lastSavedContent
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Activity Tracker - wraps the entire component to provide context */}
      {user ? (
        <ActivityTracker articleId={article.id} userId={user.id}>
          <ArticleEditorInner {...props} />
        </ActivityTracker>
      ) : (
        <ArticleEditorInner {...props} />
      )}
    </div>
  );
}