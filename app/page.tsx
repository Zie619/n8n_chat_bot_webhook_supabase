'use client';

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ArticleEditor from './components/ArticleEditor';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import { useAuth } from './components/AuthProvider';

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

export default function Home() {
  const { user, token } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load articles from database
  useEffect(() => {
    if (user && token) {
      loadArticles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const loadArticles = async () => {
    try {
      const response = await fetch('/api/articles', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      
      if (response.ok) {
        const data = await response.json();
        setArticles(data);
        if (data.length > 0 && !selectedArticleId) {
          setSelectedArticleId(data[0].id);
        }
      } else {
        const error = await response.json();
      }
    } catch (error) {
      console.error('Failed to load articles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedArticle = articles.find(a => a.id === selectedArticleId);

  const handleSaveArticle = async (articleId: string, title: string, content: string) => {
    
    try {
      const response = await fetch('/api/save-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          articleId,
          title,
          content,
        }),
      });

      if (response.ok) {
        const updatedArticle = await response.json();
        // Update the article in the state with all the new data including last_editor
        setArticles(prev => prev.map(article => 
          article.id === articleId 
            ? { ...article, title, content, updated_at: updatedArticle.updated_at, last_editor: updatedArticle.last_editor }
            : article
        ));
        return { success: true };
      } else {
        const error = await response.text();
        return { success: false, error: 'Failed to save article' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to save article' };
    }
  };

  const handleSendArticle = async (articleId: string) => {
    
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return;
    }
    
    try {
      // Prepare webhook payload
      const webhookPayload = {
        article_id: articleId,
        status: 'final',
        title: article.title,
        content: article.content,
        timestamp: new Date().toISOString(),
        user_email: user?.email,
        word_count: article.content.split(/\s+/).length,
      };
      
      
      // Show loading state
      
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(webhookPayload),
      });
      
      const responseData = await response.json();
      
      if (response.ok) {
        
        // Show detailed success notification
        const successMessage = `Article "${article.title}" sent to n8n successfully!\n\nWebhook URL: ${responseData.webhook_url}\nTimestamp: ${new Date().toLocaleString()}`;
        alert(successMessage);
        
        // Update article status
        setArticles(prev => prev.map(a => 
          a.id === articleId 
            ? { ...a, status: 'final' }
            : a
        ));
        
        // Save webhook history (for debugging)
        localStorage.setItem(`webhook_${articleId}_${Date.now()}`, JSON.stringify({
          payload: webhookPayload,
          response: responseData,
          timestamp: new Date().toISOString(),
        }));
      } else {
        
        // Show detailed error message
        let errorMessage = `Failed to send article to n8n:\n\n${responseData.error || 'Unknown error'}`;
        
        if (responseData.troubleshooting) {
          errorMessage += '\n\nTroubleshooting tips:\n' + responseData.troubleshooting.join('\n- ');
        }
        
        if (responseData.lastError) {
          errorMessage += `\n\nTechnical details: ${responseData.lastError}`;
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      alert(`Error sending article to n8n:\n\n${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const runDebugCheck = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/debug', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const debugInfo = await response.json();
      
      if (debugInfo.recommendations && debugInfo.recommendations.length > 0) {
      }
    } catch (error) {
    }
  };

  const handleNewArticle = async () => {
    try {
      // Enhanced logging
      
      if (!token) {
        alert('You must be logged in to create articles');
            return;
      }

      // Run debug check first
      await runDebugCheck();

      const requestBody = {
        title: 'New Article',
        content: '',
      };

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });


      // Try to get response body regardless of status
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        responseData = { error: responseText };
      }

      if (response.ok) {
        console.log('✅ Article created successfully:', responseData);
        setArticles(prev => [responseData, ...prev]);
        setSelectedArticleId(responseData.id);
      } else {
        console.error('❌ Failed to create article:', responseData);
        
        // Run schema diagnostic
        try {
          const schemaResponse = await fetch('/api/db-schema', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (schemaResponse.ok) {
            const schemaInfo = await schemaResponse.json();
            
            if (schemaInfo.recommendations && schemaInfo.recommendations.length > 0) {
            }
          }
        } catch (schemaError) {
        }
        
        alert(`Failed to create article: ${responseData.error || responseData.details || 'Unknown error'}. Check browser console for detailed diagnostic information.`);
      }
      
      } catch (error) {
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        
      alert(`Error creating article: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    
    try {
      const response = await fetch(`/api/articles?id=${articleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove article from state
        setArticles(prev => prev.filter(article => article.id !== articleId));
        
        // If deleted article was selected, select the first remaining article
        if (selectedArticleId === articleId) {
          const remainingArticles = articles.filter(a => a.id !== articleId);
          setSelectedArticleId(remainingArticles[0]?.id || null);
        }
      }
    } catch (error) {
      console.error('Failed to delete article:', error);
    }
  };

  const handleDuplicateArticle = async (articleId: string) => {
    console.log('Article ID:', articleId);
    console.log('Token present:', !!token);
    
    // Check if token exists
    if (!token) {
      console.error('❌ No authentication token');
      alert('You must be logged in to duplicate articles');
        return;
    }
    
    // Find the article to duplicate
    const articleToDuplicate = articles.find(a => a.id === articleId);
    
    if (!articleToDuplicate) {
      console.error('Article not found in state');
      alert('Article not found. Please refresh and try again.');
        return;
    }
    
    try {
      const requestBody = {
        title: `${articleToDuplicate.title} (Copy)`,
        content: articleToDuplicate.content || '',
      };
      console.log('API endpoint:', '/api/articles');
      
      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      
      // Try to get response text first
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        responseData = { error: 'Failed to parse server response', raw: responseText };
      }
      
      if (response.ok && responseData && responseData.id) {
        // Add the duplicated article to the state
        setArticles(prev => {
          const newArticles = [responseData, ...prev];
          return newArticles;
        });
        
        // Select the newly duplicated article
        setSelectedArticleId(responseData.id);
        
        // Show a more user-friendly notification
        const successMessage = `Article "${articleToDuplicate.title}" has been duplicated successfully!`;
        console.log(successMessage);
      } else {
        const errorMessage = responseData.error || responseData.details || 'Unknown error';
        alert(`Failed to duplicate article: ${errorMessage}`);
      }
    } catch (error) {
      alert(`Error duplicating article: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen bg-gray-100 items-center justify-center">
          <div className="text-gray-500">Loading articles...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="h-screen grid grid-rows-[auto_1fr] bg-gray-100 dark:bg-gray-900 pb-8">
        <Header />
        <div className="grid grid-cols-[auto_1fr] overflow-hidden">
          <Sidebar
            articles={articles}
            selectedArticleId={selectedArticleId}
            onSelectArticle={setSelectedArticleId}
            onNewArticle={handleNewArticle}
          />
        
          <div className="overflow-hidden">
            {selectedArticle ? (
              <ArticleEditor
                key={selectedArticle.id}
                article={selectedArticle}
                onSave={handleSaveArticle}
                onSend={handleSendArticle}
                onDelete={handleDeleteArticle}
                onDuplicate={handleDuplicateArticle}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                {articles.length === 0 ? (
                  <div className="text-center">
                    <p className="mb-4">No articles yet.</p>
                    <button
                      onClick={handleNewArticle}
                      className="px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700"
                    >
                      Create your first article
                    </button>
                  </div>
                ) : (
                  <p>Select an article to start editing</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}