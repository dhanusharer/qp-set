import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MathView } from '@/components/MathView';
import { Sigma, Sparkles, Copy, Check } from 'lucide-react';

interface LatexMathModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (latexText: string) => void;
}

interface FormulaPreset {
  label: string;
  latex: string;
  category: 'Arithmetic' | 'Calculus' | 'Linear Algebra' | 'Computer Science' | 'Greek';
}

const PRESETS: FormulaPreset[] = [
  // Computer Science & Complexity
  { label: 'Big-O Notation', latex: '\\mathcal{O}(n \\log n)', category: 'Computer Science' },
  { label: 'Omega & Theta', latex: '\\Omega(n) \\text{ and } \\Theta(1)', category: 'Computer Science' },
  { label: 'Recurrence Relation', latex: 'T(n) = 2T\\left(\\frac{n}{2}\\right) + \\mathcal{O}(n)', category: 'Computer Science' },
  { label: 'Master Theorem', latex: 'T(n) = aT(n/b) + f(n)', category: 'Computer Science' },

  // Calculus & Analysis
  { label: 'Fraction', latex: '\\frac{a + b}{c + d}', category: 'Arithmetic' },
  { label: 'Square Root', latex: '\\sqrt{b^2 - 4ac}', category: 'Arithmetic' },
  { label: 'Summation', latex: '\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}', category: 'Calculus' },
  { label: 'Definite Integral', latex: '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}', category: 'Calculus' },
  { label: 'Partial Derivative', latex: '\\frac{\\partial f}{\\partial x}', category: 'Calculus' },
  { label: 'Limit', latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1', category: 'Calculus' },

  // Linear Algebra & Matrices
  { label: '2x2 Matrix', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', category: 'Linear Algebra' },
  { label: 'Determinant', latex: '\\det(A) = ad - bc', category: 'Linear Algebra' },
  { label: 'Eigenvalue Equation', latex: 'A\\mathbf{x} = \\lambda\\mathbf{x}', category: 'Linear Algebra' },

  // Greek Symbols
  { label: 'Alpha, Beta, Gamma', latex: '\\alpha, \\beta, \\gamma, \\delta', category: 'Greek' },
  { label: 'Theta, Lambda, Sigma', latex: '\\theta, \\lambda, \\sigma, \\omega', category: 'Greek' },
  { label: 'Delta & Pi', latex: '\\Delta, \\pi, \\epsilon, \\rho', category: 'Greek' },
];

export const LatexMathModal: React.FC<LatexMathModalProps> = ({ open, onOpenChange, onInsert }) => {
  const [latexInput, setLatexInput] = useState<string>('\\mathcal{O}(n \\log n)');
  const [isBlockMode, setIsBlockMode] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>('Computer Science');

  const categories = ['Computer Science', 'Arithmetic', 'Calculus', 'Linear Algebra', 'Greek'];

  const handleInsert = () => {
    if (!latexInput.trim()) return;
    const formatted = isBlockMode ? `$$${latexInput.trim()}$$` : `$${latexInput.trim()}$`;
    onInsert(formatted);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sigma className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">KaTeX Mathematical Equation Editor</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Author mathematical notations, algorithm complexities, equations, and matrices.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Presets Grid */}
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.filter((p) => p.category === activeCategory).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setLatexInput(preset.latex)}
                className="flex flex-col items-start p-2.5 rounded-lg border bg-card/50 hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <span className="text-[10px] font-semibold text-muted-foreground">{preset.label}</span>
                <span className="font-mono text-xs text-foreground mt-0.5 truncate w-full">
                  {preset.latex}
                </span>
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground">LaTeX Expression</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBlockMode}
                    onChange={(e) => setIsBlockMode(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>Display Block ($$...$$)</span>
                </label>
              </div>
            </div>
            <textarea
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              rows={3}
              className="w-full font-mono text-xs p-2.5 rounded-lg border bg-card focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              placeholder="e.g. \\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}"
            />
          </div>

          {/* Live KaTeX Preview */}
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Live Equation Preview
            </span>
            <div className="p-4 rounded-lg border bg-muted/20 min-h-[60px] flex items-center justify-center">
              {latexInput.trim() ? (
                <MathView content={isBlockMode ? `$$${latexInput}$$` : `$${latexInput}$`} />
              ) : (
                <span className="text-xs text-muted-foreground italic">Type a LaTeX formula to preview</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleInsert} className="gap-1.5 bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Insert Equation into Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
