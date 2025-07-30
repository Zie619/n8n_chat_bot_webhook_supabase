import React from 'react';
import * as Diff from 'diff';

interface UnifiedDiffViewerProps {
  original: string;
  modified: string;
  contextLines?: number;
}

export default function UnifiedDiffViewer({ 
  original, 
  modified, 
  contextLines = 3 
}: UnifiedDiffViewerProps) {
  const patchString = Diff.createPatch(
    'article',
    original || '',
    modified || '',
    'Original',
    'Modified',
    { context: contextLines }
  );

  // Parse the patch to get structured diff
  const lines = patchString.split('\n').slice(4); // Skip header lines
  
  const renderLine = (line: string, index: number) => {
    if (line.startsWith('@@')) {
      // Hunk header
      return (
        <div key={index} className="bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 px-4 py-1 font-mono text-xs">
          {line}
        </div>
      );
    } else if (line.startsWith('+')) {
      // Added line
      return (
        <div key={index} className="bg-green-50 dark:bg-green-900/20 flex font-mono text-sm">
          <span className="w-8 text-center text-green-600 dark:text-green-400 select-none">+</span>
          <span className="flex-1 text-green-800 dark:text-green-300 px-2 py-0.5 whitespace-pre-wrap">
            {line.substring(1)}
          </span>
        </div>
      );
    } else if (line.startsWith('-')) {
      // Removed line
      return (
        <div key={index} className="bg-red-50 dark:bg-red-900/20 flex font-mono text-sm">
          <span className="w-8 text-center text-red-600 dark:text-red-400 select-none">-</span>
          <span className="flex-1 text-red-800 dark:text-red-300 px-2 py-0.5 whitespace-pre-wrap">
            {line.substring(1)}
          </span>
        </div>
      );
    } else if (line.startsWith(' ')) {
      // Context line
      return (
        <div key={index} className="bg-white dark:bg-gray-800 flex font-mono text-sm">
          <span className="w-8 text-center text-gray-400 dark:text-gray-500 select-none"> </span>
          <span className="flex-1 text-gray-700 dark:text-gray-300 px-2 py-0.5 whitespace-pre-wrap">
            {line.substring(1)}
          </span>
        </div>
      );
    }
    return null;
  };

  // Calculate statistics
  const stats = {
    additions: lines.filter(l => l.startsWith('+')).length,
    deletions: lines.filter(l => l.startsWith('-')).length,
    hunks: lines.filter(l => l.startsWith('@@')).length
  };

  const hasChanges = stats.additions > 0 || stats.deletions > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header with stats */}
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Unified Diff View</h5>
        <div className="flex items-center space-x-4 text-xs">
          <span className="text-green-600 dark:text-green-400">
            +{stats.additions} additions
          </span>
          <span className="text-red-600 dark:text-red-400">
            -{stats.deletions} deletions
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {stats.hunks} {stats.hunks === 1 ? 'change' : 'changes'}
          </span>
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {hasChanges ? (
          <div className="min-h-full">
            {lines.map((line, index) => renderLine(line, index))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-8 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">No changes detected</p>
              <p className="text-sm">The original and modified content are identical</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}