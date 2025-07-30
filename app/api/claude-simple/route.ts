import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface CommandResult {
  modifiedContent: string;
  action: string;
}

function generateParagraph(topic: string): string {
  // Simple paragraph generation for common topics
  const templates: { [key: string]: string } = {
    'introduction': 'This article provides a comprehensive overview of the topic at hand. We will explore various aspects and provide detailed insights to help you understand the subject matter thoroughly.',
    'conclusion': 'In conclusion, we have covered the essential points of this topic. The information presented here should provide you with a solid foundation for further exploration and understanding.',
    'summary': 'To summarize the key points discussed: First, we examined the fundamental concepts. Second, we analyzed the practical applications. Finally, we considered the future implications and potential developments.',
  };
  
  // Check if we have a template for this topic
  const lowerTopic = topic.toLowerCase();
  for (const [key, value] of Object.entries(templates)) {
    if (lowerTopic.includes(key)) {
      return value;
    }
  }
  
  // Generic paragraph for other topics
  return `${topic.charAt(0).toUpperCase() + topic.slice(1)} is an important aspect to consider. This section explores the various elements and provides insights into how they relate to the broader context of our discussion.`;
}

function parseAndExecuteCommand(command: string, content: string): CommandResult {
  const lowerCommand = command.toLowerCase();
  
  // Add content commands
  if (lowerCommand.includes('add') && (lowerCommand.includes('line') || lowerCommand.includes('paragraph'))) {
    const match = command.match(/(?:about|with text|saying)\s+["']?(.+?)["']?$/i);
    const topic = match ? match[1] : command.split(/about|with text|saying/i)[1]?.trim();
    
    if (topic) {
      let newContent: string;
      if (lowerCommand.includes('line')) {
        // For "add a line", just add the text as requested
        newContent = topic;
      } else {
        // For paragraphs, generate or use the topic
        newContent = generateParagraph(topic);
      }
      
      return {
        modifiedContent: content + (content.endsWith('\n') ? '' : '\n\n') + newContent,
        action: 'added'
      };
    }
  }
  
  // Remove content commands
  if (lowerCommand.includes('remove') || lowerCommand.includes('delete')) {
    const match = command.match(/(?:paragraph about|line about|section about)\s+(.+?)(?:\s+from|$)/i);
    const topic = match ? match[1] : command.split('about')[1]?.trim();
    
    if (topic) {
      // Simple removal - find and remove paragraphs/lines containing the topic
      const lines = content.split('\n');
      const filtered = lines.filter(line => !line.toLowerCase().includes(topic.toLowerCase()));
      return {
        modifiedContent: filtered.join('\n'),
        action: 'removed'
      };
    }
  }
  
  // Replace content commands
  if (lowerCommand.includes('change') || lowerCommand.includes('replace')) {
    const match = command.match(/(?:change|replace)\s+["']?(.+?)["']?\s+(?:to|with)\s+["']?(.+?)["']?$/i);
    if (match) {
      const [, oldText, newText] = match;
      return {
        modifiedContent: content.replace(new RegExp(oldText, 'gi'), newText),
        action: 'replaced'
      };
    }
  }
  
  // Tone adjustment commands
  if (lowerCommand.includes('make') && (lowerCommand.includes('formal') || lowerCommand.includes('professional'))) {
    let modified = content
      .replace(/\bcan't\b/gi, 'cannot')
      .replace(/\bwon't\b/gi, 'will not')
      .replace(/\bdon't\b/gi, 'do not')
      .replace(/\bdidn't\b/gi, 'did not')
      .replace(/\bisn't\b/gi, 'is not')
      .replace(/\baren't\b/gi, 'are not')
      .replace(/\bwasn't\b/gi, 'was not')
      .replace(/\bweren't\b/gi, 'were not')
      .replace(/\bhasn't\b/gi, 'has not')
      .replace(/\bhaven't\b/gi, 'have not')
      .replace(/\bhadn't\b/gi, 'had not')
      .replace(/\bI'm\b/gi, 'I am')
      .replace(/\byou're\b/gi, 'you are')
      .replace(/\bhe's\b/gi, 'he is')
      .replace(/\bshe's\b/gi, 'she is')
      .replace(/\bit's\b/gi, 'it is')
      .replace(/\bwe're\b/gi, 'we are')
      .replace(/\bthey're\b/gi, 'they are')
      .replace(/\bthat's\b/gi, 'that is')
      .replace(/\bwhat's\b/gi, 'what is')
      .replace(/\bhere's\b/gi, 'here is')
      .replace(/\bthere's\b/gi, 'there is')
      .replace(/\b(Hi|Hey|Hello)\b/gi, 'Greetings');
    return {
      modifiedContent: modified,
      action: 'formalized'
    };
  }
  
  if (lowerCommand.includes('make') && lowerCommand.includes('casual')) {
    let modified = content
      .replace(/\bcannot\b/gi, "can't")
      .replace(/\bwill not\b/gi, "won't")
      .replace(/\bdo not\b/gi, "don't")
      .replace(/\bdid not\b/gi, "didn't")
      .replace(/\bis not\b/gi, "isn't")
      .replace(/\bare not\b/gi, "aren't")
      .replace(/\bwas not\b/gi, "wasn't")
      .replace(/\bwere not\b/gi, "weren't")
      .replace(/\bhas not\b/gi, "hasn't")
      .replace(/\bhave not\b/gi, "haven't")
      .replace(/\bhad not\b/gi, "hadn't")
      .replace(/\bI am\b/gi, "I'm")
      .replace(/\byou are\b/gi, "you're")
      .replace(/\bhe is\b/gi, "he's")
      .replace(/\bshe is\b/gi, "she's")
      .replace(/\bit is\b/gi, "it's")
      .replace(/\bwe are\b/gi, "we're")
      .replace(/\bthey are\b/gi, "they're")
      .replace(/\bthat is\b/gi, "that's")
      .replace(/\bwhat is\b/gi, "what's")
      .replace(/\bhere is\b/gi, "here's")
      .replace(/\bthere is\b/gi, "there's")
      .replace(/\bGreetings\b/gi, 'Hi');
    return {
      modifiedContent: modified,
      action: 'casualized'
    };
  }
  
  // If no simple command matched, return unchanged
  return {
    modifiedContent: content,
    action: 'none'
  };
}

async function processWithClaude(command: string, content: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `You are a direct text editor. Execute the following command on the given content without any explanations or questions. Just return the modified content.

Command: ${command}

Content:
${content}

Return only the modified content, nothing else.`
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const authPayload = verifyToken(token);
    if (!authPayload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { command, content } = await req.json();

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }
    
    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'Content must be a string' }, { status: 400 });
    }

    // First try simple command parsing
    const simpleResult = parseAndExecuteCommand(command, content);
    
    let finalContent: string;
    let executionMethod: string;
    
    if (simpleResult.action !== 'none') {
      // Simple command was executed
      finalContent = simpleResult.modifiedContent;
      executionMethod = 'simple';
    } else if (ANTHROPIC_API_KEY) {
      // Fall back to Claude for complex commands
      try {
        finalContent = await processWithClaude(command, content);
        executionMethod = 'claude';
      } catch (error) {
        console.error('Claude API error:', error);
        // Return a helpful error message
        return NextResponse.json({
          error: 'Could not process complex command. Try simpler commands like "add a line about X" or "make it more formal".',
          apiError: error instanceof Error ? error.message : 'Unknown error',
          supportedCommands: [
            'add a line about [topic]',
            'add a paragraph about [topic]',
            'remove the paragraph about [topic]',
            'change [old text] to [new text]',
            'make it more formal',
            'make it more casual'
          ]
        }, { status: 500 });
      }
    } else {
      // No Claude API key, can only do simple commands
      return NextResponse.json({
        error: 'This command requires AI processing but no API key is configured.',
        supportedCommands: [
          'add a line about [topic]',
          'add a paragraph about [topic]',
          'remove the paragraph about [topic]',
          'change [old text] to [new text]',
          'make it more formal',
          'make it more casual'
        ]
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      modifiedContent: finalContent,
      executionMethod,
    });

  } catch (error) {
    console.error('Simple Claude API error:', error);
    return NextResponse.json(
      { error: 'Failed to process command' },
      { status: 500 }
    );
  }
}