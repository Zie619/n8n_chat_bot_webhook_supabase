/**
 * Markdown formatting utilities for AI-generated content
 */

export const MARKDOWN_FORMATTING_INSTRUCTIONS = `
When creating or editing content, always use proper markdown formatting:

## Headings
- # Main Title (H1)
- ## Section Heading (H2)
- ### Subsection Heading (H3)
- #### Minor Heading (H4)

## Lists
Bullet points:
- Use - or * for unordered lists
- Each item on a new line
- Add a space after the bullet

Numbered lists:
1. Use numbers followed by a period
2. Each item on a new line
3. Add a space after the number

## Emphasis
- **Bold text** using double asterisks
- *Italic text* using single asterisks
- ***Bold and italic*** using triple asterisks

## Other Elements
- > Blockquotes with greater-than symbol
- \`inline code\` with backticks
- \`\`\`language
  code blocks
  \`\`\`
- --- for horizontal rules
- [Link text](URL) for links
`;

/**
 * Validates and fixes common markdown formatting issues
 */
export function validateAndFixMarkdown(content: string): string {
  // Fix headings - ensure space after #
  let fixedContent = content.replace(/^(#{1,6})([^ #\n])/gm, '$1 $2');
  
  // Fix bullet points - ensure space after - or *
  fixedContent = fixedContent.replace(/^([-*])([^ \n])/gm, '$1 $2');
  
  // Fix numbered lists - ensure space after number and period
  fixedContent = fixedContent.replace(/^(\d+\.)([^ \n])/gm, '$1 $2');
  
  // Fix blockquotes - ensure space after >
  fixedContent = fixedContent.replace(/^(>)([^ \n])/gm, '$1 $2');
  
  // Replace bullet symbols with markdown bullets
  fixedContent = fixedContent.replace(/^[•·▪▫◦‣⁃]/gm, '-');
  
  // Ensure code blocks are properly closed
  const codeBlockRegex = /```[\s\S]*?(?:```|$)/g;
  fixedContent = fixedContent.replace(codeBlockRegex, (match) => {
    if (!match.endsWith('```')) {
      return match + '\n```';
    }
    return match;
  });
  
  return fixedContent;
}

/**
 * Converts common text patterns to proper markdown
 */
export function enhanceWithMarkdown(content: string): string {
  // Convert lines that look like headings (all caps or ending with colon)
  let enhanced = content.replace(/^([A-Z][A-Z\s]+)$/gm, (match) => {
    return `## ${match.charAt(0) + match.slice(1).toLowerCase()}`;
  });
  
  // Convert lines ending with colon to headings
  enhanced = enhanced.replace(/^(.+):$/gm, '### $1');
  
  // Convert lines starting with numbers to ordered lists
  enhanced = enhanced.replace(/^(\d+)\s+(.+)$/gm, '$1. $2');
  
  // Convert lines starting with dash-like characters to bullet points
  enhanced = enhanced.replace(/^[-–—]\s*(.+)$/gm, '- $1');
  
  return enhanced;
}

/**
 * Adds markdown formatting instructions to a prompt
 */
export function addMarkdownInstructions(basePrompt: string): string {
  return `${basePrompt}\n\n${MARKDOWN_FORMATTING_INSTRUCTIONS}`;
}