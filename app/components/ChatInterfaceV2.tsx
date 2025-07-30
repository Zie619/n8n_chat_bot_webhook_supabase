'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Trash2, Bot, User, Sparkles } from 'lucide-react';
import { useActivityContext } from './ActivityContext';
import { useAuth } from './AuthProvider';
import DiffApproval from './DiffApproval';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedEdit?: {
    original: string;
    modified: string;
    diff: any;
    explanation: string;
  };
  editStatus?: 'pending' | 'approved' | 'rejected';
}

interface ChatInterfaceV2Props {
  articleId: string;
  articleContent: string;
  articleTitle?: string;
  onUpdateContent: (newContent: string) => void;
  onPendingEdit?: (edit: { original: string; modified: string; diff: any; explanation: string } | null) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

export default function ChatInterfaceV2({ 
  articleId, 
  articleContent, 
  articleTitle,
  onUpdateContent,
  onPendingEdit,
  onLoadingChange
}: ChatInterfaceV2Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { incrementAiRequests } = useActivityContext();
  const { token } = useAuth();

  // Load chat history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && articleId) {
      // Demo chat history for demo articles
      if (articleId === 'demo-article-1') {
        const demoMessages: Message[] = [
          {
            id: 'demo-msg-1',
            role: 'user',
            content: 'Can you help me improve the introduction?',
            timestamp: new Date(Date.now() - 60 * 60 * 1000),
            editStatus: 'approved'
          },
          {
            id: 'demo-msg-2',
            role: 'assistant',
            content: 'I\'d be happy to help improve the introduction! The current introduction is clear and welcoming. Here\'s a suggestion to make it even more engaging:\n\n"Welcome to xFunnel, where AI meets creativity! This demo showcases our powerful article editor that transforms your writing process with intelligent assistance."\n\nThis version adds more energy and immediately highlights the AI-powered nature of the platform.',
            timestamp: new Date(Date.now() - 59 * 60 * 1000),
            editStatus: 'approved'
          },
          {
            id: 'demo-msg-3',
            role: 'user',
            content: 'Great! Can you also suggest a better structure for the features section?',
            timestamp: new Date(Date.now() - 30 * 60 * 1000)
          },
          {
            id: 'demo-msg-4',
            role: 'assistant',
            content: 'Absolutely! Here\'s a more structured approach for your features section:\n\n## Core Features\n\n### ✍️ Smart Editing\n- Real-time markdown preview\n- Auto-save functionality\n- Rich formatting options\n\n### 🤖 AI Integration\n- Claude-powered writing assistance\n- Grammar and style suggestions\n- Content generation and expansion\n\n### 🚀 Workflow Tools\n- One-click article duplication\n- Webhook integration for publishing\n- Export to multiple formats\n\nThis structure uses icons for visual appeal and groups related features together for better readability.',
            timestamp: new Date(Date.now() - 29 * 60 * 1000)
          }
        ];
        setMessages(demoMessages);
        return;
      } else if (articleId === 'demo-article-2') {
        const demoMessages: Message[] = [
          {
            id: 'demo-msg-5',
            role: 'user',
            content: 'What are some advanced AI writing techniques I should know about?',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
          },
          {
            id: 'demo-msg-6',
            role: 'assistant',
            content: 'Here are some advanced AI writing techniques to enhance your content:\n\n1. **Prompt Engineering**: Craft specific, detailed prompts to get better AI responses\n2. **Iterative Refinement**: Use AI suggestions as a starting point, then refine\n3. **Style Mirroring**: Ask AI to match the tone of existing content\n4. **Fact-Checking Loop**: Always verify AI-generated facts and statistics\n5. **Creative Brainstorming**: Use AI for ideation, not just writing\n\nRemember: AI is a powerful tool, but your human creativity and judgment are irreplaceable!',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000)
          }
        ];
        setMessages(demoMessages);
        return;
      }
      
