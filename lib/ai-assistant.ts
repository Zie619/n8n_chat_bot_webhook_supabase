// Advanced AI Assistant for xFunnel
// This module provides intelligent command processing, context awareness, and sophisticated editing capabilities

import { detectTone } from './text-analysis';

// Types for AI Assistant functionality
export interface ArticleMetadata {
  id: string;
  title: string;
  wordCount: number;
  paragraphCount: number;
  sentenceCount: number;
  readabilityScore: number;
  tone: 'formal' | 'casual' | 'professional' | 'academic' | 'creative';
  topics: string[];
  keywords: string[];
  lastModified: Date;
  author?: string;
  language: string;
  hasHeadings: boolean;
  hasList: boolean;
  hasQuotes: boolean;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
}

export interface Command {
  type: 'simple' | 'compound' | 'conditional' | 'batch';
  action: string;
  parameters: Record<string, any>;
  subCommands?: Command[];
  condition?: string;
}

export interface EditContext {
  article: ArticleMetadata;
  conversationHistory: Message[];
  userPreferences: UserPreferences;
  currentFocus?: string; // Current section or paragraph being edited
}

export interface UserPreferences {
  preferredTone?: string;
  targetAudience?: string;
  writingStyle?: string;
  autoSuggest: boolean;
  preserveVoice: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    commandType?: string;
    affectedSections?: string[];
    confidence?: number;
  };
}

export interface AIResponse {
  message: string;
  suggestedContent?: string;
  hasSuggestion: boolean;
  commands?: Command[];
  metadata?: {
    confidence: number;
    reasoning?: string;
    alternativeSuggestions?: string[];
    affectedSections?: string[];
    estimatedImpact?: 'low' | 'medium' | 'high';
  };
  analysis?: {
    improvements: string[];
    warnings?: string[];
    opportunities?: string[];
  };
}

