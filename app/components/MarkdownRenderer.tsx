'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Simple markdown to HTML conversion
  const renderMarkdown = (text: string): string => {
    let html = text;
    
    // Code blocks first (to prevent other formatting inside)
    html = html.replace(/```([^`]+)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4"><code class="text-sm text-gray-900 dark:text-gray-100">$1</code></pre>');
    
    // Inline code (before other inline formatting)
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm text-gray-900 dark:text-gray-100">$1</code>');
    
    // Headers with accent colors - handle lines with text before headers
    html = html.replace(/^(.*)### (.*$)/gim, function(match, before, header) {
      if (before.trim()) {
        return `<p class="mb-4 leading-relaxed text-gray-800 dark:text-gray-200">${before}</p>\n<h3 class="text-xl font-semibold mb-3 mt-4 text-accent-700 dark:text-accent-400">${header}</h3>`;
      }
      return `<h3 class="text-xl font-semibold mb-3 mt-4 text-accent-700 dark:text-accent-400">${header}</h3>`;
    });
    html = html.replace(/^(.*)## (.*$)/gim, function(match, before, header) {
      if (before.trim()) {
        return `<p class="mb-4 leading-relaxed text-gray-800 dark:text-gray-200">${before}</p>\n<h2 class="text-2xl font-bold mb-4 mt-6 text-accent-600 dark:text-accent-400">${header}</h2>`;
      }
      return `<h2 class="text-2xl font-bold mb-4 mt-6 text-accent-600 dark:text-accent-400">${header}</h2>`;
    });
    html = html.replace(/^(.*)# (.*$)/gim, function(match, before, header) {
      if (before.trim()) {
        return `<p class="mb-4 leading-relaxed text-gray-800 dark:text-gray-200">${before}</p>\n<h1 class="text-3xl font-bold mb-6 mt-8 text-accent-600 dark:text-accent-300">${header}</h1>`;
      }
      return `<h1 class="text-3xl font-bold mb-6 mt-8 text-accent-600 dark:text-accent-300">${header}</h1>`;
    });
    
    // Bold (before italic to prevent conflicts)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong class="font-semibold">$1</strong>');
    
    // Italic (more specific regex to avoid conflicts)
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic">$1</em>');
    html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em class="italic">$1</em>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 underline">$1</a>');
    
    // Lists with proper text color
    html = html.replace(/^\* (.+)$/gim, '<li class="ml-6 mb-1 list-disc text-gray-800 dark:text-gray-200">$1</li>');
    html = html.replace(/^- (.+)$/gim, '<li class="ml-6 mb-1 list-disc text-gray-800 dark:text-gray-200">$1</li>');
    html = html.replace(/^\d+\. (.+)$/gim, '<li class="ml-6 mb-1 list-decimal text-gray-800 dark:text-gray-200">$1</li>');
    
    // Blockquotes
    html = html.replace(/^> (.+)$/gim, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-700 dark:text-gray-300 my-4">$1</blockquote>');
    
    // Paragraphs with text color
    html = html.split('\n\n').map(para => {
      para = para.trim();
      if (para && !para.startsWith('<')) {
        return `<p class="mb-4 leading-relaxed text-gray-800 dark:text-gray-200">${para}</p>`;
      }
      return para;
    }).join('\n');
    
    // Wrap lists with proper styling
    html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => {
      if (match.includes('list-decimal')) {
        return `<ol class="mb-4 marker:text-accent-600 dark:marker:text-accent-400">${match}</ol>`;
      }
      return `<ul class="mb-4 marker:text-accent-600 dark:marker:text-accent-400">${match}</ul>`;
    });
    
    return html;
  };
  
  return (
    <div 
      className={`prose prose-gray dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}