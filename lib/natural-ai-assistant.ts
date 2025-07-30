// Natural Language AI Assistant for xFunnel
// A more intuitive and conversational approach to text editing

import { ArticleMetadata, Message, AIResponse } from './ai-assistant';
import { TextAnalysis, calculateTextMetrics, detectTone } from './text-analysis';

export interface NaturalCommand {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  originalText: string;
}

export class NaturalLanguageProcessor {
  // Intent patterns for more natural language understanding
  private static intentPatterns = [
    // Tone adjustments
    { pattern: /make\s+(this|it)\s+(sound\s+)?more\s+(\w+)/i, intent: 'adjust_tone' },
    { pattern: /(?:can you |please )?make\s+(this|it)\s+(\w+)/i, intent: 'adjust_tone' },
    { pattern: /(?:sounds?|seems?)\s+too\s+(\w+)/i, intent: 'adjust_tone_opposite' },
    { pattern: /(?:more|less)\s+(\w+)\s+(?:please|tone)/i, intent: 'adjust_tone' },
    
    // Content additions
    { pattern: /add\s+(?:a\s+)?(?:paragraph|sentence|line)\s+about\s+(.*)/i, intent: 'add_content' },
    { pattern: /(?:can you |please )?(?:write|add)\s+(?:something\s+)?about\s+(.*)/i, intent: 'add_content' },
    { pattern: /include\s+(?:information\s+)?(?:about|on)\s+(.*)/i, intent: 'add_content' },
    { pattern: /(?:needs?|should have)\s+(?:a\s+)?(?:section|paragraph)\s+(?:about|on)\s+(.*)/i, intent: 'add_content' },
    
    // Content removal
    { pattern: /(?:remove|delete)\s+(?:the\s+)?(?:part|section|paragraph)\s+about\s+(.*)/i, intent: 'remove_content' },
    { pattern: /(?:too much|don't need)\s+(?:about|on)\s+(.*)/i, intent: 'remove_content' },
    { pattern: /take out\s+(?:the\s+)?(.+)/i, intent: 'remove_content' },
    
    // Improvements
    { pattern: /(?:improve|enhance|make better)\s+(?:the\s+)?(.+)/i, intent: 'improve' },
    { pattern: /(?:this|it)\s+(?:could be|needs to be)\s+(?:better|improved)/i, intent: 'improve' },
    { pattern: /(?:fix|correct)\s+(?:the\s+)?(.+)/i, intent: 'fix' },
    
    // Clarity and simplification
    { pattern: /(?:simplify|make\s+(?:it\s+)?(?:simpler|clearer|easier))/i, intent: 'simplify' },
    { pattern: /(?:too\s+)?(?:complex|complicated|confusing)/i, intent: 'simplify' },
    { pattern: /(?:clarify|explain better)\s+(?:the\s+)?(.+)?/i, intent: 'clarify' },
    
    // Structure
    { pattern: /(?:add|needs?)\s+(?:better\s+)?(?:structure|organization|headings)/i, intent: 'structure' },
    { pattern: /(?:reorganize|restructure)\s+(?:this|it)/i, intent: 'structure' },
    { pattern: /break\s+(?:this|it)\s+(?:up|down|into sections)/i, intent: 'structure' },
    
    // Examples and details
    { pattern: /(?:add|give|provide)\s+(?:an?\s+)?example/i, intent: 'add_example' },
    { pattern: /(?:needs?|add)\s+more\s+(?:details?|information)/i, intent: 'add_details' },
    { pattern: /(?:expand|elaborate)\s+(?:on\s+)?(?:this|that|the\s+)?(.+)?/i, intent: 'expand' },
    
    // Formatting
    { pattern: /(?:make|format)\s+(?:this|it)\s+(?:as\s+)?(?:a\s+)?(\w+)/i, intent: 'format' },
    { pattern: /(?:convert|change)\s+to\s+(?:a\s+)?(\w+)/i, intent: 'format' },
    
    // General improvements
    { pattern: /(?:how\s+)?(?:can|could)\s+(?:I|we)\s+(?:make\s+)?(?:this|it)\s+better/i, intent: 'suggest_improvements' },
    { pattern: /(?:what|any)\s+suggestions?/i, intent: 'suggest_improvements' },
    { pattern: /help\s+(?:me\s+)?(?:with|improve)\s+this/i, intent: 'suggest_improvements' },
  ];

  static parseNaturalLanguage(input: string, context: ArticleMetadata): NaturalCommand {
    const normalizedInput = input.toLowerCase().trim();
    
    // Try to match against intent patterns
    for (const { pattern, intent } of this.intentPatterns) {
      const match = normalizedInput.match(pattern);
      if (match) {
        return {
          intent,
          entities: this.extractEntities(match, intent, input),
          confidence: 0.8,
          originalText: input
        };
      }
    }
    
    // If no pattern matches, try to infer intent from keywords
    const inferredIntent = this.inferIntent(normalizedInput);
    return {
      intent: inferredIntent.intent,
      entities: inferredIntent.entities,
      confidence: inferredIntent.confidence,
      originalText: input
    };
  }

  private static extractEntities(match: RegExpMatchArray, intent: string, originalInput: string): Record<string, any> {
    const entities: Record<string, any> = {};
    
    switch (intent) {
      case 'adjust_tone':
      case 'adjust_tone_opposite':
        entities.targetTone = match[3] || match[2] || match[1];
        if (intent === 'adjust_tone_opposite') {
          entities.opposite = true;
        }
        break;
        
      case 'add_content':
      case 'remove_content':
      case 'improve':
      case 'expand':
        entities.topic = match[1] || '';
        break;
        
      case 'format':
        entities.formatType = match[1];
        break;
    }
    
    // Extract quoted text if present
    const quotedMatch = originalInput.match(/"([^"]+)"/);
    if (quotedMatch) {
      entities.quotedText = quotedMatch[1];
    }
    
    return entities;
  }

  private static inferIntent(input: string): { intent: string; entities: Record<string, any>; confidence: number } {
    const keywords = {
      add: ['add', 'include', 'insert', 'write', 'needs', 'should have'],
      remove: ['remove', 'delete', 'cut', 'eliminate', 'too much'],
      improve: ['improve', 'better', 'enhance', 'fix', 'correct'],
      simplify: ['simplify', 'simpler', 'clearer', 'confusing', 'complex'],
      tone: ['formal', 'casual', 'friendly', 'professional', 'tone'],
      structure: ['structure', 'organize', 'sections', 'headings', 'break up'],
      expand: ['expand', 'elaborate', 'more detail', 'explain'],
      format: ['bold', 'italic', 'list', 'bullet', 'heading'],
    };
    
    let bestMatch = { intent: 'general_help', score: 0, entities: {} };
    
    for (const [intent, words] of Object.entries(keywords)) {
      const score = words.filter(word => input.includes(word)).length;
      if (score > bestMatch.score) {
        bestMatch = { intent, score, entities: {} };
      }
    }
    
    return {
      intent: bestMatch.intent,
      entities: bestMatch.entities,
      confidence: bestMatch.score > 0 ? 0.6 : 0.3
    };
  }
}

export class NaturalAIAssistant {
  private articleContent: string;
  private metadata: ArticleMetadata;
  private conversationHistory: Message[];

