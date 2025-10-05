/**
 * useCompanyInfoState Hook
 * Manages company information form state
 */

import { useState } from 'react';

interface CompanyInfoState {
  companyPhone: string;
  setCompanyPhone: (phone: string) => void;
  companyFax: string;
  setCompanyFax: (fax: string) => void;
  companyAddress: string;
  setCompanyAddress: (address: string) => void;
  companyWebsite: string;
  setCompanyWebsite: (website: string) => void;
  quoteStartingPoint: string;
  setQuoteStartingPoint: (point: string) => void;
  currentLogoUrl: string | undefined;
  setCurrentLogoUrl: (url: string | undefined) => void;
}

export const useCompanyInfoState = (): CompanyInfoState => {
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyFax, setCompanyFax] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [quoteStartingPoint, setQuoteStartingPoint] = useState('');
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | undefined>();

  return {
    companyPhone,
    setCompanyPhone,
    companyFax,
    setCompanyFax,
    companyAddress,
    setCompanyAddress,
    companyWebsite,
    setCompanyWebsite,
    quoteStartingPoint,
    setQuoteStartingPoint,
    currentLogoUrl,
    setCurrentLogoUrl,
  };
};
