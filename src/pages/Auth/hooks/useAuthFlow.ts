/**
 * useAuthFlow Hook
 * Manages the multi-step authentication flow state
 */

import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export type AuthStep = 'auth' | 'verify-otp' | 'organization' | 'company-info';
export type OrgChoice = 'join' | 'create' | null;

interface AuthFlowState {
  // Step management
  step: AuthStep;
  setStep: (step: AuthStep) => void;
  stepRef: React.MutableRefObject<AuthStep>;

  // User state
  userId: string | null;
  setUserId: (id: string | null) => void;
  userIdRef: React.MutableRefObject<string | null>;

  // Organization choice
  orgChoice: OrgChoice;
  setOrgChoice: (choice: OrgChoice) => void;

  // Loading states
  loading: boolean;
  setLoading: (loading: boolean) => void;
  submissionInProgress: boolean;
  setSubmissionInProgress: (inProgress: boolean) => void;

  // Redirect tracking
  redirectingRef: React.MutableRefObject<boolean>;

  // Route-based state
  isSignUp: boolean;
  isCreateAccountRoute: boolean;
}

export const useAuthFlow = (): AuthFlowState => {
  const location = useLocation();
  const isCreateAccountRoute = location.pathname === '/create-account';

  const [step, setStep] = useState<AuthStep>('auth');
  const [userId, setUserId] = useState<string | null>(null);
  const [orgChoice, setOrgChoice] = useState<OrgChoice>(null);
  const [loading, setLoading] = useState(false);
  const [submissionInProgress, setSubmissionInProgress] = useState(false);
  const [isSignUp, setIsSignUp] = useState(isCreateAccountRoute);

  // Refs to track current values (avoid stale closures in auth listeners)
  const stepRef = useRef(step);
  const userIdRef = useRef(userId);
  const redirectingRef = useRef(false);

  // Update refs when state changes
  useEffect(() => {
    stepRef.current = step;
    userIdRef.current = userId;
  }, [step, userId]);

  // Update isSignUp when route changes
  useEffect(() => {
    setIsSignUp(isCreateAccountRoute);
  }, [isCreateAccountRoute]);

  return {
    step,
    setStep,
    stepRef,
    userId,
    setUserId,
    userIdRef,
    orgChoice,
    setOrgChoice,
    loading,
    setLoading,
    submissionInProgress,
    setSubmissionInProgress,
    redirectingRef,
    isSignUp,
    isCreateAccountRoute,
  };
};