  constructor(articleContent: string, metadata: ArticleMetadata, history: Message[] = []) {
    this.articleContent = articleContent;
    this.metadata = metadata;
    this.conversationHistory = history;
  }

  async processMessage(userMessage: string): Promise<AIResponse> {
    console.log('[NaturalAIAssistant] Processing message:', userMessage);
    
    // Parse the natural language input
    const command = NaturalLanguageProcessor.parseNaturalLanguage(userMessage, this.metadata);
    console.log('[NaturalAIAssistant] Parsed command:', {
      intent: command.intent,
      confidence: command.confidence,
      entities: command.entities
    });
    
    // Process based on intent
    switch (command.intent) {
      case 'adjust_tone':
        return this.adjustTone(command.entities);
        
      case 'adjust_tone_opposite':
        return this.adjustToneOpposite(command.entities);
        
      case 'add_content':
        return this.addContent(command.entities);
        
      case 'remove_content':
        return this.removeContent(command.entities);
        
      case 'improve':
        return this.improveContent(command.entities);
        
      case 'simplify':
        return this.simplifyContent();
        
      case 'structure':
        return this.improveStructure();
        
      case 'add_example':
        return this.addExample(command.entities);
        
      case 'add_details':
        return this.addDetails(command.entities);
        
      case 'expand':
        return this.expandContent(command.entities);
        
      case 'format':
        return this.formatContent(command.entities);
        
      case 'suggest_improvements':
        return this.suggestImprovements();
        
      default:
        return this.handleGeneralRequest(userMessage);
    }
  }

