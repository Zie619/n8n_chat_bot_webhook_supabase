'use client';

import React from 'react';
import ArticleCard from './ArticleCard';

interface Article {
  id: string;
  title: string;
  content: string;
}

interface ArticleListProps {
  articles: Article[];
  onSaveArticle?: (articleId: string, updatedContent: string) => void;
  onSendArticle?: (articleId: string) => void;
}

export default function ArticleList({ 
  articles, 
  onSaveArticle, 
  onSendArticle 
}: ArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 text-lg mb-2">No articles yet</p>
        <p className="text-gray-400 text-sm">Articles will appear here once created</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          onSave={onSaveArticle}
          onSend={onSendArticle}
        />
      ))}
    </div>
  );
}