// Command Parser - Advanced natural language understanding
export class CommandParser {
  private static commandPatterns = {
    // Content modification commands
    add: /(?:add|insert|include|append)\s+(?:a\s+)?(?<type>line|paragraph|section|sentence|quote|list|heading)\s+(?:with\s+(?:the\s+)?text\s+|about\s+|on\s+|regarding\s+)?(?<content>.*)/i,
    remove: /(?:remove|delete|cut|eliminate)\s+(?:the\s+)?(?<target>last|first|all)?\s*(?<type>paragraph|sentence|section|line|word)s?\s*(?:about\s+|containing\s+|with\s+)?(?<content>.*)?/i,
    replace: /(?:replace|change|substitute|swap)\s+["']?(?<oldText>.+?)["']?\s+(?:with|to)\s+["']?(?<newText>.+?)["']?/i,
    move: /(?:move|relocate|reposition)\s+(?<source>.+?)\s+(?:to|before|after)\s+(?<destination>.+)/i,
    
    // Formatting commands
    format: /(?:make|format|convert|transform)\s+(?<target>.+?)\s+(?:as|to|into)\s+(?<format>bold|italic|heading|list|quote|code|link)/i,
    structure: /(?:add|create|generate)\s+(?<type>structure|headings|outline|sections|organization)/i,
    
    // Style commands
    tone: /(?:change|adjust|modify|make)\s+(?:the\s+)?tone\s+(?:to|more)\s+(?<tone>formal|casual|professional|academic|friendly|serious|playful)/i,
    simplify: /(?:simplify|clarify|make\s+clearer|improve\s+clarity|reduce\s+complexity)/i,
    enhance: /(?:enhance|improve|enrich|elaborate|expand)\s+(?:on\s+)?(?<topic>.*)?/i,
    
    // Analysis commands
    analyze: /(?:analyze|check|review|evaluate)\s+(?:for\s+)?(?<aspect>grammar|readability|seo|tone|structure|flow|consistency)?/i,
    summarize: /(?:summarize|create\s+summary|tldr|overview)\s*(?:in\s+)?(?<length>\d+)?\s*(?:words|sentences)?/i,
    
    // Compound commands
    compound: /(?<action1>.+?)\s+(?:and|then|also|plus)\s+(?<action2>.+)/i,
    conditional: /(?:if|when)\s+(?<condition>.+?)\s+(?:then|,)\s+(?<action>.+)/i,
    batch: /(?:do|perform|execute)\s+(?:the\s+)?following:\s*(?<actions>.+)/i
  };

  static parseCommand(input: string, context: EditContext): Command | null {
    const trimmedInput = input.trim();
    
    // Check for compound commands first
    if (this.commandPatterns.compound.test(trimmedInput)) {
      return this.parseCompoundCommand(trimmedInput, context);
    }
    
    // Check for conditional commands
    if (this.commandPatterns.conditional.test(trimmedInput)) {
      return this.parseConditionalCommand(trimmedInput, context);
    }
    
    // Check for batch commands
    if (this.commandPatterns.batch.test(trimmedInput)) {
      return this.parseBatchCommand(trimmedInput, context);
    }
    
    // Parse simple commands
    for (const [commandType, pattern] of Object.entries(this.commandPatterns)) {
      const match = trimmedInput.match(pattern);
      if (match && match.groups) {
        return {
          type: 'simple',
          action: commandType,
          parameters: { ...match.groups, context: this.extractContext(trimmedInput, context) }
        };
      }
    }
    
    // If no pattern matches, try to understand intent
    return this.inferCommand(trimmedInput, context);
  }

  private static parseCompoundCommand(input: string, context: EditContext): Command {
    const match = input.match(this.commandPatterns.compound);
    if (!match || !match.groups) {
      throw new Error('Invalid compound command');
    }

    const { action1, action2 } = match.groups;
    
    return {
      type: 'compound',
      action: 'compound',
      parameters: {},
      subCommands: [
        this.parseCommand(action1, context) || this.createDefaultCommand(action1),
        this.parseCommand(action2, context) || this.createDefaultCommand(action2)
      ]
    };
  }

  private static parseConditionalCommand(input: string, context: EditContext): Command {
    const match = input.match(this.commandPatterns.conditional);
    if (!match || !match.groups) {
      throw new Error('Invalid conditional command');
    }

    const { condition, action } = match.groups;
    
    return {
      type: 'conditional',
      action: 'conditional',
      parameters: {},
      condition: condition,
      subCommands: [
        this.parseCommand(action, context) || this.createDefaultCommand(action)
      ]
    };
  }

  private static parseBatchCommand(input: string, context: EditContext): Command {
    const match = input.match(this.commandPatterns.batch);
    if (!match || !match.groups) {
      throw new Error('Invalid batch command');
    }

    const { actions } = match.groups;
    const actionList = actions.split(/[;,]\s*/).filter(a => a.trim());
    
    return {
      type: 'batch',
      action: 'batch',
      parameters: {},
      subCommands: actionList.map(action => 
        this.parseCommand(action, context) || this.createDefaultCommand(action)
      )
    };
  }

  private static inferCommand(input: string, context: EditContext): Command | null {
    const lowerInput = input.toLowerCase();
    
    // Infer based on keywords and context
    if (lowerInput.includes('fix') || lowerInput.includes('correct')) {
      return {
        type: 'simple',
        action: 'fix',
        parameters: { 
          target: 'auto-detect',
          context: this.extractContext(input, context)
        }
      };
    }
    
    if (lowerInput.includes('continue') || lowerInput.includes('more')) {
      return {
        type: 'simple',
        action: 'continue',
        parameters: { 
          from: context.currentFocus || 'last-paragraph',
          context: this.extractContext(input, context)
        }
      };
    }
    
    // Default to enhance if unclear
    return {
      type: 'simple',
      action: 'enhance',
      parameters: { 
        aspect: 'general',
        context: this.extractContext(input, context)
      }
    };
  }

  private static createDefaultCommand(action: string): Command {
    return {
      type: 'simple',
      action: 'custom',
      parameters: { instruction: action }
    };
  }

  private static extractContext(input: string, editContext: EditContext): any {
    return {
      articleTone: editContext.article.tone,
      currentSection: editContext.currentFocus,
      userPreferences: editContext.userPreferences,
      recentTopics: editContext.article.topics.slice(0, 3)
    };
  }
}

// Content Analyzer - Advanced article analysis
export class ContentAnalyzer {
  static analyzeArticle(content: string): ArticleMetadata {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
    
    return {
      id: '', // Will be set by caller
      title: this.extractTitle(content),
      wordCount: words.length,
      paragraphCount: paragraphs.length,
      sentenceCount: sentences.length,
      readabilityScore: this.calculateReadabilityScore(content),
      tone: detectTone(content),
      topics: this.extractTopics(content),
      keywords: this.extractKeywords(content),
      lastModified: new Date(),
      language: this.detectLanguage(content),
      hasHeadings: /^#{1,6}\s+/m.test(content),
      hasList: /^[\*\-\+]\s+/m.test(content) || /^\d+\.\s+/m.test(content),
      hasQuotes: /"[^"]+"|'[^']+'|>[^<\n]+/m.test(content),
      sentiment: this.analyzeSentiment(content)
    };
  }

  private static extractTitle(content: string): string {
    // Try to find markdown heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) return headingMatch[1];
    
    // Otherwise use first line
    const firstLine = content.split('\n')[0];
    return firstLine.substring(0, 60) + (firstLine.length > 60 ? '...' : '');
  }

  private static calculateReadabilityScore(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);
    
    // Flesch Reading Ease Score
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const avgSyllablesPerWord = syllables / Math.max(words.length, 1);
    
