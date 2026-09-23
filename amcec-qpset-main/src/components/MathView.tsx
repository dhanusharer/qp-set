import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  content: string;
  className?: string;
}

/**
 * Safely parses and renders text containing inline ($...$) and block ($$...$$) LaTeX formulas
 * using KaTeX.
 */
export const MathView: React.FC<MathViewProps> = ({ content, className = '' }) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Regex to split by $$...$$ (display mode) or $...$ (inline mode)
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    const parts = content.split(regex);

    return parts.map((part) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const formula = part.slice(2, -2).trim();
        try {
          return katex.renderToString(formula, { displayMode: true, throwOnError: false });
        } catch {
          return `<span class="text-rose-500 font-mono">${part}</span>`;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const formula = part.slice(1, -1).trim();
        try {
          return katex.renderToString(formula, { displayMode: false, throwOnError: false });
        } catch {
          return `<span class="text-rose-500 font-mono">${part}</span>`;
        }
      }
      // Standard text with newlines converted to <br />
      return part.replace(/\n/g, '<br />');
    }).join('');
  }, [content]);

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
