/**
 * useAuthFormState Hook
 * Manages form input state for authentication
 */

import { useState } from 'react';

interface AuthFormState {
  // Email/Password
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;

  // Name fields
  firstName: string;
  setFirstName: (name: string) => void;
  lastName: string;
  setLastName: (name: string) => void;
  fullName: string;
  setFullName: (name: string) => void;

  // OTP
  otpCode: string;
  setOtpCode: (code: string) => void;

  // Organization
  orgCode: string;
  setOrgCode: (code: string) => void;
  orgName: string;
  setOrgName: (name: string) => void;
  industry: string;
  setIndustry: (industry: string) => void;
  foundVia: string;
  setFoundVia: (source: string) => void;

  // UI state
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;

  // Reset function
  resetFormFields: () => void;
}

export const useAuthFormState = (): AuthFormState => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [foundVia, setFoundVia] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const resetFormFields = () => {
    // Don't clear email if it's saved in "Remember Me"
    const savedEmail = localStorage.getItem('remembered_email');
    const savedRememberMe = localStorage.getItem('remember_me') === 'true';

    if (!savedRememberMe) {
      setEmail('');
    }

    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setFullName('');
    setShowPassword(false);
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    fullName,
    setFullName,
    otpCode,
    setOtpCode,
    orgCode,
    setOrgCode,
    orgName,
    setOrgName,
    industry,
    setIndustry,
    foundVia,
    setFoundVia,
    showPassword,
    setShowPassword,
    resetFormFields,
  };
};
