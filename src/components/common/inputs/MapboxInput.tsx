
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface MapboxInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id: string;
  required?: boolean;
  className?: string;
}

const MapboxInput = ({ label, value, onChange, placeholder, id, required = false, className = "" }: MapboxInputProps & {className?: string}) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapboxToken, setMapboxToken] = useState("");
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch Mapbox token on component mount
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('Error fetching Mapbox token:', error);
          setIsLoadingToken(false);
          return;
        }
        
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      } finally {
        setIsLoadingToken(false);
      }
    };

    fetchMapboxToken();
  }, []);

  const handleInputChange = async (inputValue: string) => {
    onChange(inputValue);
    
    // Don't make API calls if token is still loading or missing, or input is too short
    if (isLoadingToken || !mapboxToken || inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // Use NY/NJ area coordinates for proximity bias (around Franklin Lakes, NJ)
      const proximityLng = -74.2107; // Longitude for Franklin Lakes, NJ
      const proximityLat = 41.0209;  // Latitude for Franklin Lakes, NJ
      
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(inputValue)}.json?access_token=${mapboxToken}&types=poi,address&country=us&limit=8&proximity=${proximityLng},${proximityLat}`
      );
      
      console.log('Mapbox API response status:', response.status);
      
      if (!response.ok) {
        console.error('Mapbox API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Mapbox API error details:', errorText);
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        setSuggestions(data.features);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Mapbox geocoding error:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    onChange(suggestion.place_name.replace(/,\s*United States$/, ''));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-2 relative">
      {label && (
        <Label
          htmlFor={id}
          className="text-[#171717] font-medium text-sm"
          style={{ fontFamily: 'Urbanist, sans-serif' }}
        >
          {label}
        </Label>
      )}
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        required={required}
        className={className || "bg-[#f7f2e9]/50 border-[#171717]/10 h-12 rounded-full placeholder:text-[#171717]/40 hover:border-[#171717]/20 hover:bg-[#f7f2e9]/70 focus:ring-2 focus:ring-[#ee6c4d]/20 focus:border-[#ee6c4d] focus:bg-white"}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-[#171717]/10 rounded-2xl shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-3 hover:bg-[#f7f2e9] cursor-pointer border-b border-[#171717]/5 last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="text-sm text-[#171717]">{suggestion.place_name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MapboxInput;
