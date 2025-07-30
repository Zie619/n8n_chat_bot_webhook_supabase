'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Check, X, Trash2, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { useActivityContext } from './ActivityContext';
import { useAuth } from './AuthProvider';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestionApplied?: boolean;
}

interface ChatInterfaceProps {
  articleId: string;
  articleContent: string;
  onSave?: (messages: Message[]) => void;
  onUpdateContent?: (newContent: string) => void;
}

interface Command {
  command: string;
  description: string;
}

interface CommandCategoryProps {
  title: string;
  commands: Command[];
  onCommandClick: (command: string) => void;
}

const CommandCategory: React.FC<CommandCategoryProps> = ({ title, commands, onCommandClick }) => (
  <div>
    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
      {title}
    </h4>
    <div className="space-y-1">
      {commands.map((cmd, index) => (
        <button
          key={index}
          onClick={() => onCommandClick(cmd.command)}
          className="text-xs w-full text-left hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded transition-colors group"
        >
          <span className="font-medium text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded group-hover:bg-gray-300 dark:group-hover:bg-gray-500">
            {cmd.command}
          </span>
          <span className="text-gray-600 dark:text-gray-300 ml-2">{cmd.description}</span>
        </button>
      ))}
    </div>
  </div>
);

export default function ChatInterface({ articleId, articleContent, onSave, onUpdateContent }: ChatInterfaceProps) {

  const [messages, setMessages] = useState<Message[]>(() => {
    // Load messages from localStorage on mount using article ID
    if (typeof window !== 'undefined' && articleId) {
      const saved = localStorage.getItem(`chat-history-${articleId}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const { incrementAiRequests } = useActivityContext();
  const { token } = useAuth();

  // Load messages when articleId changes
  useEffect(() => {
    if (typeof window !== 'undefined' && articleId) {
      const saved = localStorage.getItem(`chat-history-${articleId}`);
      setMessages(saved ? JSON.parse(saved) : []);
    }
  }, [articleId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0 && articleId) {
      localStorage.setItem(`chat-history-${articleId}`, JSON.stringify(messages));
    }
  }, [messages, articleId]);


  const handleClearChat = () => {
    setShowClearConfirm(true);
  };

  const confirmClearChat = () => {
    // Clear messages from state
    setMessages([]);
    
    // Clear messages from localStorage
    if (typeof window !== 'undefined' && articleId) {
      localStorage.removeItem(`chat-history-${articleId}`);
    }
    
    // Close confirmation dialog
    setShowClearConfirm(false);
  };

  const cancelClearChat = () => {
    setShowClearConfirm(false);
  };

  const handleCommandClick = (command: string) => {
    setInput(command);
    setShowCommands(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Increment AI requests counter
    incrementAiRequests();

    try {
      const response = await fetch('/api/claude-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          command: input.trim(),
          content: articleContent,
          contentId: articleId
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      
      console.log('API Response:', data); // Debug log
      
      // Directly apply the changes without questions
      if (data.success && data.modifiedContent) {
        // Update the content immediately
        if (onUpdateContent) {
          onUpdateContent(data.modifiedContent);
        }
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✓ Changes applied successfully! ${data.executionMethod === 'simple' ? '(Quick command)' : '(AI processed)'}`,
          suggestionApplied: true
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('No modified content received');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Get more specific error message
      let errorContent = 'I apologize, but I encountered an error processing your request.';
      
      if (error instanceof Error) {
        errorContent += ` Error: ${error.message}`;
      }
      
      // Add error message to the chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header with Clear Button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Assistant</h3>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Clear chat history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center space-y-2">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Start a conversation about this article...
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs">
              Try commands like &quot;Add a line about...&quot; or &quot;Improve clarity&quot;
            </p>
            <button
              onClick={() => setShowCommands(true)}
              className="text-xs text-accent-500 hover:text-accent-600 dark:text-accent-400 dark:hover:text-accent-300"
            >
              View available commands
            </button>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-accent-500 text-white'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.suggestionApplied && (
                  <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>Changes applied</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500 dark:text-gray-400" />
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0 bg-gray-50 dark:bg-gray-900">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Claude to edit this article..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {/* Available Commands Section */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowCommands(!showCommands)}
          className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-accent-600 dark:text-accent-400" />
            <span>Available Commands</span>
          </div>
          {showCommands ? (
            <ChevronDown className="w-4 h-4 text-accent-600 dark:text-accent-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-accent-600 dark:text-accent-400" />
          )}
        </button>
        
        {showCommands && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 space-y-3 max-h-64 overflow-y-auto">
            {/* Natural Language Examples */}
            <CommandCategory
              title="✨ Try Natural Language"
              commands={[
                { command: 'Make this sound more friendly', description: 'Adjusts tone naturally' },
                { command: 'Can you add something about pricing?', description: 'Adds new content' },
                { command: 'This paragraph seems too complex', description: 'Simplifies automatically' },
                { command: 'Help me improve this', description: 'AI suggests improvements' },
                { command: 'The introduction needs work', description: 'Focuses on specific sections' },
                { command: 'Add an example here', description: 'Contextual additions' }
              ]}
              onCommandClick={handleCommandClick}
            />

            {/* Common Editing Tasks */}
            <CommandCategory
              title="📝 Quick Edits"
              commands={[
                { command: 'Add a paragraph about ', description: 'Write new content' },
                { command: 'Remove the part about ', description: 'Delete specific content' },
                { command: 'Make it shorter', description: 'Condense the content' },
                { command: 'Expand on this topic', description: 'Add more detail' },
                { command: 'Fix any errors', description: 'Grammar and spelling' },
                { command: 'Continue writing', description: 'AI continues from where you left off' }
              ]}
              onCommandClick={handleCommandClick}
            />

            {/* Tone Adjustments */}
            <CommandCategory
              title="🎨 Style & Tone"
              commands={[
                { command: 'Make it more professional', description: 'Business tone' },
                { command: 'Too formal, make it casual', description: 'Relaxed tone' },
                { command: 'Simplify this', description: 'Easier to read' },
                { command: 'Sounds too salesy', description: 'Reduce promotional tone' },
                { command: 'More engaging please', description: 'Captivate readers' },
                { command: 'Academic style', description: 'Scholarly tone' }
              ]}
              onCommandClick={handleCommandClick}
            />

            {/* Structure & Format */}
            <CommandCategory
              title="📋 Structure"
              commands={[
                { command: 'Add headings', description: 'Organize content' },
                { command: 'Break this into sections', description: 'Better structure' },
                { command: 'Create a list from this', description: 'Bullet points' },
                { command: 'Needs better flow', description: 'Improve transitions' },
                { command: 'Add a summary', description: 'Key takeaways' },
                { command: 'Include a conclusion', description: 'Wrap up nicely' }
              ]}
              onCommandClick={handleCommandClick}
            />

            {/* Analysis & Feedback */}
            <CommandCategory
              title="🔍 Analysis"
              commands={[
                { command: 'How can I improve this?', description: 'Get suggestions' },
                { command: 'Check the quality', description: 'Content analysis' },
                { command: 'Is this clear enough?', description: 'Clarity check' },
                { command: 'Any suggestions?', description: 'AI recommendations' },
                { command: 'Review for SEO', description: 'Search optimization' },
                { command: 'What\'s missing?', description: 'Gap analysis' }
              ]}
              onCommandClick={handleCommandClick}
            />
          </div>
        )}
      </div>

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Clear Chat History?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This will permanently delete all messages in this conversation. This action cannot be undone.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={cancelClearChat}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearChat}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}