    const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    return Math.max(0, Math.min(100, score));
  }

  private static countSyllables(word: string): number {
    word = word.toLowerCase();
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = 'aeiou'.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        count++;
      }
      previousWasVowel = isVowel;
    }
    
    if (word.endsWith('e')) count--;
    return Math.max(1, count);
  }

  private static extractTopics(content: string): string[] {
    // Extract potential topics from headings and repeated phrases
    const headings = content.match(/^#{1,6}\s+(.+)$/gm) || [];
    const topics = headings.map(h => h.replace(/^#+\s+/, ''));
    
    // Add frequently occurring noun phrases (simplified)
    const words = content.toLowerCase().split(/\s+/);
    const phrases = new Map<string, number>();
    
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (this.isValidPhrase(bigram)) {
        phrases.set(bigram, (phrases.get(bigram) || 0) + 1);
      }
    }
    
    // Add top phrases as topics
    const topPhrases = Array.from(phrases.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([phrase]) => phrase);
    
    return [...new Set([...topics, ...topPhrases])];
  }

  private static isValidPhrase(phrase: string): boolean {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = phrase.split(' ');
    return words.every(w => !stopWords.includes(w) && w.length > 2);
  }

  private static extractKeywords(content: string): string[] {
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'some', 'any', 'few', 'more', 'most', 'other', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'about', 'into', 'through', 'during', 'before', 'after']);
    
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word) && /^[a-z]+$/.test(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private static detectLanguage(content: string): string {
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'for'];
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'por', 'para'];
    const frenchWords = ['le', 'de', 'et', 'à', 'un', 'être', 'que', 'pour', 'dans', 'ce'];
    
    const words = content.toLowerCase().split(/\s+/);
    let englishCount = 0, spanishCount = 0, frenchCount = 0;
    
    words.forEach(word => {
      if (englishWords.includes(word)) englishCount++;
      if (spanishWords.includes(word)) spanishCount++;
      if (frenchWords.includes(word)) frenchCount++;
    });
    
    if (spanishCount > englishCount && spanishCount > frenchCount) return 'Spanish';
    if (frenchCount > englishCount && frenchCount > spanishCount) return 'French';
    return 'English';
  }

  private static analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' | 'mixed' {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'happy', 'joy', 'success', 'achieve', 'benefit', 'advantage', 'improve'];
    const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'hate', 'worst', 'fail', 'problem', 'issue', 'difficult', 'hard', 'negative', 'disadvantage', 'risk', 'danger'];
    
    const words = content.toLowerCase().split(/\s+/);
    let positiveCount = 0, negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    });
    
    const total = positiveCount + negativeCount;
    if (total === 0) return 'neutral';
    
    const positiveRatio = positiveCount / total;
    if (positiveRatio > 0.7) return 'positive';
    if (positiveRatio < 0.3) return 'negative';
    if (Math.abs(positiveCount - negativeCount) < 3) return 'mixed';
    
    return positiveCount > negativeCount ? 'positive' : 'negative';
  }
}

// Edit Suggestion Generator - Context-aware content suggestions
export class EditSuggestionGenerator {
  static generateSuggestion(
    command: Command,
    articleContent: string,
    metadata: ArticleMetadata,
    preferences: UserPreferences
  ): { content: string; explanation: string } {
    switch (command.action) {
      case 'add':
        return this.generateAddContent(command.parameters, articleContent, metadata, preferences);
      
      case 'remove':
        return this.generateRemoveContent(command.parameters, articleContent, metadata);
      
      case 'replace':
        return this.generateReplaceContent(command.parameters, articleContent, metadata);
      
      case 'tone':
        return this.adjustTone(command.parameters, articleContent, metadata, preferences);
      
      case 'simplify':
        return this.simplifyContent(articleContent, metadata);
      
      case 'enhance':
        return this.enhanceContent(command.parameters, articleContent, metadata, preferences);
      
      case 'structure':
        return this.improveStructure(articleContent, metadata);
      
      case 'fix':
        return this.fixIssues(articleContent, metadata);
      
      default:
        return this.handleCustomCommand(command, articleContent, metadata, preferences);
    }
  }

  private static generateAddContent(
    params: any,
    content: string,
    metadata: ArticleMetadata,
    preferences: UserPreferences
  ): { content: string; explanation: string } {
    const { type, content: userContent, context } = params;
    
    // If user provided specific text, use it
    if (userContent && userContent.trim()) {
      const isExactText = userContent.includes('with the text') || 
                         userContent.includes('with text');
      
      if (isExactText) {
        const text = userContent.replace(/with (?:the )?text /i, '').trim();
        return {
          content: content + '\n\n' + text,
          explanation: `Added the exact text you specified.`
        };
      }
    }
    
    // Generate contextual content
    let newContent = '';
    let explanation = '';
    
    switch (type) {
      case 'paragraph':
        newContent = this.generateParagraph(userContent, metadata, preferences);
        explanation = `Generated a new paragraph about "${userContent}" that matches your article's ${metadata.tone} tone.`;
        break;
      
      case 'section':
        newContent = this.generateSection(userContent, metadata, preferences);
        explanation = `Created a new section with heading and content about "${userContent}".`;
        break;
      
      case 'list':
        newContent = this.generateList(userContent, metadata);
        explanation = `Created a bullet point list about "${userContent}".`;
        break;
      
      case 'quote':
        newContent = this.generateQuote(userContent, metadata);
        explanation = `Added a relevant quote about "${userContent}".`;
        break;
      
      default:
        newContent = this.generateSentence(userContent, metadata, preferences);
        explanation = `Added a sentence about "${userContent}".`;
    }
    
    return {
      content: content + '\n\n' + newContent,
      explanation
    };
  }

