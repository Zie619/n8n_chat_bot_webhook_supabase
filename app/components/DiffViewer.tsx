import React from 'react';
import * as Diff from 'diff';

interface DiffViewerProps {
  original: string;
  modified: string;
  showLineNumbers?: boolean;
}

interface DiffLine {
  type: 'add' | 'remove' | 'normal';
  content: string;
  lineNumber?: {
    original?: number;
    modified?: number;
  };
}

export default function DiffViewer({ original, modified, showLineNumbers = true }: DiffViewerProps) {
  const generateDiff = (): DiffLine[] => {
    const diffResult = Diff.diffLines(original || '', modified || '', { newlineIsToken: true });
    const lines: DiffLine[] = [];
    let originalLineNum = 1;
    let modifiedLineNum = 1;

    diffResult.forEach((part) => {
      const partLines = part.value.split('\n').filter((line, index, array) => 
        index !== array.length - 1 || line !== ''
      );

      if (part.added) {
        partLines.forEach((line) => {
          lines.push({
            type: 'add',
            content: line,
            lineNumber: {
              modified: modifiedLineNum++
            }
          });
        });
      } else if (part.removed) {
        partLines.forEach((line) => {
          lines.push({
            type: 'remove',
            content: line,
            lineNumber: {
              original: originalLineNum++
            }
          });
        });
      } else {
        partLines.forEach((line) => {
          lines.push({
            type: 'normal',
            content: line,
            lineNumber: {
              original: originalLineNum++,
              modified: modifiedLineNum++
            }
          });
        });
      }
    });

    return lines;
  };

  const diffLines = generateDiff();
  
  // Calculate stats
  const stats = {
    additions: diffLines.filter(line => line.type === 'add').length,
    deletions: diffLines.filter(line => line.type === 'remove').length,
    total: diffLines.length
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with stats */}
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Line-by-Line Diff</h5>
        <div className="flex items-center space-x-4 text-xs">
          <span className="text-green-600 dark:text-green-400">
            +{stats.additions} additions
          </span>
          <span className="text-red-600 dark:text-red-400">
            -{stats.deletions} deletions
          </span>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="font-mono text-sm">
          {diffLines.map((line, index) => (
            <div
              key={index}
              className={`flex ${
                line.type === 'add' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' 
                  : line.type === 'remove' 
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {showLineNumbers && (
                <div className="flex">
                  <div className={`w-12 px-2 py-1 text-right select-none ${
                    line.type === 'add' 
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' 
                      : line.type === 'remove' 
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {line.lineNumber?.original || ''}
                  </div>
                  <div className={`w-12 px-2 py-1 text-right select-none border-r ${
                    line.type === 'add' 
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' 
                      : line.type === 'remove' 
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                  }`}>
                    {line.lineNumber?.modified || ''}
                  </div>
                </div>
              )}
              <div className="flex-1 px-4 py-1 whitespace-pre-wrap break-all">
                <span className={`select-none mr-2 ${
                  line.type === 'add' ? 'text-green-600 dark:text-green-400' : 
                  line.type === 'remove' ? 'text-red-600 dark:text-red-400' : 
                  'text-gray-400 dark:text-gray-500'
                }`}>
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </span>
                {line.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}