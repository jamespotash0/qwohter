import React, { useState } from 'react';
import { Mail, AlertTriangle, Edit2, RefreshCw, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface ProfileTabProps {
  user: SupabaseUser;
  profile: any;
  userRole: string;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ user, profile, userRole }) => {
  const [editedFullName, setEditedFullName] = useState(profile?.full_name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Email change dialog states
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Password reset dialog states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  // Delete account dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Update editedFullName when profile changes
  React.useEffect(() => {
    if (profile?.full_name && editedFullName !== profile.full_name) {
      setEditedFullName(profile.full_name);
    }
  }, [profile?.full_name]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const handleSaveName = async () => {
    setIsUpdatingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editedFullName })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Name Updated",
        description: "Your name has been updated successfully.",
      });

      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating name:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update name",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail || !currentPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingEmail(true);
    try {
      // Verify password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) throw new Error("Current password is incorrect.");

      // Update email
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      toast({
        title: "Email Update Initiated",
        description: "Check your new email address for a confirmation link.",
      });

      setShowEmailDialog(false);
      setNewEmail('');
      setCurrentPassword('');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update email",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;

    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setPasswordResetSent(true);
      toast({
        title: "Reset Link Sent",
        description: "Check your email for password reset instructions.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast({
        title: "Error",
        description: "Please type 'DELETE' to confirm.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="space-y-8">
        {/* Profile Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Profile</h2>
          <div className="h-px bg-gray-200 dark:bg-gray-700 mb-2"></div>

          <div className="space-y-1">
            {/* Full Name Section */}
            <div className="flex items-start justify-between py-4 px-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
          <div className="flex-1 pr-8">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Full name</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Your name as it appears on your profile
            </p>
          </div>
          <div className="flex items-center gap-3 min-w-[500px] justify-end">
            {isEditingName ? (
              <>
                <Input
                  value={editedFullName}
                  onChange={(e) => setEditedFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="flex-1 h-9 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={isUpdatingName}
                  className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  {isUpdatingName ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditedFullName(profile?.full_name || '');
                    setIsEditingName(false);
                  }}
                  className="h-9 px-4"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 text-right pr-3">
                  {profile?.full_name || <span className="text-gray-400 dark:text-gray-500">Not set</span>}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingName(true)}
                  className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>
          </div>
        </div>

        {/* Email Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Email</h2>
          <div className="h-px bg-gray-200 dark:bg-gray-700 mb-2"></div>

          <div className="space-y-1">
            {/* Email Address Section */}
            <div className="flex items-start justify-between py-4 px-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
          <div className="flex-1 pr-8">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Email address</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              The email address associated with your account
            </p>
          </div>
          <div className="flex items-center gap-3 min-w-[480px] justify-end">
            <div className="text-right flex-1 pr-3">
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium block">
                {user.email}
              </span>
              {!user.email_confirmed_at && (
                <span className="text-xs font-medium text-red-600 dark:text-red-400 mt-0.5 inline-block">Unverified</span>
              )}
            </div>
            <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Change Email Address</DialogTitle>
                  <DialogDescription className="pt-2 pb-2 leading-relaxed">
                    Enter your current password and new email address. You'll receive a confirmation link at the new address.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-email">New Email Address</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email address"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEmailDialog(false);
                      setNewEmail('');
                      setCurrentPassword('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEmailChange}
                    disabled={isUpdatingEmail || !newEmail || !currentPassword}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isUpdatingEmail ? 'Updating...' : 'Update Email'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
          </div>
        </div>

        {/* Password Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Password</h2>
          <div className="h-px bg-gray-200 dark:bg-gray-700 mb-2"></div>

          <div className="space-y-1">
            {/* Password Section */}
            <div className="flex items-start justify-between py-4 px-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
          <div className="flex-1 pr-8">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Password</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Set a unique password to protect your account
            </p>
          </div>
          <div className="flex items-center gap-3 min-w-[480px] justify-end">
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 px-4 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Change Password
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!passwordResetSent ? (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      You'll receive an email with instructions to reset your password.
                    </p>
                    <div>
                      <Label>Email Address</Label>
                      <Input
                        value={user.email || ''}
                        disabled
                        className="bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                  </>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Email sent successfully
                      </p>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Please check your inbox for password reset instructions.
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setPasswordResetSent(false);
                  }}
                >
                  {passwordResetSent ? 'Close' : 'Cancel'}
                </Button>
                {!passwordResetSent && (
                  <Button
                    onClick={handlePasswordReset}
                    disabled={isResettingPassword}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isResettingPassword ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

          </div>
        </div>

        {/* Delete Account Section - Only show for non-Owners */}
        {userRole !== 'Owner' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Danger Zone</h2>
            <div className="h-px bg-gray-200 dark:bg-gray-700 mb-2"></div>

            <div className="space-y-1">
            {userRole !== 'Owner' && (
              <div className="flex items-start justify-between py-4 px-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
            <div className="flex-1 pr-8">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">Delete Account</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Permanently delete your account and all associated data from Prodeel
              </p>
            </div>
            <div className="flex items-center gap-3 min-w-[480px] justify-end">
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 px-4 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Delete Account
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    Delete Account
                  </DialogTitle>
                  <DialogDescription>
                    This action will permanently delete your account and all associated data. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 dark:text-red-200 mb-2">What will be deleted:</h4>
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      <li>• Your profile and account information</li>
                      <li>• All quotes and projects you've created</li>
                      <li>• Your membership in organizations</li>
                      <li>• All associated files and uploads</li>
                    </ul>
                  </div>
                  <div>
                    <Label htmlFor="delete-confirm">Type 'DELETE' to confirm</Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE here"
                      className="mt-1"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteDialog(false);
                      setDeleteConfirmText('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
