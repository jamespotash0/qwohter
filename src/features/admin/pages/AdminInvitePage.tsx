/**
 * Signup Invite Page
 *
 * Allows the platform owner to create invitation links for new organizations.
 * These invites bypass the public sign-up restriction.
 *
 * Only email is required - the user will enter their organization name
 * during the signup flow.
 */

import { useState } from 'react';
import { Copy, Check, Send, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateSecureToken } from '@/utils/inviteTokens';

interface GeneratedInvite {
  token: string;
  inviteUrl: string;
  email: string;
  expiresAt: Date;
  emailSent: boolean;
}

export function AdminInvitePage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<GeneratedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);

    try {
      // Generate a secure token for the signup invite
      const token = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry for signup invites

      // Get current user for tracking
      const { data: { user } } = await supabase.auth.getUser();

      // Store the signup invite in the dedicated table
      const { error } = await (supabase
        .from('signup_invites') as any)
        .insert({
          token,
          email: email.trim().toLowerCase(),
          expires_at: expiresAt.toISOString(),
          is_used: false,
          created_by_user_id: user?.id || null,
        });

      if (error) {
        // If table doesn't exist, show error
        if (error.code === '42P01') {
          toast.error('Signup invites table not set up. Please run the migration.');
          setLoading(false);
          return;
        }
        throw error;
      }

      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/create-account?appinvite=${token}`;

      // Send invitation email via edge function
      let emailSent = false;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const response = await supabase.functions.invoke('send-signup-invite', {
            body: {
              email: email.trim().toLowerCase(),
              inviteToken: token,
              appUrl: baseUrl,
            },
          });

          if (response.error) {
            console.error('Failed to send invite email:', response.error);
            toast.warning('Invite created but email failed to send. Please share the link manually.');
          } else {
            emailSent = true;
            toast.success('Invitation email sent successfully');
          }
        }
      } catch (emailError) {
        console.error('Error sending invite email:', emailError);
        toast.warning('Invite created but email failed to send. Please share the link manually.');
      }

      setGeneratedInvite({
        token,
        inviteUrl,
        email: email.trim(),
        expiresAt,
        emailSent,
      });

      if (!emailSent) {
        toast.success('Invite link generated successfully');
      }
    } catch (error) {
      console.error('Error generating invite:', error);
      toast.error('Failed to generate invite link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedInvite) return;

    try {
      await navigator.clipboard.writeText(generatedInvite.inviteUrl);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const resetForm = () => {
    setEmail('');
    setGeneratedInvite(null);
    setCopied(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <UserPlus className="w-6 h-6" />
          Send Invitation
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Generate invitation links for new organizations to sign up.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {!generatedInvite ? (
          <form onSubmit={handleGenerateInvite} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The email address of the person who will create a new organization.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Generate Invite Link
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Success state */}
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                {generatedInvite.emailSent ? (
                  <Send className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {generatedInvite.emailSent ? 'Invitation Email Sent' : 'Invite Link Generated'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {generatedInvite.emailSent
                  ? `An invitation email has been sent to ${generatedInvite.email}`
                  : `Share this link with ${generatedInvite.email}`}
              </p>
            </div>

            {/* Invite details */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <UserPlus className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">
                  {generatedInvite.email}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Expires: {generatedInvite.expiresAt.toLocaleDateString()} at{' '}
                {generatedInvite.expiresAt.toLocaleTimeString()}
              </p>
            </div>

            {/* Copy URL */}
            <div>
              <Label className="text-gray-700 dark:text-gray-300 mb-2 block">
                Invitation URL
              </Label>
              <div className="flex gap-2">
                <Input
                  value={generatedInvite.inviteUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  onClick={copyToClipboard}
                  variant="outline"
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="button"
              onClick={resetForm}
              variant="outline"
              className="w-full"
            >
              Create Another Invite
            </Button>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
          How signup invites work
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>An invitation email is automatically sent to the recipient</li>
          <li>Signup invites are valid for 7 days</li>
          <li>The recipient will create their account and organization</li>
          <li>Public sign-up is disabled - only invited users can create accounts</li>
          <li>Each invite can only be used once</li>
        </ul>
      </div>
    </div>
  );
}
