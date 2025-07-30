// Text Analysis Utilities for xFunnel AI Assistant
// Provides advanced text analysis capabilities for better content understanding

export interface TextMetrics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordLength: number;
  averageSentenceLength: number;
  complexWordCount: number;
  readabilityScores: {
    flesch: number;
    fleschKincaid: number;
    gunningFog: number;
    smog: number;
    automatedReadability: number;
  };
}

export interface SentimentAnalysis {
  overall: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number; // -1 to 1
  emotions: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
    trust: number;
  };
}

export interface StyleAnalysis {
  tone: 'formal' | 'casual' | 'professional' | 'academic' | 'creative';
  voice: 'active' | 'passive' | 'mixed';
  tense: 'present' | 'past' | 'future' | 'mixed';
  perspective: 'first' | 'second' | 'third' | 'mixed';
}

// Syllable counting for readability calculations
export function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length === 0) return 0;
  
  // Special cases
  if (word.length <= 3) return 1;
  
  // Count vowel groups
  let count = 0;
  let previousWasVowel = false;
  const vowels = 'aeiouy';
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }
  
  // Adjust for silent e
  if (word.endsWith('e') && count > 1) {
    count--;
  }
  
  // Adjust for special endings
  if (word.endsWith('le') && word.length > 2 && !vowels.includes(word[word.length - 3])) {
    count++;
  }
  
  // Words ending in 'y' but not as vowel sound
  if (word.endsWith('y') && !vowels.includes(word[word.length - 2])) {
    count++;
  }
  
  return Math.max(1, count);
}

// Calculate various text metrics
export function calculateTextMetrics(text: string): TextMetrics {
  // Clean and prepare text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Basic counts
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  // Word analysis
  const wordLengths = words.map(w => w.replace(/[^a-zA-Z]/g, '').length);
  const avgWordLength = wordLengths.reduce((a, b) => a + b, 0) / words.length || 0;
  
  // Complex words (3+ syllables)
  const complexWords = words.filter(word => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    return countSyllables(cleanWord) >= 3;
  });
  
  // Syllable count
  const totalSyllables = words.reduce((count, word) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    return count + countSyllables(cleanWord);
  }, 0);
  
  // Calculate readability scores
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  const avgSyllablesPerWord = totalSyllables / Math.max(words.length, 1);
  
  // Flesch Reading Ease
  const flesch = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  
  // Flesch-Kincaid Grade Level
  const fleschKincaid = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  
  // Gunning Fog Index
  const complexWordPercentage = (complexWords.length / words.length) * 100;
  const gunningFog = 0.4 * (avgWordsPerSentence + complexWordPercentage);
  
  // SMOG Index (Simplified)
  const smog = 1.043 * Math.sqrt(complexWords.length * (30 / sentences.length)) + 3.1291;
  
  // Automated Readability Index
  const avgCharsPerWord = words.join('').length / words.length;
  const automatedReadability = 4.71 * avgCharsPerWord + 0.5 * avgWordsPerSentence - 21.43;
  
  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    averageWordLength: avgWordLength,
    averageSentenceLength: avgWordsPerSentence,
    complexWordCount: complexWords.length,
    readabilityScores: {
      flesch: Math.max(0, Math.min(100, flesch)),
      fleschKincaid: Math.max(0, fleschKincaid),
      gunningFog: Math.max(0, gunningFog),
      smog: Math.max(0, smog),
      automatedReadability: Math.max(0, automatedReadability)
    }
  };
}