  private static generateParagraph(
    topic: string,
    metadata: ArticleMetadata,
    preferences: UserPreferences
  ): string {
    const toneMap = {
      'formal': 'It is important to consider that',
      'casual': 'You know,',
      'professional': 'In this context,',
      'academic': 'Research indicates that',
      'creative': 'Imagine'
    };
    
    const starter = toneMap[metadata.tone] || 'Regarding';
    
    return `${starter} ${topic} represents a significant aspect of the discussion. This topic connects to the broader themes explored throughout this piece, offering additional perspective and depth. The implications are worth considering in detail, as they relate to both theoretical understanding and practical application.`;
  }

  private static generateSection(
    topic: string,
    metadata: ArticleMetadata,
    preferences: UserPreferences
  ): string {
    const heading = `## ${topic.charAt(0).toUpperCase() + topic.slice(1)}`;
    const paragraph = this.generateParagraph(topic, metadata, preferences);
    
    return `${heading}\n\n${paragraph}`;
  }

  private static generateList(topic: string, metadata: ArticleMetadata): string {
    return `Key points about ${topic}:\n\n- First important aspect to consider\n- Secondary consideration worth noting\n- Additional factor that impacts the outcome\n- Final element to keep in mind`;
  }

  private static generateQuote(topic: string, metadata: ArticleMetadata): string {
    return `> "The importance of ${topic} cannot be overstated in this context. It serves as a foundation for understanding the broader implications of our discussion."`;
  }

  private static generateSentence(
    topic: string,
    metadata: ArticleMetadata,
    preferences: UserPreferences
  ): string {
    const toneMap = {
      'formal': `It should be noted that ${topic} plays a crucial role in this context.`,
      'casual': `Here's the thing about ${topic} - it's actually pretty important.`,
      'professional': `${topic.charAt(0).toUpperCase() + topic.slice(1)} represents a key consideration for our analysis.`,
      'academic': `The significance of ${topic} within this framework warrants further examination.`,
      'creative': `Like a thread woven through fabric, ${topic} connects the various elements of our story.`
    };
    
    return toneMap[metadata.tone] || `${topic.charAt(0).toUpperCase() + topic.slice(1)} is an important aspect to consider.`;
  }

  private static generateRemoveContent(
    params: any,
    content: string,
    metadata: ArticleMetadata
  ): { content: string; explanation: string } {
    const { target, type, content: searchContent } = params;
    let newContent = content;
    let explanation = '';
    
    if (target === 'last') {
      const paragraphs = content.split('\n\n').filter(p => p.trim());
      if (paragraphs.length > 1) {
        paragraphs.pop();
        newContent = paragraphs.join('\n\n');
        explanation = 'Removed the last paragraph from your article.';
      }
    } else if (target === 'first') {
      const paragraphs = content.split('\n\n').filter(p => p.trim());
      if (paragraphs.length > 1) {
        paragraphs.shift();
        newContent = paragraphs.join('\n\n');
        explanation = 'Removed the first paragraph from your article.';
      }
    } else if (searchContent) {
      // Remove content containing specific text
      const paragraphs = content.split('\n\n').filter(p => p.trim());
      const filtered = paragraphs.filter(p => !p.toLowerCase().includes(searchContent.toLowerCase()));
      
      if (filtered.length < paragraphs.length) {
        newContent = filtered.join('\n\n');
        explanation = `Removed ${paragraphs.length - filtered.length} paragraph(s) containing "${searchContent}".`;
      }
    }
    
    return { content: newContent, explanation };
  }

  private static generateReplaceContent(
    params: any,
    content: string,
    metadata: ArticleMetadata
  ): { content: string; explanation: string } {
    const { oldText, newText } = params;
    
    if (content.includes(oldText)) {
      const newContent = content.replace(new RegExp(oldText, 'g'), newText);
      const count = (content.match(new RegExp(oldText, 'g')) || []).length;
      
      return {
        content: newContent,
        explanation: `Replaced ${count} occurrence(s) of "${oldText}" with "${newText}".`
      };
    }
    
    return {
      content: content,
      explanation: `Could not find "${oldText}" in your article.`
    };
  }

