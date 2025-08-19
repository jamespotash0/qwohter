import { useState, useEffect, useRef } from "react";

interface QuoteNameInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  maxChars?: number;
  onSave: () => void;
}

const QuoteNameInput = ({ 
  value, 
  onChange, 
  maxChars = 35, 
  onSave 
}: QuoteNameInputProps) => {
  const spanRef = useRef(null);
  const inputRef = useRef(null);
  const [inputWidth, setInputWidth] = useState(0);

  // Update input width dynamically when value changes
  useEffect(() => {
    if (spanRef.current) {
      const width = spanRef.current.offsetWidth;
      setInputWidth(width + 20); // add some padding
    }
  }, [value]);

  // Limit max width roughly for 35 chars (assuming avg char width)
  const maxWidth = 35 * 10; // 10px avg char width → 350px max

  return (
    <>
      {/* Hidden span to measure text width */}
      <span
        ref={spanRef}
        className="invisible absolute whitespace-pre font-bold text-xl sm:text-2xl"
        style={{ fontFamily: 'inherit' }}
      >
        {value || " "}
      </span>

      <input
        type="text"
        ref={inputRef}
        value={value}
        maxLength={maxChars}
        onChange={onChange}
        onBlur={onSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave();
          }
        }}
        style={{ width: Math.min(inputWidth, maxWidth) }}
        className="text-xl sm:text-2xl font-bold bg-transparent border-b-2 border-blue-400 focus:outline-none focus:border-blue-600 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent"
        autoFocus
      />
    </>
  );
};
export default QuoteNameInput;
