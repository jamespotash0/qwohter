/**
 * AI Chat Input Component
 *
 * Text input with send button for chat messages.
 * Supports placeholder suggestions and keyboard shortcuts.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface AIChatInputProps {
  onSend: (message: string) => void;
  isSending?: boolean;
  placeholder?: string;
  disabled?: boolean;
  suggestions?: string[];
}

// ============================================================================
// Component
// ============================================================================

export const AIChatInput: React.FC<AIChatInputProps> = ({
  onSend,
  isSending = false,
  placeholder = 'Ask a question or give a command...',
  disabled = false,
  suggestions = [
    'Draft a follow-up email',
    'Create a reminder for next week',
    'What tasks are overdue?',
    'Suggest next steps',
  ],
}) => {
  const [message, setMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !isSending && !disabled) {
      onSend(trimmedMessage);
      setMessage('');
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const isDisabled = disabled || isSending || !message.trim();

  return (
    <div className="border-t bg-white">
      {/* Quick suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="px-4 py-2 border-b bg-gray-50/50">
          <p className="text-xs text-gray-500 mb-2">Quick suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs px-2 py-1 rounded-full bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder={placeholder}
              disabled={disabled || isSending}
              className={cn(
                'min-h-[44px] max-h-[120px] resize-none pr-12',
                'border-gray-200 focus:border-purple-300 focus:ring-purple-100',
                isSending && 'opacity-50'
              )}
              rows={1}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={isDisabled}
            size="icon"
            className={cn(
              'h-[44px] w-[44px] flex-shrink-0',
              'bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300'
            )}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default AIChatInput;