  private static adjustTone(
    params: any,
    content: string,
    metadata: ArticleMetadata,
    preferences: UserPreferences
  ): { content: string; explanation: string } {
    const targetTone = params.tone;
    let newContent = content;
    const changes: string[] = [];
    
    // Tone-specific replacements
    const toneAdjustments: Record<string, Record<string, string>> = {
      formal: {
        "don't": "do not",
        "won't": "will not",
        "can't": "cannot",
        "it's": "it is",
        "that's": "that is",
        "you're": "you are",
        "let's": "let us",
        "wasn't": "was not",
        "haven't": "have not",
        "shouldn't": "should not",
        " gonna ": " going to ",
        " wanna ": " want to ",
        " gotta ": " have to ",
        "okay": "acceptable",
        "yeah": "yes",
        "nope": "no"
      },
      casual: {
        "do not": "don't",
        "will not": "won't",
        "cannot": "can't",
        "it is": "it's",
        "that is": "that's",
        "you are": "you're",
        "let us": "let's",
        "was not": "wasn't",
        "have not": "haven't",
        "should not": "shouldn't"
      },
      professional: {
        "a lot": "numerous",
        "get": "obtain",
        "give": "provide",
        "help": "assist",
        "show": "demonstrate",
        "use": "utilize",
        "make": "create",
        "big": "significant",
        "small": "minor"
      }
    };
    
    // Apply tone adjustments
    const adjustments = toneAdjustments[targetTone] || {};
    for (const [original, replacement] of Object.entries(adjustments)) {
      if (newContent.includes(original)) {
        newContent = newContent.replace(new RegExp(original, 'gi'), replacement);
        changes.push(`"${original}" → "${replacement}"`);
      }
    }
    
    // Adjust sentence starters based on tone
    if (targetTone === 'formal') {
      newContent = newContent.replace(/^So,?\s+/gm, 'Therefore, ');
      newContent = newContent.replace(/^But,?\s+/gm, 'However, ');
      newContent = newContent.replace(/^And,?\s+/gm, 'Additionally, ');
    } else if (targetTone === 'casual') {
      newContent = newContent.replace(/^Therefore,?\s+/gm, 'So, ');
      newContent = newContent.replace(/^However,?\s+/gm, 'But, ');
      newContent = newContent.replace(/^Additionally,?\s+/gm, 'And, ');
    }
    
    const explanation = `Adjusted tone from ${metadata.tone} to ${targetTone}. Made ${changes.length} changes including: ${changes.slice(0, 3).join(', ')}${changes.length > 3 ? ', and more...' : ''}`;
    
    return { content: newContent, explanation };
  }

  private static simplifyContent(
    content: string,
    metadata: ArticleMetadata
  ): { content: string; explanation: string } {
    let newContent = content;
    const improvements: string[] = [];
    
    // Split long sentences
    const sentences = content.split(/([.!?]+)/).filter(s => s.trim());
    const simplifiedSentences: string[] = [];
    
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i];
      const punctuation = sentences[i + 1] || '.';
      const wordCount = sentence.split(/\s+/).length;
      
