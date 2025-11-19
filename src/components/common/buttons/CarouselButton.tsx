import React from 'react';

interface CarouselButtonProps {
  direction: 'left' | 'right';
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const CarouselButton: React.FC<CarouselButtonProps> = ({
  direction,
  onClick,
  variant = 'secondary'
}) => {
  const isPrimary = variant === 'primary';

  const baseClasses = "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300";
  const variantClasses = isPrimary
    ? "bg-[var(--landing-primary)] text-white hover:bg-[#d95a3d]"
    : "border-2 border-gray-300 hover:border-[var(--landing-primary)] hover:bg-[var(--landing-primary)] hover:text-white";

  const iconPath = direction === 'left'
    ? "M15 19l-7-7 7-7"
    : "M9 5l7 7-7 7";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses}`}
      aria-label={`Scroll ${direction}`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
      </svg>
    </button>
  );
};
