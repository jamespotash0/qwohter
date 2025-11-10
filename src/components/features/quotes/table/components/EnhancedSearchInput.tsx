import React, { useState, useRef, useEffect } from 'react';
import { Search, X, HelpCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import useEnhancedSearch from '@/hooks/useEnhancedSearch';
import { Proposal } from '@/stores/proposals/proposalsStore';

interface EnhancedSearchInputProps {
  proposals: Proposal[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const EnhancedSearchInput: React.FC<EnhancedSearchInputProps> = ({
  proposals,
  value,
  onChange,
  placeholder = "Search proposals... (try: client:ABC Corp)"
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { getSearchSuggestions, getSearchExamples } = useEnhancedSearch(proposals);

  const suggestions = getSearchSuggestions(value, 5);
  const searchExamples = getSearchExamples();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(newValue.length > 0 && suggestions.length > 0);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleExampleClick = (example: string) => {
    onChange(example);
    setShowHelp(false);
    inputRef.current?.focus();
  };

  const clearSearch = () => {
    onChange('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasFieldSpecificSearch = /^(proposal|prop|#|client|company|location|address|loc|status|state|creator|by|author|project|name):/i.test(value);

  return (
    <div className="relative flex-1 max-w-sm">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(value.length > 0 && suggestions.length > 0)}
          className={`pl-8 pr-16 ${hasFieldSpecificSearch ? 'border-blue-300 bg-blue-50/30' : ''}`}
        />

        <div className="absolute right-1 top-1 flex items-center space-x-1">
          {value && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-7 w-7 p-0 hover:bg-gray-100"
              title="Clear search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}

          <Popover open={showHelp} onOpenChange={setShowHelp}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-gray-100"
                title="Search help"
              >
                <HelpCircle className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-2">Search Tips</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>• Regular search: Just type anything</p>
                    <p>• Field-specific: Use "field:value" format</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Field-Specific Examples</h4>
                  <div className="space-y-1">
                    {searchExamples.map((example, index) => (
                      <button
                        key={index}
                        onClick={() => handleExampleClick(example)}
                        className="block w-full text-left"
                      >
                        <Badge
                          variant="outline"
                          className="text-xs hover:bg-blue-50 cursor-pointer w-full justify-start"
                        >
                          {example}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  <p><strong>Available fields:</strong></p>
                  <p>proposal, client, location, status, creator, project</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-1 font-medium">Suggestions</div>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded truncate"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};