  private adjustTone(entities: Record<string, any>): AIResponse {
    const targetTone = entities.targetTone;
    const toneMap: Record<string, string> = {
      'friendly': 'casual',
      'professional': 'professional',
      'formal': 'formal',
      'casual': 'casual',
      'academic': 'academic',
      'serious': 'formal',
      'playful': 'creative'
    };
    
    const mappedTone = toneMap[targetTone] || 'professional';
    
    // Analyze current content
    const sentences = this.articleContent.split(/[.!?]+/).filter(s => s.trim());
    const adjustedSentences = sentences.map(sentence => {
      return this.adjustSentenceTone(sentence, mappedTone);
    });
    
    const suggestedContent = adjustedSentences.join('. ') + '.';
    
    return {
      message: `I've adjusted the tone to be more ${targetTone}. The content now has a ${mappedTone} feel while maintaining the original meaning.`,
      suggestedContent,
      hasSuggestion: true,
      metadata: {
        confidence: 0.85,
        reasoning: `Changed from ${this.metadata.tone} to ${mappedTone} tone`,
        estimatedImpact: 'medium'
      }
    };
  }

  private adjustSentenceTone(sentence: string, targetTone: string): string {
    // Simple tone adjustment logic - in production, this would use more sophisticated NLP
    const trimmed = sentence.trim();
    if (!trimmed) return '';
    
    switch (targetTone) {
      case 'formal':
        return trimmed
          .replace(/\bi\b/gi, 'I')
          .replace(/\byou\b/g, 'one')
          .replace(/\bcan't\b/g, 'cannot')
          .replace(/\bwon't\b/g, 'will not')
          .replace(/\bit's\b/g, 'it is');
          
      case 'casual':
        return trimmed
          .replace(/\bcannot\b/g, "can't")
          .replace(/\bwill not\b/g, "won't")
          .replace(/\bit is\b/g, "it's");
          
      case 'professional':
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        
      default:
        return trimmed;
    }
  }

  private adjustToneOpposite(entities: Record<string, any>): AIResponse {
    const currentTone = entities.targetTone;
    const oppositeMap: Record<string, string> = {
      'formal': 'casual',
      'casual': 'formal',
      'complex': 'simple',
      'simple': 'detailed',
      'serious': 'friendly',
      'friendly': 'serious'
    };
    
    const targetTone = oppositeMap[currentTone] || 'professional';
    return this.adjustTone({ targetTone });
  }

  private addContent(entities: Record<string, any>): AIResponse {
    const topic = entities.topic || entities.quotedText || '';
    
    if (!topic) {
      return {
        message: "I'd be happy to add content! What topic would you like me to write about?",
        hasSuggestion: false,
        metadata: {
          confidence: 1,
          reasoning: 'Need more information about the topic'
        }
      };
    }
    
    // Generate content based on the topic and article context
    const newParagraph = this.generateParagraph(topic);
    const suggestedContent = this.articleContent + '\n\n' + newParagraph;
    
    return {
      message: `I've added a paragraph about ${topic}. Feel free to ask me to adjust it if needed!`,
      suggestedContent,
      hasSuggestion: true,
      metadata: {
        confidence: 0.8,
        reasoning: `Generated new content about ${topic}`,
        estimatedImpact: 'medium'
      }
    };
  }

  private generateParagraph(topic: string): string {
    // In production, this would use AI to generate contextually relevant content
    // For now, we'll create a template-based paragraph
    const templates = [
      `Regarding ${topic}, it's important to consider several key aspects. `,
      `When it comes to ${topic}, there are multiple factors at play. `,
      `${topic.charAt(0).toUpperCase() + topic.slice(1)} represents a significant area of focus. `
    ];
    
    const intro = templates[Math.floor(Math.random() * templates.length)];
    const body = `This involves understanding the fundamental principles and their practical applications. `;
    const conclusion = `By examining these elements carefully, we can develop a more comprehensive understanding of the subject.`;
    
    return intro + body + conclusion;
  }

  private removeContent(entities: Record<string, any>): AIResponse {
    const topic = entities.topic || '';
    
    if (!topic) {
      return {
        message: "What specific content would you like me to remove?",
        hasSuggestion: false,
        metadata: {
          confidence: 1,
          reasoning: 'Need clarification on what to remove'
        }
      };
    }
    
    // Find and remove content related to the topic
    const paragraphs = this.articleContent.split('\n\n');
    const filteredParagraphs = paragraphs.filter(para => 
      !para.toLowerCase().includes(topic.toLowerCase())
    );
    
    if (filteredParagraphs.length === paragraphs.length) {
      return {
        message: `I couldn't find any content specifically about "${topic}" to remove.`,
        hasSuggestion: false,
        metadata: {
          confidence: 0.9,
          reasoning: 'No matching content found'
        }
      };
    }
    
    const suggestedContent = filteredParagraphs.join('\n\n');
    
    return {
      message: `I've removed the content about ${topic}.`,
      suggestedContent,
      hasSuggestion: true,
      metadata: {
        confidence: 0.85,
        reasoning: `Removed ${paragraphs.length - filteredParagraphs.length} paragraph(s) about ${topic}`,
        estimatedImpact: 'high'
      }
    };
  }

  private improveContent(entities: Record<string, any>): AIResponse {
    const topic = entities.topic || 'the content';
    
    // Analyze current content quality
    const analysis = calculateTextMetrics(this.articleContent);
    const improvements = [];
    
    if (analysis.readabilityScores.flesch < 60) {
      improvements.push('simplifying complex sentences');
    }
    if (analysis.averageSentenceLength > 20) {
      improvements.push('breaking up long sentences');
    }
    if (!this.metadata.hasHeadings) {
      improvements.push('adding clear section headings');
    }
    
    return {
      message: `I can improve ${topic} by ${improvements.join(', ')}. Would you like me to proceed with these improvements?`,
      hasSuggestion: false,
      metadata: {
        confidence: 0.9,
        reasoning: 'Identified areas for improvement'
      },
      analysis: {
        improvements: improvements,
        opportunities: ['Better structure', 'Clearer transitions', 'More engaging introduction']
      }
    };
  }

  private simplifyContent(): AIResponse {
    const sentences = this.articleContent.split(/[.!?]+/).filter(s => s.trim());
    const simplifiedSentences = sentences.map(sentence => {
      // Split long sentences
      if (sentence.split(' ').length > 20) {
        return this.splitLongSentence(sentence);
      }
      return sentence.trim();
    });
    
    const suggestedContent = simplifiedSentences.join('. ') + '.';
    
    return {
      message: "I've simplified the content by breaking up long sentences and using clearer language.",
      suggestedContent,
      hasSuggestion: true,
      metadata: {
        confidence: 0.8,
        reasoning: 'Simplified complex sentences for better readability',
        estimatedImpact: 'medium'
      }
    };
  }

  private splitLongSentence(sentence: string): string {
    // Simple logic to split at conjunctions
    const parts = sentence.split(/,\s*(?:and|but|or)\s*/);
    if (parts.length > 1) {
      return parts.map(part => part.trim()).join('. ');
    }
    return sentence;
  }

  private improveStructure(): AIResponse {
    const paragraphs = this.articleContent.split('\n\n');
    const structured = [];
    
    // Add introduction heading if needed
    if (paragraphs.length > 0 && !paragraphs[0].startsWith('#')) {
      structured.push('## Introduction\n');
    }
    
    // Process paragraphs and add section headings
    paragraphs.forEach((para, index) => {
      if (index > 0 && index % 3 === 0) {
        structured.push(`\n## Section ${Math.floor(index / 3) + 1}\n`);
      }
      structured.push(para);
    });
    
    // Add conclusion if needed
    if (paragraphs.length > 3) {
      structured.push('\n## Conclusion\n');
      structured.push('In summary, the key points discussed above provide a comprehensive overview of the topic.');
    }
    
    const suggestedContent = structured.join('\n');
    
    return {
      message: "I've added structure with clear headings and sections to improve readability.",
      suggestedContent,
      hasSuggestion: true,
      metadata: {
        confidence: 0.75,
        reasoning: 'Added headings and organized content into sections',
        estimatedImpact: 'high'
      }
    };
  }

  private addExample(entities: Record<string, any>): AIResponse {
    const topic = entities.topic || 'this concept';
    
    const example = `For example, consider ${topic} in practice: [specific example here]. This illustrates how the concept applies in real-world scenarios.`;
    
    const suggestedContent = this.articleContent + '\n\n' + example;
    
    return {
      message: `I've added an example to illustrate ${topic}. You can customize the specific details.`,
      suggestedContent,
      hasSuggestion: true,
      metadata: {
        confidence: 0.7,
        reasoning: 'Added example for better understanding',
        estimatedImpact: 'low'
      }
    };
  }

  private addDetails(entities: Record<string, any>): AIResponse {
    const topic = entities.topic || '';
    
    return {
      message: "I can add more details. Which specific aspect would you like me to elaborate on?",
      hasSuggestion: false,
      metadata: {
        confidence: 0.9,
        reasoning: 'Need clarification on which details to add'
      },
      analysis: {
        improvements: ['Add statistics', 'Include examples', 'Provide context', 'Explain implications']
      }
    };
  }

  private expandContent(entities: Record<string, any>): AIResponse {
    const topic = entities.topic || 'this section';
    
    const expansion = `\n\nTo further elaborate on ${topic}, we should consider additional perspectives. This includes examining the broader implications and potential applications. Furthermore, understanding the underlying principles helps create a more complete picture.`;
    
    const suggestedContent = this.articleContent + expansion;
    
    return {
      message: `I've expanded on ${topic} with additional context and perspectives.`,
      suggestedContent,
      hasSuggestion: true,
      metadata: {
        confidence: 0.75,
        reasoning: 'Added elaboration and context',
        estimatedImpact: 'medium'
      }
    };
  }

  private formatContent(entities: Record<string, any>): AIResponse {
    const formatType = entities.formatType?.toLowerCase() || '';
    
    switch (formatType) {
      case 'list':
      case 'bullet':
        return this.formatAsList();
      case 'heading':
        return this.formatAsHeading();
      default:
        return {
          message: "What format would you like? I can create lists, headings, quotes, or other formats.",
          hasSuggestion: false,
          metadata: {
            confidence: 0.9,
            reasoning: 'Need format specification'
          }
        };
    }
  }

  private formatAsList(): AIResponse {
    const sentences = this.articleContent.split(/[.!?]+/).filter(s => s.trim());
    const listItems = sentences.map(s => `- ${s.trim()}`).join('\n');
    
    const suggestedContent = listItems;
    
    return {
      message: "I've converted the content into a bullet list format.",
      suggestedContent,
      hasSuggestion: true,
      metadata: {
        confidence: 0.9,
        reasoning: 'Formatted as bullet list',
        estimatedImpact: 'low'
      }
    };
  }

  private formatAsHeading(): AIResponse {
    const firstLine = this.articleContent.split('\n')[0];
    const suggestedContent = `# ${firstLine}\n\n${this.articleContent}`;
    
    return {
      message: "I've formatted the first line as a heading.",
      suggestedContent,
      hasSuggestion: true,
      metadata: {
        confidence: 0.9,
        reasoning: 'Added heading format',
        estimatedImpact: 'low'
      }
    };
  }

  private suggestImprovements(): AIResponse {
    const analysis = calculateTextMetrics(this.articleContent);
    const suggestions = [];
    
    if (analysis.readabilityScores.flesch < 60) {
      suggestions.push("Simplify complex sentences for better readability");
    }
    if (!this.metadata.hasHeadings) {
      suggestions.push("Add section headings to improve structure");
    }
    if (this.metadata.wordCount < 300) {
      suggestions.push("Expand on key points with more detail");
    }
    if (analysis.averageSentenceLength > 25) {
      suggestions.push("Break up long sentences");
    }
    
    return {
      message: "Here are my suggestions to improve your content:",
      hasSuggestion: false,
      analysis: {
        improvements: suggestions,
        opportunities: [
          "Add examples to illustrate key points",
          "Include a strong conclusion",
          "Use transition phrases between paragraphs"
        ]
      },
      metadata: {
        confidence: 0.9,
        reasoning: 'Comprehensive content analysis'
      }
    };
  }

  private handleGeneralRequest(message: string): AIResponse {
    return {
      message: `I understand you want help with: "${message}". Could you be more specific? For example:\n\n- "Make this more formal"\n- "Add a paragraph about X"\n- "Simplify this section"\n- "Help me improve the introduction"`,
      hasSuggestion: false,
      metadata: {
        confidence: 0.5,
        reasoning: 'Need more specific instructions'
      }
    };
  }
}