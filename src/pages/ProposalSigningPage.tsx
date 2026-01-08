/**
 * Proposal Signing Page
 *
 * Public page where clients can view and sign a proposal.
 * Accessed via /sign/:token
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, CheckCircle, Warning, Spinner, User, Envelope, Buildings } from '@phosphor-icons/react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SignatureCanvas } from '@/components/features/signing/SignatureCanvas';
import {
  getSigningData,
  trackSigningView,
  submitSignature,
  type SigningPageData,
} from '@/services/proposalSigningService';

type PageState = 'loading' | 'ready' | 'signing' | 'submitting' | 'success' | 'error' | 'already_signed';

export function ProposalSigningPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [signingData, setSigningData] = useState<SigningPageData | null>(null);

  // Signature form state
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerCompany, setSignerCompany] = useState('');
  const [signatureData, setSignatureData] = useState<{ type: 'draw' | 'type'; data: string; font?: string } | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

  // Load signing data
  useEffect(() => {
    async function loadData() {
      if (!token) {
        setError('Invalid signing link');
        setPageState('error');
        return;
      }

      try {
        const data = await getSigningData(token);
        if (!data) {
          setError('This signing link is invalid or has expired');
          setPageState('error');
          return;
        }

        setSigningData(data);

        // Pre-fill form with client info
        if (data.signingToken.client_name) {
          setSignerName(data.signingToken.client_name);
        }
        if (data.signingToken.client_email) {
          setSignerEmail(data.signingToken.client_email);
        }
        if (data.signingToken.client_company) {
          setSignerCompany(data.signingToken.client_company);
        }

        setPageState('ready');

        // Track view
        trackSigningView(token);
      } catch (err) {
        console.error('Failed to load signing data:', err);
        setError('Failed to load proposal');
        setPageState('error');
      }
    }

    loadData();
  }, [token]);

  // Handle signature submission
  const handleSubmit = async () => {
    if (!token || !signatureData || !signerName.trim() || !signerEmail.trim()) {
      return;
    }

    setPageState('submitting');

    try {
      const result = await submitSignature({
        accessToken: token,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        signerCompany: signerCompany.trim() || undefined,
        signatureType: signatureData.type,
        signatureData: signatureData.data,
        signatureFont: signatureData.font,
      });

      if (!result.success) {
        setError(result.error || 'Failed to submit signature');
        setPageState('error');
        return;
      }

      setSignedPdfUrl(result.signedPdfUrl || null);
      setPageState('success');
    } catch (err) {
      console.error('Failed to submit signature:', err);
      setError('Failed to submit signature');
      setPageState('error');
    }
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading proposal...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Warning className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load</h1>
          <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact the sender.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" weight="fill" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Signed Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for signing {signingData?.proposal.proposal_number}. A copy of the signed document has been sent to your email.
          </p>
          {signedPdfUrl && (
            <Button
              onClick={() => window.open(signedPdfUrl, '_blank')}
              className="mb-4"
            >
              <FileText className="w-4 h-4 mr-2" />
              Download Signed PDF
            </Button>
          )}
          <p className="text-sm text-gray-500">
            You can close this window.
          </p>
        </div>
      </div>
    );
  }

  // Ready / Signing state
  const isValid = signerName.trim() && signerEmail.trim() && signatureData && agreedToTerms;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {signingData?.organization.logo_url ? (
              <img
                src={signingData.organization.logo_url}
                alt={signingData.organization.name}
                className="h-8 w-auto"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900">{signingData?.organization.name}</p>
              <p className="text-xs text-gray-500">{signingData?.proposal.proposal_number}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* PDF Preview */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-medium text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {signingData?.proposal.project_name || 'Proposal'}
              </h2>
            </div>
            <div className="aspect-[8.5/11] bg-gray-100">
              {signingData?.pdfUrl ? (
                <iframe
                  src={`${signingData.pdfUrl}#toolbar=0`}
                  className="w-full h-full"
                  title="Proposal PDF"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  PDF not available
                </div>
              )}
            </div>
            {signingData?.pdfUrl && (
              <div className="p-3 border-t bg-gray-50 text-center">
                <a
                  href={signingData.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Open PDF in new tab
                </a>
              </div>
            )}
          </div>

          {/* Signature Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sign Document</h2>

              <div className="space-y-4">
                {/* Signer Name */}
                <div className="space-y-2">
                  <Label htmlFor="signerName" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="signerName"
                    placeholder="Enter your full name"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                  />
                </div>

                {/* Signer Email */}
                <div className="space-y-2">
                  <Label htmlFor="signerEmail" className="flex items-center gap-2">
                    <Envelope className="w-4 h-4" />
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="signerEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                  />
                </div>

                {/* Signer Company */}
                <div className="space-y-2">
                  <Label htmlFor="signerCompany" className="flex items-center gap-2">
                    <Buildings className="w-4 h-4" />
                    Company
                  </Label>
                  <Input
                    id="signerCompany"
                    placeholder="Company name (optional)"
                    value={signerCompany}
                    onChange={(e) => setSignerCompany(e.target.value)}
                  />
                </div>

                {/* Signature */}
                <div className="space-y-2">
                  <Label>Your Signature <span className="text-red-500">*</span></Label>
                  <SignatureCanvas
                    onChange={setSignatureData}
                    width={400}
                    height={150}
                    defaultName={signerName}
                  />
                </div>

                {/* Terms agreement */}
                <div className="flex items-start gap-2 pt-2">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600 leading-tight">
                    I agree that this electronic signature is the legal equivalent of my handwritten signature
                    and I have reviewed the proposal.
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!isValid || pageState === 'submitting'}
              className="w-full h-12 text-base"
              size="lg"
            >
              {pageState === 'submitting' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Sign & Submit
                </>
              )}
            </Button>

            {/* Security note */}
            <p className="text-xs text-gray-500 text-center">
              Your signature is secured and legally binding. By signing, you accept the terms of this proposal.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Powered by Qwohter • Secure e-signature
        </div>
      </footer>
    </div>
  );
}

export default ProposalSigningPage;
