
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MapboxInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id: string;
  required?: boolean;
}

const MapboxInput = ({ label, value, onChange, placeholder, id, required = false }: MapboxInputProps) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapboxToken, setMapboxToken] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // For now, we'll use a simple input until Mapbox token is provided
  const handleInputChange = async (inputValue: string) => {
    onChange(inputValue);
    
    if (!mapboxToken || inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(inputValue)}.json?access_token=${mapboxToken}&types=address,poi&limit=5`
      );
      const data = await response.json();
      
      if (data.features) {
        setSuggestions(data.features);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Mapbox geocoding error:", error);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    onChange(suggestion.place_name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-1 relative">
      {label && <Label htmlFor={id} className="text-sm font-medium">{label}</Label>}
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        required={required}
        className="h-9"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="font-medium">{suggestion.text}</div>
              <div className="text-sm text-gray-600">{suggestion.place_name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MapboxInput;
