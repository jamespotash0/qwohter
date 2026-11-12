/**
 * Proposal Signing Page
 *
 * Public page where clients can view and sign a proposal.
 * Accessed via /sign/:token
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, CheckCircle, Warning, Spinner, PenNib, X, Signature } from '@phosphor-icons/react';
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
import { trackEvent } from '@/lib/analytics';

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
  const [showSignatureModal, setShowSignatureModal] = useState(false);

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
        trackEvent('signature_page_viewed');
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
    // Email comes from token, only name and signature required from user
    if (!token || !signatureData || !signerName.trim()) {
      return;
    }

    setPageState('submitting');

    try {
      // Use email from token if user hasn't changed it
      const emailToUse = signerEmail.trim() || signingData?.signingToken.client_email || '';

      const result = await submitSignature({
        accessToken: token,
        signerName: signerName.trim(),
        signerEmail: emailToUse,
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

      trackEvent('signature_submitted', { signature_type: signatureData.type });
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

  // Ready / Signing state - only name and signature required (email comes from token)
  const isValid = signerName.trim() && signatureData && agreedToTerms;

  return (
    <div className="h-screen bg-gray-100 flex flex-col lg:flex-row overflow-hidden">
      {/* PDF Preview - Takes most space, letter aspect ratio */}
      <div className="flex-1 flex items-center justify-center p-2 lg:p-4 min-h-0">
        <div className="h-full w-full max-w-[calc(100vh*8.5/11)] bg-white rounded shadow-lg overflow-hidden">
          {signingData?.pdfUrl ? (
            <iframe
              src={`${signingData.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full"
              title="Proposal PDF"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Document preview not available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Signature Panel - Right side on desktop, bottom on mobile */}
      <div className="lg:w-72 bg-white border-t lg:border-t-0 lg:border-l shadow-lg flex-shrink-0">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <PenNib className="w-4 h-4 text-blue-600" weight="fill" />
            <h2 className="font-semibold text-gray-900">Sign Document</h2>
          </div>

          {/* Signer Name */}
          <div className="space-y-1">
            <Label htmlFor="signerName" className="text-xs font-medium text-gray-600">
              Your Name
            </Label>
            <Input
              id="signerName"
              placeholder="Enter your full name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Signature Button */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">
              Your Signature
            </Label>
            <button
              type="button"
              onClick={() => setShowSignatureModal(true)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center gap-2 text-left"
            >
              <Signature className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                {signatureData ? 'Change signature' : 'Add signature'}
              </span>
            </button>

            {/* Signature Preview */}
            {signatureData && (
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <img
                  src={signatureData.data}
                  alt="Your signature"
                  className="h-10 w-auto mx-auto object-contain"
                />
              </div>
            )}
          </div>

          {/* Terms agreement */}
          <div className="flex items-start gap-2 p-2 bg-gray-50 rounded">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="terms" className="text-xs text-gray-600 leading-snug cursor-pointer">
              I confirm this is my legal signature and I accept the proposal terms.
            </label>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!isValid || pageState === 'submitting'}
            className="w-full h-10"
          >
            {pageState === 'submitting' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Sign & Submit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Add Your Signature</h3>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              <SignatureCanvas
                onChange={setSignatureData}
                width={360}
                height={120}
                defaultName={signerName}
              />
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2 p-4 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowSignatureModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowSignatureModal(false)}
                disabled={!signatureData}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProposalSigningPage;