      if (wordCount > 20) {
        // Find conjunctions to split on
        const conjunctions = [', and', ', but', ', or', ', which', ', where', ', when'];
        let splitPoint = -1;
        
        for (const conj of conjunctions) {
          const index = sentence.indexOf(conj);
          if (index > sentence.length / 3 && index < sentence.length * 2 / 3) {
            splitPoint = index;
            break;
          }
        }
        
        if (splitPoint > 0) {
          const firstPart = sentence.substring(0, splitPoint);
          const secondPart = sentence.substring(splitPoint + 2);
          simplifiedSentences.push(firstPart + '.');
          simplifiedSentences.push(secondPart.charAt(0).toUpperCase() + secondPart.slice(1) + punctuation);
          improvements.push('Split a long sentence for clarity');
        } else {
          simplifiedSentences.push(sentence + punctuation);
        }
      } else {
        simplifiedSentences.push(sentence + punctuation);
      }
    }
    
    newContent = simplifiedSentences.join(' ').replace(/\s+([.!?])/g, '$1');
    
    // Replace complex words with simpler alternatives
    const simplifications: Record<string, string> = {
      'utilize': 'use',
      'implement': 'use',
      'facilitate': 'help',
      'demonstrate': 'show',
      'subsequent': 'next',
      'prior to': 'before',
      'in order to': 'to',
      'due to the fact that': 'because',
      'at this point in time': 'now',
      'in the event that': 'if'
    };
    
    for (const [complex, simple] of Object.entries(simplifications)) {
      if (newContent.toLowerCase().includes(complex)) {
        newContent = newContent.replace(new RegExp(complex, 'gi'), simple);
        improvements.push(`Simplified "${complex}" to "${simple}"`);
      }
    }
    
    const explanation = `Improved readability by: ${improvements.join(', ')}. New readability score: ~${Math.round(metadata.readabilityScore + 10)}/100.`;
    
    return { content: newContent, explanation };
  }

  private static enhanceContent(
    params: any,
    content: string,
    metadata: ArticleMetadata,
    preferences: UserPreferences
  ): { content: string; explanation: string } {
    const { topic } = params;
    let newContent = content;
    const enhancements: string[] = [];
    
    // Add transitional phrases between paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    const enhancedParagraphs: string[] = [];
    
    for (let i = 0; i < paragraphs.length; i++) {
      enhancedParagraphs.push(paragraphs[i]);
      
      // Add transitions between paragraphs
      if (i < paragraphs.length - 1) {
        const transitions = [
          'Furthermore, ',
          'In addition, ',
          'Moreover, ',
          'Building on this, ',
          'It\'s also worth noting that '
        ];
        
        if (!paragraphs[i + 1].match(/^(Furthermore|In addition|Moreover|Building|It's also)/)) {
          const transition = transitions[i % transitions.length];
          paragraphs[i + 1] = transition + paragraphs[i + 1].charAt(0).toLowerCase() + paragraphs[i + 1].slice(1);
          enhancements.push('Added transitional phrases');
        }
      }
    }
    
    // Add examples or elaboration if specified
    if (topic) {
      const elaboration = `\n\nTo elaborate on ${topic}, consider the following example: [This is where specific examples related to ${topic} would enhance reader understanding. Real-world applications and concrete scenarios make abstract concepts more accessible.]`;
      enhancedParagraphs.push(elaboration);
      enhancements.push(`Added elaboration on "${topic}"`);
    }
    
    newContent = enhancedParagraphs.join('\n\n');
    
    const explanation = `Enhanced your article with: ${enhancements.join(', ')}. This improves flow and depth.`;
    
    return { content: newContent, explanation };
  }

  private static improveStructure(
    content: string,
    metadata: ArticleMetadata
  ): { content: string; explanation: string } {
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    const sections: string[] = [];
    const improvements: string[] = [];
    
    // Add main title if missing
    if (!metadata.hasHeadings) {
      sections.push(`# ${metadata.title || 'Article Title'}\n`);
      improvements.push('Added main title');
    }
    
    // Group paragraphs into logical sections
    const sectionSize = Math.ceil(paragraphs.length / 3);
    const sectionTitles = ['Introduction', 'Main Discussion', 'Conclusion'];
    
    for (let i = 0; i < 3 && i * sectionSize < paragraphs.length; i++) {
      if (paragraphs.length > 3) {
        sections.push(`\n## ${sectionTitles[i]}\n`);
        improvements.push(`Added "${sectionTitles[i]}" section`);
      }
      
      const sectionParagraphs = paragraphs.slice(i * sectionSize, (i + 1) * sectionSize);
      sections.push(...sectionParagraphs);
    }
    
    // Add a summary box at the beginning if content is long
    if (metadata.wordCount > 500) {
      const keyPoints = metadata.keywords.slice(0, 5).map(kw => `• ${kw.charAt(0).toUpperCase() + kw.slice(1)}`).join('\n');
      const summaryBox = `> **Key Points:**\n> ${keyPoints}\n\n`;
      sections.unshift(summaryBox);
      improvements.push('Added key points summary');
    }
    
    const explanation = `Improved structure with: ${improvements.join(', ')}. This makes your article easier to navigate.`;
    
    return { content: sections.join('\n\n'), explanation };
  }

  private static fixIssues(
    content: string,
    metadata: ArticleMetadata
  ): { content: string; explanation: string } {
    let newContent = content;
    const fixes: string[] = [];
    
    // Fix spacing issues
    newContent = newContent.replace(/\s{2,}/g, ' ');
    newContent = newContent.replace(/\s+([,.!?;:])/g, '$1');
    newContent = newContent.replace(/([,.!?;:])([A-Za-z])/g, '$1 $2');
    fixes.push('Fixed spacing issues');
    
    // Fix capitalization
    newContent = newContent.replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
    newContent = newContent.replace(/^([a-z])/gm, (match, p1) => p1.toUpperCase());
    fixes.push('Fixed capitalization');
    
    // Fix common typos
    const typoFixes: Record<string, string> = {
      '\\bteh\\b': 'the',
      '\\btaht\\b': 'that',
      '\\brecieve\\b': 'receive',
      '\\boccured?\\b': 'occurred',
      '\\bseperate\\b': 'separate',
      '\\bdefinate\\b': 'definite',
      '\\bneccessary\\b': 'necessary',
      '\\baccommodate\\b': 'accommodate',
      '\\bachieve\\b': 'achieve',
      '\\bbelieve\\b': 'believe'
    };
    
    for (const [typo, correct] of Object.entries(typoFixes)) {
      const regex = new RegExp(typo, 'gi');
      if (regex.test(newContent)) {
        newContent = newContent.replace(regex, correct);
        fixes.push(`Fixed typo: "${typo}" → "${correct}"`);
      }
    }
    
    // Fix passive voice (simple detection)
    const passiveRegex = /\b(was|were|been|being|is|are|am)\s+\w+ed\b/gi;
    const passiveMatches = newContent.match(passiveRegex) || [];
    
    if (passiveMatches.length > 0) {
      fixes.push(`Detected ${passiveMatches.length} instances of passive voice - consider revising for active voice`);
    }
    
    const explanation = `Fixed ${fixes.length} issues: ${fixes.slice(0, 3).join(', ')}${fixes.length > 3 ? ', and more...' : ''}`;
    
    return { content: newContent, explanation };
  }

  private static handleCustomCommand(
    command: Command,
    content: string,
    metadata: ArticleMetadata,
    preferences: UserPreferences
  ): { content: string; explanation: string } {
    // Handle compound commands
    if (command.type === 'compound' && command.subCommands) {
      let currentContent = content;
      const explanations: string[] = [];
      
      for (const subCommand of command.subCommands) {
        const result = this.generateSuggestion(subCommand, currentContent, metadata, preferences);
        currentContent = result.content;
        explanations.push(result.explanation);
      }
      
      return {
        content: currentContent,
        explanation: `Executed multiple commands: ${explanations.join(' Then, ')}`
      };
    }
    
    // Handle conditional commands
    if (command.type === 'conditional' && command.condition && command.subCommands) {
      // Evaluate condition (simplified)
      const conditionMet = this.evaluateCondition(command.condition, content, metadata);
      
      if (conditionMet && command.subCommands[0]) {
        const result = this.generateSuggestion(command.subCommands[0], content, metadata, preferences);
        return {
          content: result.content,
          explanation: `Condition "${command.condition}" was met. ${result.explanation}`
        };
      }
      
      return {
        content: content,
        explanation: `Condition "${command.condition}" was not met. No changes made.`
      };
    }
    
    // Default response for unhandled commands
    return {
      content: content,
      explanation: 'I understood your request but need more specific instructions to proceed.'
    };
  }

  private static evaluateCondition(condition: string, content: string, metadata: ArticleMetadata): boolean {
    const lowerCondition = condition.toLowerCase();
    
    // Simple condition evaluations
    if (lowerCondition.includes('too long')) {
      return metadata.wordCount > 1000;
    }
    if (lowerCondition.includes('too short')) {
      return metadata.wordCount < 300;
    }
    if (lowerCondition.includes('has headings')) {
      return metadata.hasHeadings;
    }
    if (lowerCondition.includes('formal tone')) {
      return metadata.tone === 'formal';
    }
    if (lowerCondition.includes('contains')) {
      const searchTerm = condition.match(/contains ["'](.+?)["']/i)?.[1];
      return searchTerm ? content.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    }
    
    return false;
  }
}

// Main AI Assistant class that orchestrates everything
export class AIAssistant {
  private editContext: EditContext;
  private currentArticleContent: string;
  
  constructor(
    articleContent: string,
    conversationHistory: Message[] = [],
    userPreferences: UserPreferences = { autoSuggest: true, preserveVoice: true }
  ) {
    this.currentArticleContent = articleContent;
    const metadata = ContentAnalyzer.analyzeArticle(articleContent);
    this.editContext = {
      article: metadata,
      conversationHistory,
      userPreferences
    };
  }
  
  async processRequest(userMessage: string): Promise<AIResponse> {
    // Parse the command
    const command = CommandParser.parseCommand(userMessage, this.editContext);
    
    if (!command) {
      return {
        message: 'I couldn\'t understand your request. Could you please rephrase it?',
        hasSuggestion: false,
        metadata: { confidence: 0.3 }
      };
    }
    
    // Get the current article content
    const currentContent = this.currentArticleContent;
    
    // Generate suggestion based on command
    const suggestion = EditSuggestionGenerator.generateSuggestion(
      command,
      currentContent,
      this.editContext.article,
      this.editContext.userPreferences
    );
    
    // Prepare response
    const response: AIResponse = {
      message: suggestion.explanation,
      suggestedContent: suggestion.content,
      hasSuggestion: suggestion.content !== currentContent,
      commands: [command],
      metadata: {
        confidence: this.calculateConfidence(command, suggestion),
        reasoning: this.explainReasoning(command, suggestion),
        estimatedImpact: this.estimateImpact(currentContent, suggestion.content)
      },
      analysis: {
        improvements: this.analyzeImprovements(currentContent, suggestion.content),
        warnings: this.detectWarnings(suggestion.content),
        opportunities: this.findOpportunities(suggestion.content, this.editContext.article)
      }
    };
    
    // Update conversation history
    this.editContext.conversationHistory.push({
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });
    
    this.editContext.conversationHistory.push({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.message,
      timestamp: new Date(),
      metadata: {
        commandType: command.action,
        confidence: response.metadata?.confidence
      }
    });
    
    return response;
  }
  
  private calculateConfidence(command: Command, suggestion: any): number {
    // Calculate confidence based on command clarity and suggestion quality
    let confidence = 0.7; // Base confidence
    
    // Increase confidence for simple, clear commands
    if (command.type === 'simple') confidence += 0.1;
    
    // Increase confidence if we have clear parameters
    if (command.parameters.content) confidence += 0.1;
    
    // Decrease confidence for complex or ambiguous commands
    if (command.type === 'compound') confidence -= 0.1;
    if (command.action === 'custom') confidence -= 0.2;
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  private explainReasoning(command: Command, suggestion: any): string {
    const reasons = [];
    
    reasons.push(`Interpreted your request as a "${command.action}" command.`);
    
    if (command.parameters.context) {
      reasons.push(`Considering the article's ${command.parameters.context.articleTone} tone.`);
    }
    
    if (this.editContext.userPreferences.preserveVoice) {
      reasons.push('Preserving your writing voice while making improvements.');
    }
    
    return reasons.join(' ');
  }
  
  private estimateImpact(original: string, suggested: string): 'low' | 'medium' | 'high' {
    const originalWords = original.split(/\s+/).length;
    const suggestedWords = suggested.split(/\s+/).length;
    const wordDiff = Math.abs(originalWords - suggestedWords);
    const percentChange = wordDiff / Math.max(originalWords, 1);
    
    if (percentChange < 0.1) return 'low';
    if (percentChange < 0.3) return 'medium';
    return 'high';
  }
  
  private analyzeImprovements(original: string, suggested: string): string[] {
    const improvements = [];
    
    // Check readability improvement
    const originalScore = ContentAnalyzer.analyzeArticle(original).readabilityScore;
    const suggestedScore = ContentAnalyzer.analyzeArticle(suggested).readabilityScore;
    
    if (suggestedScore > originalScore) {
      improvements.push(`Improved readability score from ${originalScore.toFixed(1)} to ${suggestedScore.toFixed(1)}`);
    }
    
    // Check structure improvements
    if (suggested.includes('##') && !original.includes('##')) {
      improvements.push('Added section headings for better organization');
    }
    
    // Check for list additions
    if ((suggested.match(/^[\*\-\+]\s+/gm) || []).length > (original.match(/^[\*\-\+]\s+/gm) || []).length) {
      improvements.push('Added bullet points for clarity');
    }
    
    return improvements;
  }
  
  private detectWarnings(content: string): string[] {
    const warnings = [];
    
    // Check for overly long sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    const longSentences = sentences.filter(s => s.split(/\s+/).length > 30);
    
    if (longSentences.length > 0) {
      warnings.push(`${longSentences.length} sentence(s) may be too long for easy reading`);
    }
    
    // Check for passive voice overuse
    const passiveMatches = content.match(/\b(was|were|been|being|is|are|am)\s+\w+ed\b/gi) || [];
    if (passiveMatches.length > 5) {
      warnings.push('Multiple instances of passive voice detected - consider using active voice');
    }
    
    // Check for repetitive word usage
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      if (word.length > 4) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    const overusedWords = Array.from(wordFreq.entries())
      .filter(([word, count]) => count > 5 && !['their', 'there', 'these', 'those', 'through'].includes(word))
      .map(([word]) => word);
    
    if (overusedWords.length > 0) {
      warnings.push(`Consider varying word choice for: ${overusedWords.slice(0, 3).join(', ')}`);
    }
    
    return warnings;
  }
  
  private findOpportunities(content: string, metadata: ArticleMetadata): string[] {
    const opportunities = [];
    
    // SEO opportunities
    if (!metadata.hasHeadings && metadata.wordCount > 300) {
      opportunities.push('Add headings to improve SEO and readability');
    }
    
    // Content depth opportunities
    if (metadata.wordCount < 500) {
      opportunities.push('Consider expanding content for better search visibility');
    }
    
    // Engagement opportunities
    if (!content.includes('?')) {
      opportunities.push('Add questions to engage readers');
    }
    
    if (!metadata.hasList && metadata.paragraphCount > 3) {
      opportunities.push('Use bullet points or numbered lists to break up text');
    }
    
    // Call-to-action opportunity
    if (!content.toLowerCase().includes('learn more') && 
        !content.toLowerCase().includes('contact') && 
        !content.toLowerCase().includes('subscribe')) {
      opportunities.push('Consider adding a call-to-action');
    }
    
    return opportunities;
  }
  
  updateArticleContent(newContent: string): void {
    this.currentArticleContent = newContent;
    this.editContext.article = ContentAnalyzer.analyzeArticle(newContent);
  }
  
  setUserPreferences(preferences: Partial<UserPreferences>): void {
    this.editContext.userPreferences = {
      ...this.editContext.userPreferences,
      ...preferences
    };
  }
  
  getConversationHistory(): Message[] {
    return this.editContext.conversationHistory;
  }
  
  getArticleMetadata(): ArticleMetadata {
    return this.editContext.article;
  }
}

