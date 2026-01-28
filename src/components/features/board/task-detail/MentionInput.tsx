/**
 * MentionInput Component
 *
 * A textarea that supports @mentions with autocomplete suggestions.
 * Mentions are stored in format: @[Display Name](user_id)
 */

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { MentionSuggestion } from '@/lib/types/taskComments';

interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  placeholder?: string;
  members: MentionSuggestion[];
  className?: string;
  minRows?: number;
  maxRows?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  onSubmit?: () => void;
}

export function MentionInput({
  value,
  onChange,
  placeholder = 'Add a comment... Use @ to mention someone',
  members,
  className,
  minRows = 2,
  maxRows = 8,
  autoFocus = false,
  disabled = false,
  onSubmit,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [mentionMap, setMentionMap] = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter members based on mention query
  const filteredMembers = members.filter((member) =>
    member.display.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const lineHeight = 24;
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value, minRows, maxRows]);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;

      // Check if we're in a mention context
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        setShowSuggestions(true);
        setMentionQuery(mentionMatch[1] || '');
        setMentionStartPos(cursorPos - mentionMatch[0].length);
        setSuggestionIndex(0);
      } else {
        setShowSuggestions(false);
        setMentionQuery('');
        setMentionStartPos(null);
      }

      // Extract all mentioned names and map to IDs using mentionMap
      const nameRegex = /@(\w+(?:\s+\w+)*)/g;
      const mentions: string[] = [];
      let match;
      while ((match = nameRegex.exec(newValue)) !== null) {
        const name = match[1];
        if (name && mentionMap[name]) {
          mentions.push(mentionMap[name]);
        }
      }

      onChange(newValue, mentions);
    },
    [onChange, mentionMap]
  );

  // Insert mention at cursor position - just shows @Name, stores ID separately
  const insertMention = useCallback(
    (member: MentionSuggestion) => {
      if (mentionStartPos === null || !textareaRef.current) return;

      const beforeMention = value.slice(0, mentionStartPos);
      const afterMention = value.slice(textareaRef.current.selectionStart || mentionStartPos);
      const mentionText = `@${member.display} `;
      const newValue = beforeMention + mentionText + afterMention;

      // Update mention map
      const newMentionMap = { ...mentionMap, [member.display]: member.id };
      setMentionMap(newMentionMap);

      // Extract all mentioned names and map to IDs
      const nameRegex = /@(\w+(?:\s+\w+)*)/g;
      const mentions: string[] = [];
      let match;
      while ((match = nameRegex.exec(newValue)) !== null) {
        const name = match[1];
        if (name && newMentionMap[name]) {
          mentions.push(newMentionMap[name]);
        }
      }

      onChange(newValue, mentions);
      setShowSuggestions(false);
      setMentionQuery('');
      setMentionStartPos(null);

      // Focus and set cursor position after mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = mentionStartPos + mentionText.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [value, mentionStartPos, onChange, mentionMap]
  );

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && filteredMembers.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSuggestionIndex((prev) =>
            prev < filteredMembers.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : filteredMembers.length - 1
          );
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          const selectedMember = filteredMembers[suggestionIndex];
          if (selectedMember) insertMention(selectedMember);
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
      }
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  // Get initials from display name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          'w-full resize-none rounded-sm border border-gray-200 bg-gray-50/50',
          'px-3 py-2.5 text-sm leading-6',
          'placeholder:text-gray-400',
          'focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-200',
          className
        )}
        style={{ minHeight: `${minRows * 24 + 20}px` }}
      />

      {/* Mention suggestions dropdown */}
      {showSuggestions && filteredMembers.length > 0 && (
        <div
          ref={suggestionsRef}
          className={cn(
            'absolute left-0 z-50 mt-1 w-64',
            'rounded-lg border border-gray-200 bg-white shadow-lg',
            'max-h-48 overflow-y-auto',
            'animate-in fade-in-0 zoom-in-95 duration-150'
          )}
        >
          <div className="p-1">
            {filteredMembers.map((member, index) => (
              <button
                key={member.id}
                type="button"
                onClick={() => insertMention(member)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left',
                  'transition-colors duration-100',
                  index === suggestionIndex
                    ? 'bg-indigo-50 text-indigo-900'
                    : 'hover:bg-gray-50 text-gray-700'
                )}
              >
                <Avatar className="h-7 w-7 ring-2 ring-white">
                  <AvatarFallback
                    className={cn(
                      'text-[10px] font-medium',
                      index === suggestionIndex
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {getInitials(member.display)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">{member.display}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
