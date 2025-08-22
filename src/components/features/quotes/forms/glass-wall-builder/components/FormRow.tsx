import React from 'react';
import type { FormRowProps } from '../types';

export const FormRow: React.FC<FormRowProps> = ({ children }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {children}
    </div>
  );
};