      // Regular chat history loading
      const saved = localStorage.getItem(`chat-history-v2-${articleId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    }
  }, [articleId]);

  // Save chat history
  useEffect(() => {
    // Don't save chat history for demo articles
    if (messages.length > 0 && articleId && !articleId.startsWith('demo-')) {
      localStorage.setItem(`chat-history-v2-${articleId}`, JSON.stringify(messages));
    }
  }, [messages, articleId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    console.log('🚀 Submitting chat message:', input.trim());

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);
    incrementAiRequests();
    if (onLoadingChange) {
      onLoadingChange(true);
    }

    try {
      // Prepare conversation history for API
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log('📤 Sending to API:', {
        messageCount: apiMessages.length,
        hasToken: !!token,
        articleLength: articleContent.length
      });

      const response = await fetch('/api/claude-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          messages: apiMessages,
          articleContent,
          articleContext: {
            title: articleTitle,
            wordCount: articleContent.split(/\s+/).length
          }
        }),
      });

      console.log('📥 API Response status:', response.status);
      const data = await response.json();
      console.log('📥 API Response data:', data);
      
      if (!response.ok) {
        console.error('❌ API Error:', data.error);
        throw new Error(data.error || 'Failed to get response');
      }

      // Create assistant message
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        suggestedEdit: data.suggestedEdit,
        editStatus: data.suggestedEdit ? 'pending' : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // If there's a suggested edit, notify the parent component
      if (data.suggestedEdit && onPendingEdit) {
        onPendingEdit(data.suggestedEdit);
      }
    } catch (error) {
      console.error('Error in chat:', error);
      
      const errorMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: `I apologize, but I encountered an error. ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      if (onLoadingChange) {
        onLoadingChange(false);
      }
    }
  };

  const handleApproveEdit = (messageId: string, suggestedEdit: any) => {
    // Apply the edit to the content
    const newContent = articleContent.replace(suggestedEdit.original, suggestedEdit.modified);
    onUpdateContent(newContent);

    // Update message status
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, editStatus: 'approved' } : msg
    ));

    // Clear the pending edit
    if (onPendingEdit) {
      onPendingEdit(null);
    }

    // Add confirmation message
    const confirmMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: '✅ Edit applied successfully!',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmMessage]);
  };

  const handleRejectEdit = (messageId: string) => {
    // Update message status
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, editStatus: 'rejected' } : msg
    ));

    // Clear the pending edit
    if (onPendingEdit) {
      onPendingEdit(null);
    }

    // Add confirmation message
    const confirmMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: 'No problem! Feel free to ask for different changes.',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmMessage]);
  };

  const clearChat = () => {
    setMessages([]);
    if (articleId) {
      localStorage.removeItem(`chat-history-v2-${articleId}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-accent-600 dark:text-accent-400" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">AI Writing Assistant</h3>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              Hi! I&apos;m your AI writing assistant.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Ask me to help improve your article, suggest edits, or discuss your content.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id}>
                {/* Message bubble */}
                <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                  <div className={`flex items-start space-x-2 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-accent-600 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                      {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    
                    {/* Message content */}
                    <div>
                      <div className={`rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-accent-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Suggested edit - only show if not using external diff display */}
                {message.suggestedEdit && message.editStatus === 'pending' && !onPendingEdit && (
                  <div className="ml-10 mt-3">
                    <DiffApproval
                      original={message.suggestedEdit.original}
                      modified={message.suggestedEdit.modified}
                      diff={message.suggestedEdit.diff}
                      explanation={message.suggestedEdit.explanation}
                      onApprove={() => handleApproveEdit(message.id, message.suggestedEdit)}
                      onReject={() => handleRejectEdit(message.id)}
                    />
                  </div>
                )}
                
                {/* Show simple edit notice when using external diff display */}
                {message.suggestedEdit && message.editStatus === 'pending' && onPendingEdit && (
                  <div className="ml-10 mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      📝 Check the preview to see and approve/reject the suggested edit
                    </p>
                  </div>
                )}

                {/* Edit status badge */}
                {message.editStatus && message.editStatus !== 'pending' && (
                  <div className="ml-10 mt-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                      message.editStatus === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {message.editStatus === 'approved' ? '✅ Edit Applied' : '❌ Edit Rejected'}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isLoading) {
                  handleSubmit(e as any);
                }
              }
            }}
            placeholder="Ask me anything about your article... (Shift+Enter for new line)"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none min-h-[44px] max-h-[120px]"
            disabled={isLoading}
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 self-end"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          <Sparkles className="w-3 h-3 inline mr-1" />
          Try: &quot;Make the introduction more engaging&quot; or &quot;Help me improve the conclusion&quot;
        </p>
      </div>
    </div>
  );
}