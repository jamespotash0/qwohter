/**
 * QuickBooks Desktop Connect Dialog
 *
 * Handles Web Connector setup for QuickBooks Desktop
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  createQBDesktopConnection,
  generateQWCFile,
} from '@/services/quickbooksDesktopService';
import type { CreateConnectionData } from '@/services/quickbooksDesktopService';

interface QBDesktopConnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
}

export const QBDesktopConnectDialog: React.FC<QBDesktopConnectDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  organizationId,
}) => {
  const [step, setStep] = useState<'credentials' | 'download'>('credentials');
  const [formData, setFormData] = useState<CreateConnectionData>({
    organization_id: organizationId,
    company_file_name: '',
    username: '',
    password: '',
    sync_frequency_minutes: 15,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof CreateConnectionData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.company_file_name || !formData.username || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createQBDesktopConnection({
        ...formData,
        organization_id: organizationId,
      });

      setStep('download');
    } catch (err) {
      console.error('Failed to create QB Desktop connection:', err);
      setError(err instanceof Error ? err.message : 'Failed to create connection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadQWC = async () => {
    try {
      const qwcBlob = await generateQWCFile(organizationId);
      const url = URL.createObjectURL(qwcBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Qwohter-QuickBooks.qwc';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Move to success
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('Failed to download QWC file:', err);
      setError('Failed to generate configuration file');
    }
  };

  const handleClose = () => {
    setStep('credentials');
    setFormData({
      organization_id: organizationId,
      company_file_name: '',
      username: '',
      password: '',
      sync_frequency_minutes: 15,
    });
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img
              src="/integrations/quickbooks-desktop.svg"
              alt="QuickBooks Desktop"
              className="w-6 h-6"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            Connect QuickBooks Desktop
          </DialogTitle>
          <DialogDescription>
            Set up Web Connector to sync with QuickBooks Desktop
          </DialogDescription>
        </DialogHeader>

        {step === 'credentials' ? (
          <>
            <div className="space-y-4 py-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                <h4 className="font-medium mb-2">Before you begin:</h4>
                <ul className="space-y-2 ml-4 list-disc">
                  <li>Make sure QuickBooks Desktop is installed on your computer</li>
                  <li>
                    Install QuickBooks Web Connector (free from Intuit)
                    <div className="mt-1">
                      <a
                        href="https://quickbooks.intuit.com/learn-support/en-us/help-article/install-products/set-quickbooks-web-connector/L4Vp7VI44_US_en_US"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-700 hover:text-blue-800 underline font-medium"
                      >
                        Download Web Connector
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </li>
                  <li>Have your company file open in QuickBooks Desktop</li>
                </ul>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company_file_name">
                    Company File Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company_file_name"
                    value={formData.company_file_name}
                    onChange={(e) => handleInputChange('company_file_name', e.target.value)}
                    placeholder="e.g., MyCompany.qbw"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The name of your QuickBooks company file
                  </p>
                </div>

                <div>
                  <Label htmlFor="username">
                    Web Connector Username <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="Choose a username"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Create a username for Web Connector authentication
                  </p>
                </div>

                <div>
                  <Label htmlFor="password">
                    Web Connector Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Create a secure password"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This password will be used by Web Connector to authenticate
                  </p>
                </div>

                <div>
                  <Label htmlFor="sync_frequency">Sync Frequency (minutes)</Label>
                  <Input
                    id="sync_frequency"
                    type="number"
                    value={formData.sync_frequency_minutes}
                    onChange={(e) =>
                      handleInputChange('sync_frequency_minutes', parseInt(e.target.value) || 15)
                    }
                    min="5"
                    max="1440"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How often Web Connector should check for updates (5-1440 minutes)
                  </p>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Next: Download Config'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {/* Success Message */}
              <Alert className="bg-green-50 border-green-200 text-green-900">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Connection configured successfully! Now download the Web Connector file.
                </AlertDescription>
              </Alert>

              {/* Instructions */}
              <div className="space-y-3 text-sm">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Final Steps:
                </h4>
                <ol className="space-y-2 ml-4 list-decimal text-gray-600 dark:text-gray-400">
                  <li>Download the .QWC configuration file below</li>
                  <li><strong>Double-click</strong> the downloaded .QWC file to launch Web Connector</li>
                  <li>Enter your credentials:
                    <ul className="ml-4 mt-1 list-disc text-xs">
                      <li>Username: <code className="bg-gray-100 px-1 py-0.5 rounded">{formData.username}</code></li>
                      <li>Password: (the password you created above)</li>
                    </ul>
                  </li>
                  <li>In QuickBooks Desktop, click <strong>"Yes, always allow"</strong> when asked for permission</li>
                  <li>Web Connector will sync automatically every {formData.sync_frequency_minutes} minutes</li>
                </ol>

                <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  <strong>Need help?</strong>{' '}
                  <a
                    href="https://quickbooks.intuit.com/learn-support/en-us/help-article/install-products/set-quickbooks-web-connector/L4Vp7VI44_US_en_US"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    View Intuit's official setup guide
                  </a>
                </div>
              </div>

              {/* Download Button */}
              <div className="pt-4">
                <Button
                  onClick={handleDownloadQWC}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Web Connector File (.QWC)
                </Button>
              </div>

              {/* Help Text */}
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-xs text-gray-600 dark:text-gray-400">
                <p className="font-medium mb-1">Need help?</p>
                <p>
                  After downloading, you can find the Web Connector in your Windows Start Menu
                  under QuickBooks tools. If you encounter issues, make sure QuickBooks Desktop
                  is running and your company file is open.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
