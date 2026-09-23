import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Square, Circle, ArrowRight, Type, Sparkles, Trash2, Eye } from 'lucide-react';

interface SvgDiagramCanvasProps {
  initialSvg?: string;
  onSave: (svgString: string) => void;
  onCancel?: () => void;
}

export const SvgDiagramCanvas: React.FC<SvgDiagramCanvasProps> = ({ initialSvg = '', onSave, onCancel }) => {
  const [svgContent, setSvgContent] = useState<string>(
    initialSvg ||
`<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" class="w-full h-full bg-slate-50 dark:bg-slate-900 border rounded-lg">
  <rect x="50" y="75" width="100" height="60" rx="6" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6" stroke-width="2"/>
  <text x="100" y="110" font-family="sans-serif" font-size="14" font-weight="600" text-anchor="middle" fill="currentColor">Module A</text>
  
  <line x1="150" y1="105" x2="250" y2="105" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
  
  <rect x="250" y="75" width="100" height="60" rx="6" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-width="2"/>
  <text x="300" y="110" font-family="sans-serif" font-size="14" font-weight="600" text-anchor="middle" fill="currentColor">Module B</text>

  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
    </marker>
  </defs>
</svg>`
  );

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('preview');

  // Quick preset templates for Engineering diagrams
  const applyPreset = (preset: 'architecture' | 'logicGate' | 'stateMachine') => {
    if (preset === 'architecture') {
      setSvgContent(
`<svg viewBox="0 0 500 220" xmlns="http://www.w3.org/2000/svg" class="w-full h-full bg-slate-50 dark:bg-slate-900 border rounded-lg">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
    </marker>
  </defs>
  <!-- Presentation Layer -->
  <rect x="40" y="30" width="420" height="40" rx="6" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6" stroke-width="2"/>
  <text x="250" y="55" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="currentColor">Presentation Layer (Client / React)</text>

  <line x1="250" y1="70" x2="250" y2="95" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Service Layer -->
  <rect x="40" y="95" width="420" height="40" rx="6" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="2"/>
  <text x="250" y="120" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="currentColor">Service / Business Logic Engine</text>

  <line x1="250" y1="135" x2="250" y2="160" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Data Vault Layer -->
  <rect x="40" y="160" width="420" height="40" rx="6" fill="#8b5cf6" fill-opacity="0.2" stroke="#8b5cf6" stroke-width="2"/>
  <text x="250" y="185" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="currentColor">Encrypted Vault Storage (AES-256-GCM)</text>
</svg>`
      );
    } else if (preset === 'logicGate') {
      setSvgContent(
`<svg viewBox="0 0 450 180" xmlns="http://www.w3.org/2000/svg" class="w-full h-full bg-slate-50 dark:bg-slate-900 border rounded-lg">
  <!-- Inputs -->
  <line x1="50" y1="60" x2="150" y2="60" stroke="#64748b" stroke-width="2"/>
  <text x="35" y="65" font-family="sans-serif" font-size="14" font-weight="bold" fill="currentColor">A</text>
  
  <line x1="50" y1="110" x2="150" y2="110" stroke="#64748b" stroke-width="2"/>
  <text x="35" y="115" font-family="sans-serif" font-size="14" font-weight="bold" fill="currentColor">B</text>

  <!-- AND Gate Body -->
  <path d="M 150 40 L 220 40 A 45 45 0 0 1 220 130 L 150 130 Z" fill="#f59e0b" fill-opacity="0.2" stroke="#f59e0b" stroke-width="2"/>
  <text x="185" y="90" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="currentColor">AND</text>

  <!-- Output -->
  <line x1="265" y1="85" x2="380" y2="85" stroke="#64748b" stroke-width="2"/>
  <text x="400" y="90" font-family="sans-serif" font-size="14" font-weight="bold" fill="currentColor">Y = A·B</text>
</svg>`
      );
    } else if (preset === 'stateMachine') {
      setSvgContent(
`<svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg" class="w-full h-full bg-slate-50 dark:bg-slate-900 border rounded-lg">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
    </marker>
  </defs>
  <!-- State S0 -->
  <circle cx="100" cy="100" r="40" fill="#3b82f6" fill-opacity="0.2" stroke="#3b82f6" stroke-width="2"/>
  <text x="100" y="105" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="currentColor">S0 (Idle)</text>

  <!-- Transition -->
  <line x1="140" y1="100" x2="260" y2="100" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="200" y="90" font-family="sans-serif" font-size="12" text-anchor="middle" fill="#64748b">clk / start=1</text>

  <!-- State S1 -->
  <circle cx="300" cy="100" r="40" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="2"/>
  <text x="300" y="105" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="currentColor">S1 (Active)</text>
</svg>`
      );
    }
  };

  return (
    <div className="space-y-4 border rounded-xl p-4 bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h4 className="text-sm font-semibold text-foreground">Interactive SVG Diagram Canvas</h4>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset('architecture')}
            className="text-xs"
          >
            Architecture
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset('logicGate')}
            className="text-xs"
          >
            Logic Gate
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset('stateMachine')}
            className="text-xs"
          >
            FSM / State
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button
            type="button"
            variant={activeTab === 'preview' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('preview')}
            className="text-xs flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </Button>
          <Button
            type="button"
            variant={activeTab === 'editor' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('editor')}
            className="text-xs"
          >
            SVG Code
          </Button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        <div
          className="w-full flex items-center justify-center p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 min-h-[220px]"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      ) : (
        <textarea
          value={svgContent}
          onChange={(e) => setSvgContent(e.target.value)}
          rows={9}
          className="w-full font-mono text-xs p-3 rounded-lg border bg-muted/40 focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Paste raw SVG string or modify attributes here..."
        />
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          Vector diagrams scale with infinite resolution on printed exam papers without blurriness.
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => onSave(svgContent)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Embed Vector Diagram
          </Button>
        </div>
      </div>
    </div>
  );
};
