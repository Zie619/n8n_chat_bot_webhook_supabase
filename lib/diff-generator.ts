export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
}

export class DiffGenerator {
  generate(original: string, modified: string): DiffResult {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    const result: DiffLine[] = [];
    let addedCount = 0;
    let removedCount = 0;
    let unchangedCount = 0;
    
    // Simple line-by-line diff (can be improved with proper diff algorithm)
    const maxLength = Math.max(originalLines.length, modifiedLines.length);
    
    for (let i = 0; i < maxLength; i++) {
      const origLine = originalLines[i];
      const modLine = modifiedLines[i];
      
      if (origLine === modLine) {
        result.push({
          type: 'unchanged',
          content: origLine || '',
          lineNumber: i + 1
        });
        unchangedCount++;
      } else if (origLine === undefined) {
        result.push({
          type: 'added',
          content: modLine,
          lineNumber: i + 1
        });
        addedCount++;
      } else if (modLine === undefined) {
        result.push({
          type: 'removed',
          content: origLine,
          lineNumber: i + 1
        });
        removedCount++;
      } else {
        // Both exist but are different
        result.push({
          type: 'removed',
          content: origLine,
          lineNumber: i + 1
        });
        result.push({
          type: 'added',
          content: modLine,
          lineNumber: i + 1
        });
        removedCount++;
        addedCount++;
      }
    }
    
    return {
      lines: result,
      addedCount,
      removedCount,
      unchangedCount
    };
  }
  
  // Generate a simple word-level diff for inline display
  generateInline(original: string, modified: string): string {
    const originalWords = original.split(/\s+/);
    const modifiedWords = modified.split(/\s+/);
    
    let result = '';
    let i = 0, j = 0;
    
    while (i < originalWords.length || j < modifiedWords.length) {
      if (i >= originalWords.length) {
        // Remaining words are additions
        result += `<span class="diff-added">${modifiedWords.slice(j).join(' ')}</span>`;
        break;
      } else if (j >= modifiedWords.length) {
        // Remaining words are deletions
        result += `<span class="diff-removed">${originalWords.slice(i).join(' ')}</span>`;
        break;
      } else if (originalWords[i] === modifiedWords[j]) {
        // Words match
        result += originalWords[i] + ' ';
        i++;
        j++;
      } else {
        // Words differ - simple approach: show removal then addition
        result += `<span class="diff-removed">${originalWords[i]}</span> `;
        result += `<span class="diff-added">${modifiedWords[j]}</span> `;
        i++;
        j++;
      }
    }
    
    return result.trim();
  }
}