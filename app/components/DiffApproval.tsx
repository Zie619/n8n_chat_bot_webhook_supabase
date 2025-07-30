'use client';

import React from 'react';
import { Check, X, FileText, ArrowRight } from 'lucide-react';
import { DiffResult } from '@/lib/diff-generator';

interface DiffApprovalProps {
  original: string;
  modified: string;
  diff: DiffResult;
  explanation?: string;
  onApprove: () => void;
  onReject: () => void;
  isProcessing?: boolean;
}

export default function DiffApproval({
  original,
  modified,
  diff,
  explanation,
  onApprove,
  onReject,
  isProcessing = false
}: DiffApprovalProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Suggested Edit</h3>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-green-600 dark:text-green-400">
              +{diff.addedCount}
            </span>
            <span className="text-red-600 dark:text-red-400">
              -{diff.removedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-blue-800 dark:text-blue-200">{explanation}</p>
        </div>
      )}

      {/* Diff View */}
      <div className="p-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Original */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Original</h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm">
              <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-mono">
                {original}
              </pre>
            </div>
          </div>

          {/* Modified */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Modified</h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-sm">
              <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-mono">
                {modified}
              </pre>
            </div>
          </div>
        </div>

        {/* Line-by-line diff */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Changes</h4>
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 space-y-1 max-h-48 overflow-y-auto">
            {diff.lines.map((line, index) => (
              <div
                key={index}
                className={`text-sm font-mono ${
                  line.type === 'added'
                    ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                    : line.type === 'removed'
                    ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                    : 'text-gray-600 dark:text-gray-400'
                } px-2 py-0.5 rounded`}
              >
                <span className="select-none mr-2">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                {line.content || <span className="italic text-gray-400">{'<empty line>'}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-end space-x-3">
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Reject</span>
          </button>
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>Apply Edit</span>
          </button>
        </div>
      </div>
    </div>
  );
}