import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, X } from 'lucide-react';

interface Props {
  toName: string;
  onPost: (msg: string) => void;
  onCancel: () => void;
  placeholder?: string;
}

export const SuggestionBox = ({ toName, onPost, onCancel, placeholder }: Props) => {
  const [msg, setMsg] = useState('');
  return (
    <div
      className="rounded-lg p-3 mt-2 animate-in fade-in slide-in-from-top-1"
      style={{ background: '#FFFBEB', borderLeft: '4px solid #E8A020' }}
    >
      <p className="text-xs text-foreground font-medium mb-2">Suggestion / Revision note for <span className="text-accent">{toName}</span></p>
      <Textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder={placeholder || `Type your suggestion or revision request here...`}
        rows={3}
        className="text-xs bg-card"
      />
      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          onClick={() => msg.trim() && onPost(msg.trim())}
          disabled={!msg.trim()}
          className="bg-accent hover:bg-accent/90 text-accent-foreground text-xs h-8"
        >
          <Send className="h-3 w-3 mr-1" /> Post Suggestion
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs h-8">
          <X className="h-3 w-3 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
};
