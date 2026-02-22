/**
 * Send For Signature Dialog
 *
 * Email-style dialog to send a proposal for e-signature.
 * Supports multiple recipients.
 */

import React, { useState, useEffect } from 'react';
import { PaperPlaneTilt, X, Check, CaretDown, Plus, BellRinging } from '@phosphor-icons/react';
import { Loader2, PenLine } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';
import { sendForSignature } from '@/services/proposalSigningService';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';

interface SendForSignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  organizationId: string;
  organizationName?: string;
  proposalNumber?: string;
  projectName?: string;
  defaultClientEmail?: string;
  defaultClientName?: string;
  defaultClientCompany?: string;
}

const EXPIRY_OPTIONS = [
  { value: '3', label: '3 days' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: 'never', label: 'Never' },
];

export const SendForSignatureDialog: React.FC<SendForSignatureDialogProps> = ({
  isOpen,
  onClose,
  proposalId,
  organizationId,
  organizationName = 'Your Organization',
  proposalNumber,
  projectName,
  defaultClientEmail = '',
  defaultClientName = '',
  defaultClientCompany = '',
}) => {
  // Recipients (multiple emails)
  const [recipients, setRecipients] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');

  // Editable subject and body
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('7');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sentTo, setSentTo] = useState<string[]>([]);

  // Org-level reminder defaults (fetched on open, drives footer label)
  const [reminderDefaults, setReminderDefaults] = useState<{ enabled: boolean; intervalDays: number; maxReminders: number }>({ enabled: true, intervalDays: 3, maxReminders: 3 });

  // Signature placement fallback when auto-detection fails
  const [signatureFallback, setSignatureFallback] = useState<'auto' | 'overlay' | 'page'>('auto');

  // Default subject
  const defaultSubject = `Please sign: ${proposalNumber || 'Proposal'}${projectName ? ` - ${projectName}` : ''}`;

  // Default email body template
  const defaultEmailBody = `Hi ${defaultClientName || 'there'},

${organizationName} has sent you a proposal for your review and signature.

Proposal: ${proposalNumber || 'Proposal'}
Project: ${projectName || 'Your Project'}

Please review the proposal and sign electronically by clicking the button below.`;

  // Reset form and fetch org reminder defaults when dialog opens
  useEffect(() => {
    if (isOpen) {
      setRecipients(defaultClientEmail ? [defaultClientEmail] : []);
      setEmailInput('');
      setSubject(defaultSubject);
      setEmailBody(defaultEmailBody);
      setExpiresInDays('7');
      setSentSuccess(false);
      setSentTo([]);
      setSignatureFallback('auto');

      // Fetch org-level reminder defaults
      const fallback = { enabled: true, intervalDays: 3, maxReminders: 3 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('organizations') as any)
        .select('signing_reminder_defaults')
        .eq('id', organizationId)
        .single()
        .then(({ data, error: fetchError }: { data: { signing_reminder_defaults?: { enabled: boolean; intervalDays: number; maxReminders: number } } | null; error: unknown }) => {
          if (fetchError || !data?.signing_reminder_defaults) {
            setReminderDefaults(fallback);
          } else {
            setReminderDefaults(data.signing_reminder_defaults);
          }
        })
        .catch(() => {
          setReminderDefaults(fallback);
        });
    }
  }, [isOpen, defaultClientEmail, defaultSubject, defaultEmailBody, organizationId]);

  // Add email to recipients
  const addRecipient = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Invalid email address');
      return;
    }

    if (recipients.includes(email)) {
      toast.error('Email already added');
      return;
    }

    setRecipients([...recipients, email]);
    setEmailInput('');
  };

  // Remove email from recipients
  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  // Handle enter key in email input
  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRecipient();
    }
    if (e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addRecipient();
    }
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    setIsSending(true);

    try {
      const results = await Promise.all(
        recipients.map(email =>
          sendForSignature({
            proposalId,
            organizationId,
            clientEmail: email,
            clientName: defaultClientName || undefined,
            clientCompany: defaultClientCompany || undefined,
            expiresInDays: expiresInDays === 'never' ? undefined : parseInt(expiresInDays, 10),
            emailSubject: subject.trim() || undefined,
            emailBody: emailBody.trim() || undefined,
            reminderConfig: reminderDefaults.enabled
              ? reminderDefaults
              : undefined,
            signatureFallbackMode: signatureFallback === 'auto' ? undefined : signatureFallback,
          })
        )
      );

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0 && successful.length === 0) {
        toast.error(failed[0]!.error || 'Failed to send');
        return;
      }

      if (failed.length > 0) {
        toast.error(`Failed to send to ${failed.length} recipient${failed.length > 1 ? 's' : ''}`);
      }

      // Check if any emails failed to send (signing token created but email failed)
      const emailFailed = successful.filter(r => r.emailSent === false);
      if (emailFailed.length > 0) {
        const errorMsg = emailFailed[0]!.emailError || 'Email delivery failed';
        toast.error(`Warning: ${errorMsg}. Signing link was created but email may not have been delivered.`);
      }

      trackEvent('proposal_sent_for_signature', {
        has_expiration: expiresInDays !== 'never',
        has_reminders: reminderDefaults.enabled,
        recipient_count: recipients.length,
      });

      setSentSuccess(true);
      setSentTo(recipients);
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSentSuccess(false);
    }, 200);
  };

  const selectedExpiry = EXPIRY_OPTIONS.find(o => o.value === expiresInDays);

  // Success state
  if (sentSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">Email Sent</DialogTitle>
          <div className="bg-green-50 dark:bg-green-900/20 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-600 dark:text-green-400" weight="bold" />
            </div>
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Email Sent</h3>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              {sentTo.length === 1 ? sentTo[0] : `Sent to ${sentTo.length} recipients`}
            </p>
            <Button onClick={handleClose} className="mt-6 w-full">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">New Signature Request</DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">New Signature Request</h3>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Email Form */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {/* To field */}
          <div className="px-4 py-2">
            <div className="flex items-start gap-2">
              <span className="text-sm text-gray-500 w-16 pt-1">To</span>
              <div className="flex-1">
                {recipients.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {recipients.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                      >
                        {email}
                        <button
                          onClick={() => removeRecipient(email)}
                          className="hover:text-blue-900 dark:hover:text-blue-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Input
                    type="email"
                    placeholder={recipients.length ? 'Add another...' : 'client@company.com'}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    onBlur={() => emailInput && addRecipient()}
                    className="border-0 shadow-none focus-visible:ring-0 px-0 h-8 text-sm"
                  />
                  {emailInput && (
                    <button
                      onClick={addRecipient}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Plus className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Subject field (editable) */}
          <div className="flex items-center px-4 py-2">
            <span className="text-sm text-gray-500 w-16">Subject</span>
            <Input
              placeholder="Email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-8 text-sm"
            />
          </div>

          {/* Message body - editable email content */}
          <div className="px-4 py-3 bg-white dark:bg-gray-900">
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows={10}
              className="w-full resize-none border border-gray-200 dark:border-gray-700 rounded-lg p-4 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 leading-relaxed"
            />

            {/* Non-editable button preview */}
            <div className="mt-3 flex items-center gap-3">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold text-center text-sm">
                Review & Sign Proposal
              </div>
              <span className="text-xs text-gray-400">(Button added automatically)</span>
            </div>

            <p className="text-xs text-gray-400 mt-3">
              Footer: This is an automated message from Qwohter. If you have questions, please contact {organizationName} directly.
            </p>
          </div>

          {/* Info box explaining what happens */}
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              <strong>What happens next:</strong> Your proposal will be converted to PDF. The client will review and sign electronically.
              A signature page will be added to the final document with their signature, name, date, and IP address for legal compliance.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  Expires: {selectedExpiry?.label}
                  <CaretDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {EXPIRY_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setExpiresInDays(option.value)}
                    className={expiresInDays === option.value ? 'bg-gray-100 dark:bg-gray-800' : ''}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <PenLine className="w-3 h-3" />
                  {signatureFallback === 'auto' ? 'Auto-detect' : signatureFallback === 'overlay' ? 'Last page' : 'Separate page'}
                  <CaretDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => setSignatureFallback('auto')}
                  className={signatureFallback === 'auto' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                >
                  <div>
                    <div className="font-medium">Auto-detect</div>
                    <div className="text-xs text-gray-500">Place on signature line if found</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSignatureFallback('overlay')}
                  className={signatureFallback === 'overlay' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                >
                  <div>
                    <div className="font-medium">Bottom of last page</div>
                    <div className="text-xs text-gray-500">Always place at bottom of document</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSignatureFallback('page')}
                  className={signatureFallback === 'page' ? 'bg-gray-100 dark:bg-gray-800' : ''}
                >
                  <div>
                    <div className="font-medium">Separate page</div>
                    <div className="text-xs text-gray-500">Add a dedicated signature page</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-xs text-gray-400 flex items-center gap-1">
              <BellRinging className="w-3 h-3" />
              {reminderDefaults.enabled
                ? `Remind every ${reminderDefaults.intervalDays}d, up to ${reminderDefaults.maxReminders}x`
                : 'Reminders off'}
            </span>
          </div>

          <Button
            onClick={handleSend}
            disabled={isSending || recipients.length === 0}
            size="sm"
            className="px-4"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending
              </>
            ) : (
              <>
                <PaperPlaneTilt className="w-4 h-4 mr-2" />
                Send{recipients.length > 1 ? ` (${recipients.length})` : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendForSignatureDialog;