// Sentiment Analysis
export function analyzeSentiment(text: string): SentimentAnalysis {
  // Sentiment word lists
  const sentimentWords = {
    positive: {
      strong: ['excellent', 'amazing', 'wonderful', 'fantastic', 'brilliant', 'outstanding', 'exceptional', 'perfect', 'superb', 'magnificent'],
      moderate: ['good', 'great', 'nice', 'helpful', 'useful', 'effective', 'beneficial', 'valuable', 'positive', 'successful'],
      mild: ['okay', 'fine', 'decent', 'adequate', 'satisfactory', 'reasonable', 'fair', 'acceptable']
    },
    negative: {
      strong: ['terrible', 'horrible', 'awful', 'dreadful', 'appalling', 'disastrous', 'catastrophic', 'abysmal', 'atrocious'],
      moderate: ['bad', 'poor', 'negative', 'problematic', 'difficult', 'challenging', 'unfortunate', 'disappointing'],
      mild: ['lacking', 'limited', 'slight', 'minor', 'small', 'trivial']
    }
  };
  
  // Emotion indicators
  const emotionWords = {
    joy: ['happy', 'joy', 'delight', 'pleased', 'cheerful', 'excited', 'enthusiastic', 'elated', 'content', 'satisfied'],
    anger: ['angry', 'furious', 'mad', 'annoyed', 'irritated', 'frustrated', 'outraged', 'hostile', 'aggressive'],
    fear: ['afraid', 'scared', 'fearful', 'anxious', 'worried', 'nervous', 'terrified', 'panic', 'dread', 'apprehensive'],
    sadness: ['sad', 'unhappy', 'depressed', 'miserable', 'sorrowful', 'melancholy', 'gloomy', 'dejected', 'disappointed'],
    surprise: ['surprised', 'amazed', 'astonished', 'shocked', 'stunned', 'unexpected', 'sudden', 'startled'],
    trust: ['trust', 'reliable', 'dependable', 'honest', 'sincere', 'genuine', 'authentic', 'credible', 'faithful']
  };
  
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  // Calculate sentiment scores
  let positiveScore = 0;
  let negativeScore = 0;
  
  // Check positive words
  Object.entries(sentimentWords.positive).forEach(([strength, wordList]) => {
    const multiplier = strength === 'strong' ? 3 : strength === 'moderate' ? 2 : 1;
    wordList.forEach(word => {
      const count = (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
      positiveScore += count * multiplier;
    });
  });
  
  // Check negative words
  Object.entries(sentimentWords.negative).forEach(([strength, wordList]) => {
    const multiplier = strength === 'strong' ? 3 : strength === 'moderate' ? 2 : 1;
    wordList.forEach(word => {
      const count = (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
      negativeScore += count * multiplier;
    });
  });
  
  // Check for negations that might flip sentiment
  const negationPattern = /\b(not|no|never|neither|none|nothing|nowhere|hardly|scarcely|barely)\s+\w+/g;
  const negations = lowerText.match(negationPattern) || [];
  
  // Adjust scores based on negations
  negations.forEach(negation => {
    // Simple heuristic: negations often flip sentiment
    const temp = positiveScore;
    positiveScore = positiveScore * 0.3 + negativeScore * 0.3;
    negativeScore = negativeScore * 0.3 + temp * 0.3;
  });
  
  // Calculate emotion scores
  const emotions: any = {};
  Object.entries(emotionWords).forEach(([emotion, words]) => {
    let score = 0;
    words.forEach(word => {
      score += (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    });
    emotions[emotion] = Math.min(1, score / 10); // Normalize to 0-1
  });
  
  // Determine overall sentiment
  const totalScore = positiveScore + negativeScore;
  const sentimentScore = totalScore > 0 ? (positiveScore - negativeScore) / totalScore : 0;
  
  let overall: 'positive' | 'negative' | 'neutral' | 'mixed';
  if (Math.abs(sentimentScore) < 0.1) {
    overall = 'neutral';
  } else if (positiveScore > 0 && negativeScore > 0 && Math.abs(positiveScore - negativeScore) < totalScore * 0.3) {
    overall = 'mixed';
  } else if (sentimentScore > 0) {
    overall = 'positive';
  } else {
    overall = 'negative';
  }
  
  return {
    overall,
    score: sentimentScore,
    emotions
  };
}

// Style Analysis
export function analyzeStyle(text: string): StyleAnalysis {
  // Detect tone
  const tone = detectTone(text);
  
  // Detect voice (active vs passive)
  const passiveIndicators = /\b(was|were|been|being|is|are|am)\s+\w+ed\b/gi;
  const passiveCount = (text.match(passiveIndicators) || []).length;
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const passiveRatio = passiveCount / Math.max(sentenceCount, 1);
  
  let voice: 'active' | 'passive' | 'mixed';
  if (passiveRatio < 0.2) voice = 'active';
  else if (passiveRatio > 0.5) voice = 'passive';
  else voice = 'mixed';
  
  // Detect tense
  const tenseIndicators = {
    present: /\b(is|are|am|have|has|do|does|can|will)\b/gi,
    past: /\b(was|were|had|did|could|would)\b/gi,
    future: /\b(will|shall|going to|gonna)\b/gi
  };
  
  const tenseCounts = {
    present: (text.match(tenseIndicators.present) || []).length,
    past: (text.match(tenseIndicators.past) || []).length,
    future: (text.match(tenseIndicators.future) || []).length
  };
  
  const maxTense = Math.max(...Object.values(tenseCounts));
  let tense: 'present' | 'past' | 'future' | 'mixed';
  
  if (maxTense === 0) {
    tense = 'present'; // Default
  } else {
    const dominantTense = Object.entries(tenseCounts).find(([_, count]) => count === maxTense)?.[0] as any;
    const secondHighest = Object.values(tenseCounts).sort((a, b) => b - a)[1];
    
    if (maxTense > secondHighest * 2) {
      tense = dominantTense;
    } else {
      tense = 'mixed';
    }
  }
  
  // Detect perspective
  const perspectiveIndicators = {
    first: /\b(I|me|my|mine|myself|we|us|our|ours|ourselves)\b/gi,
    second: /\b(you|your|yours|yourself|yourselves)\b/gi,
    third: /\b(he|she|it|they|him|her|his|hers|its|their|them|theirs|himself|herself|itself|themselves)\b/gi
  };
  
  const perspectiveCounts = {
    first: (text.match(perspectiveIndicators.first) || []).length,
    second: (text.match(perspectiveIndicators.second) || []).length,
    third: (text.match(perspectiveIndicators.third) || []).length
  };
  
  const maxPerspective = Math.max(...Object.values(perspectiveCounts));
  let perspective: 'first' | 'second' | 'third' | 'mixed';
  
  if (maxPerspective === 0) {
    perspective = 'third'; // Default for no pronouns
  } else {
    const dominantPerspective = Object.entries(perspectiveCounts).find(([_, count]) => count === maxPerspective)?.[0] as any;
    const secondHighest = Object.values(perspectiveCounts).sort((a, b) => b - a)[1];
    
    if (maxPerspective > secondHighest * 2) {
      perspective = dominantPerspective;
    } else {
      perspective = 'mixed';
    }
  }
  
  return {
    tone,
    voice,
    tense,
    perspective
  };
}

// Helper function for tone detection (exported for use in ai-assistant.ts)
export function detectTone(text: string): 'formal' | 'casual' | 'professional' | 'academic' | 'creative' {
  const indicators = {
    formal: {
      words: ['furthermore', 'moreover', 'consequently', 'therefore', 'thus', 'hence', 'whereas', 'albeit', 'notwithstanding', 'herein', 'thereof', 'whereby'],
      weight: 3
    },
    casual: {
      words: ['gonna', 'wanna', 'gotta', 'yeah', 'yep', 'nope', 'cool', 'awesome', 'stuff', 'things', 'really', 'pretty', 'kind of', 'sort of', 'like'],
      weight: 2
    },
    academic: {
      words: ['hypothesis', 'methodology', 'analysis', 'theoretical', 'empirical', 'framework', 'paradigm', 'literature', 'research', 'study', 'findings', 'evidence', 'data', 'conclusion'],
      weight: 3
    },
    professional: {
      words: ['objective', 'strategic', 'implement', 'leverage', 'optimize', 'enhance', 'facilitate', 'coordinate', 'collaborate', 'stakeholder', 'deliverable', 'milestone'],
      weight: 2
    },
    creative: {
      words: ['imagine', 'dream', 'wonder', 'magical', 'journey', 'story', 'adventure', 'discover', 'explore', 'inspire', 'vision', 'passion', 'vibrant', 'colorful'],
      weight: 2
    }
  };
  
  const lowerText = text.toLowerCase();
  const scores: Record<string, number> = {};
  
  // Calculate scores for each tone
  Object.entries(indicators).forEach(([tone, { words, weight }]) => {
    let score = 0;
    words.forEach(word => {
      const count = (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
      score += count * weight;
    });
    scores[tone] = score;
  });
  
  // Additional checks
  
  // Contractions indicate casual tone
  const contractionCount = (text.match(/\w+'\w+/g) || []).length;
  scores.casual += contractionCount * 2;
  
  // Citations indicate academic tone
  if (/\(\d{4}\)|\[\d+\]|et al\.|ibid\.|op\.\s*cit\./.test(text)) {
    scores.academic += 10;
  }
  
  // Formal sentence structures
  if (/\bIn conclusion\b|\bTo summarize\b|\bIt is worth noting\b/i.test(text)) {
    scores.formal += 5;
  }
  
  // Questions in casual tone
  const questionCount = (text.match(/\?/g) || []).length;
  if (questionCount > 2) {
    scores.casual += 3;
  }
  
  // Exclamations in creative/casual tone
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    scores.creative += 2;
    scores.casual += 2;
  }
  
  // Get the tone with highest score
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'professional'; // Default
  
  const dominantTone = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as any;
  return dominantTone || 'professional';
}

// Content Quality Analysis
export interface QualityMetrics {
  clarity: number; // 0-100
  coherence: number; // 0-100
  engagement: number; // 0-100
  originality: number; // 0-100
  overall: number; // 0-100
}

export function analyzeContentQuality(text: string): QualityMetrics {
  const metrics = calculateTextMetrics(text);
  const sentiment = analyzeSentiment(text);
  const style = analyzeStyle(text);
  
  // Clarity score based on readability
  const clarity = metrics.readabilityScores.flesch;
  
  // Coherence based on consistent tense and perspective
  let coherence = 70; // Base score
  if (style.tense === 'mixed') coherence -= 15;
  if (style.perspective === 'mixed') coherence -= 10;
  if (style.voice === 'mixed') coherence -= 5;
  
  // Adjust for paragraph structure
  const avgParagraphLength = metrics.wordCount / metrics.paragraphCount;
  if (avgParagraphLength > 200) coherence -= 10;
  else if (avgParagraphLength < 50) coherence -= 5;
  
  // Engagement based on various factors
  let engagement = 60; // Base score
  
  // Questions increase engagement
  const questionCount = (text.match(/\?/g) || []).length;
  engagement += Math.min(questionCount * 3, 15);
  
  // Emotional content increases engagement
  const emotionSum = Object.values(sentiment.emotions).reduce((a, b) => a + b, 0);
  engagement += Math.min(emotionSum * 10, 20);
  
  // Lists and structure increase engagement
  if (/^[\*\-\+]\s+/m.test(text)) engagement += 5;
  if (/^#{1,6}\s+/m.test(text)) engagement += 5;
  
  // Originality (simplified - based on uncommon words and phrases)
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const lexicalDiversity = uniqueWords.size / words.length;
  const originality = Math.min(lexicalDiversity * 150, 85);
  
  // Calculate overall score
  const overall = (clarity + coherence + engagement + originality) / 4;
  
  return {
    clarity: Math.round(clarity),
    coherence: Math.round(coherence),
    engagement: Math.round(engagement),
    originality: Math.round(originality),
    overall: Math.round(overall)
  };
}

// SEO Analysis
export interface SEOMetrics {
  titleOptimization: number; // 0-100
  keywordDensity: Map<string, number>;
  metaDescriptionQuality: number; // 0-100
  headingStructure: number; // 0-100
  contentLength: 'too-short' | 'optimal' | 'too-long';
  readabilityForSEO: number; // 0-100
}

export function analyzeSEO(text: string, targetKeywords: string[] = []): SEOMetrics {
  const lines = text.split('\n');
  const firstLine = lines[0] || '';
  
  // Title optimization
  let titleOptimization = 0;
  if (firstLine.length > 0) {
    if (firstLine.startsWith('#')) titleOptimization += 20;
    if (firstLine.length >= 30 && firstLine.length <= 60) titleOptimization += 40;
    else if (firstLine.length < 30) titleOptimization += 20;
    
    // Check for keywords in title
    targetKeywords.forEach(keyword => {
      if (firstLine.toLowerCase().includes(keyword.toLowerCase())) {
        titleOptimization += 40 / targetKeywords.length;
      }
    });
  }
  
  // Keyword density
  const wordCount = text.split(/\s+/).length;
  const keywordDensity = new Map<string, number>();
  
  targetKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = text.match(regex) || [];
    const density = (matches.length / wordCount) * 100;
    keywordDensity.set(keyword, density);
  });
  
  // Meta description quality (assuming it's in first paragraph)
  const firstParagraph = text.split('\n\n')[0] || '';
  let metaDescriptionQuality = 0;
  
  if (firstParagraph.length >= 120 && firstParagraph.length <= 160) {
    metaDescriptionQuality = 80;
  } else if (firstParagraph.length >= 100 && firstParagraph.length <= 180) {
    metaDescriptionQuality = 60;
  } else {
    metaDescriptionQuality = 30;
  }
  
  // Check for keywords in meta description
  targetKeywords.forEach(keyword => {
    if (firstParagraph.toLowerCase().includes(keyword.toLowerCase())) {
      metaDescriptionQuality += 20 / targetKeywords.length;
    }
  });
  
  // Heading structure
  const headings = text.match(/^#{1,6}\s+.+$/gm) || [];
  let headingStructure = 0;
  
  if (headings.length > 0) {
    headingStructure += 30;
    
    // Check for proper hierarchy
    let lastLevel = 0;
    let properHierarchy = true;
    
    headings.forEach(heading => {
      const level = heading.match(/^#+/)?.[0].length || 0;
      if (level > lastLevel + 1) {
        properHierarchy = false;
      }
      lastLevel = level;
    });
    
    if (properHierarchy) headingStructure += 40;
    
    // Keywords in headings
    targetKeywords.forEach(keyword => {
      const keywordInHeadings = headings.some(h => 
        h.toLowerCase().includes(keyword.toLowerCase())
      );
      if (keywordInHeadings) {
        headingStructure += 30 / targetKeywords.length;
      }
    });
  }
  
  // Content length
  let contentLength: 'too-short' | 'optimal' | 'too-long';
  if (wordCount < 300) contentLength = 'too-short';
  else if (wordCount > 2500) contentLength = 'too-long';
  else contentLength = 'optimal';
  
  // Readability for SEO
  const metrics = calculateTextMetrics(text);
  const readabilityForSEO = metrics.readabilityScores.flesch;
  
  return {
    titleOptimization: Math.min(100, titleOptimization),
    keywordDensity,
    metaDescriptionQuality: Math.min(100, metaDescriptionQuality),
    headingStructure: Math.min(100, headingStructure),
    contentLength,
    readabilityForSEO
  };
}

// Export all analysis functions in a convenient namespace
export const TextAnalysis = {
  calculateMetrics: calculateTextMetrics,
  analyzeSentiment,
  analyzeStyle,
  analyzeQuality: analyzeContentQuality,
  analyzeSEO,
  countSyllables,
  detectTone
};