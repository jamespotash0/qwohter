import React, { useState, useMemo } from 'react';
import { User, Mail, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  // Initialize with profile value immediately to prevent flash of empty field
  const [editedFullName, setEditedFullName] = useState(profile?.full_name || '');
  const [isUpdating, setIsUpdating] = useState(false);

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

  // Update editedFullName when profile changes (must be before early return)
  React.useEffect(() => {
    if (profile?.full_name && editedFullName !== profile.full_name) {
      setEditedFullName(profile.full_name);
    }
  }, [profile?.full_name]);

  // Debug: Log the user role
  console.log('ProfileTab userRole:', userRole);

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const getInitials = (fullName?: string, email?: string) => {
    if (fullName) {
      const nameParts = fullName.trim().split(' ');
      if (nameParts.length >= 2) {
        // First initial + Last initial
        return (nameParts[0]![0] + nameParts[nameParts.length - 1]![0]).toUpperCase();
      } else if (nameParts.length === 1) {
        // If only one name, use first two characters
        return nameParts[0]!.slice(0, 2).toUpperCase();
      }
    }
    // Fallback to email if no full name
    return email ? email.split('@')[0]!.slice(0, 2).toUpperCase() : '??';
  };


  const handleSaveProfile = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editedFullName
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });

      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedFullName(profile?.full_name || '');
    setIsEditingProfile(false);
  };

  const handleEmailChange = async () => {
    if (!newEmail) {
      toast({
        title: "Error",
        description: "Please enter a new email address.",
        variant: "destructive",
      });
      return;
    }

    if (!currentPassword) {
      toast({
        title: "Error",
        description: "Please enter your current password to verify your identity.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingEmail(true);
    try {
      // First verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect. Please try again.");
      }

      // If password is correct, proceed with email update
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
      console.error('Error updating email:', error);
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
    if (!user.email) {
      toast({
        title: "Error",
        description: "No email address found for password reset.",
        variant: "destructive",
      });
      return;
    }

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
      console.error('Error sending password reset:', error);
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
        description: "Please type 'DELETE' to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Delete user account
      const { error } = await supabase.auth.admin.deleteUser(user.id);

      if (error) throw error;

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Information */}
      <div className="pb-8 border-b border-[var(--content-card-border)]">
        <h2 className="text-lg font-semibold text-[var(--content-header-text)] mb-6 flex items-center gap-2">
          <User className="w-5 h-5" />
          Profile Information
        </h2>
        <div className="space-y-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-lg">
                {getInitials(profile?.full_name, user.email)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="space-y-4">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <div className="flex items-center gap-2">
                    {isEditingProfile ? (
                      <>
                        <Input
                          id="full-name"
                          value={editedFullName}
                          onChange={(e) => setEditedFullName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-96"
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveProfile}
                          disabled={isUpdating}
                          className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isUpdating ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="h-8 px-3 hover:bg-[var(--sidebar-nav-bg-hover)] hover:text-[var(--sidebar-nav-text-hover)]"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Input
                          id="full-name"
                          value={profile?.full_name || ''}
                          placeholder="No name set"
                          disabled
                          className="w-96 bg-gray-50"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditingProfile(true)}
                          className="h-8 px-3 hover:bg-[var(--sidebar-nav-bg-hover)] hover:text-[var(--sidebar-nav-text-hover)]"
                        >
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="email"
                      value={user.email || ''}
                      disabled
                      className="w-96 bg-gray-50"
                    />
                    <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 hover:bg-[var(--sidebar-nav-bg-hover)] hover:text-[var(--sidebar-nav-text-hover)]"
                        >
                          Change
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Change Email Address</DialogTitle>
                          <DialogDescription>
                            Enter your current password and new email address. You'll receive a confirmation link at the new address.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="current-email">Current Email</Label>
                            <Input
                              id="current-email"
                              value={user.email || ''}
                              disabled
                              className="bg-gray-50"
                            />
                          </div>
                          <div>
                            <Label htmlFor="current-password-email">Current Password</Label>
                            <Input
                              id="current-password-email"
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

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="password"
                      type="password"
                      value="••••••••"
                      disabled
                      className="w-96 bg-gray-50"
                    />
                    <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 hover:bg-[var(--sidebar-nav-bg-hover)] hover:text-[var(--sidebar-nav-text-hover)]"
                        >
                          Reset
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reset Password</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {!passwordResetSent ? (
                            <>
                              <p className="text-sm text-gray-600">
                                You'll receive an email with instructions and a secure link to reset your password.
                              </p>
                              <div>
                                <Label htmlFor="reset-email">Email Address</Label>
                                <Input
                                  id="reset-email"
                                  value={user.email || ''}
                                  disabled
                                  className="bg-gray-50"
                                />
                              </div>
                            </>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center space-x-2">
                                  <Mail className="w-5 h-5 text-green-600" />
                                  <p className="text-sm font-medium text-green-800">Email sent successfully</p>
                                </div>
                                <p className="text-sm text-green-700 mt-1">
                                  Please check your inbox and follow the instructions to reset your password.
                                </p>
                              </div>
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
                          {passwordResetSent && (
                            <Button
                              onClick={() => {
                                setPasswordResetSent(false);
                                handlePasswordReset();
                              }}
                              variant="outline"
                            >
                              Send Another Email
                            </Button>
                          )}
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone - Hidden for Owners */}
      {userRole !== 'Owner' && (
        <div className="pb-8">
          <h2 className="text-lg font-semibold text-red-600 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h2>
          <div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
              <div>
                <h4 className="font-medium text-red-900">Delete Account</h4>
                <p className="text-sm text-red-700 mt-1">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-red-600">Delete Account</DialogTitle>
                    <DialogDescription>
                      This action will permanently delete your account and all associated data.
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-900 mb-2">What will be deleted:</h4>
                      <ul className="text-sm text-red-700 space-y-1">
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
        </div>
      )}
    </div>
  );
};