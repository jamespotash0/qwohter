import React, { useState } from 'react';
import { User, Mail, Calendar, IdCard, Edit3, Save, X, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [editedFullName, setEditedFullName] = useState(profile?.full_name || '');
  const [isUpdating, setIsUpdating] = useState(false);

  // Email change dialog states
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Password change dialog states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSaveProfile = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editedFullName,
          updated_at: new Date().toISOString()
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

    setIsUpdatingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });

      if (error) throw error;

      toast({
        title: "Email Update Initiated",
        description: "Check your new email address for a confirmation link.",
      });

      setShowEmailDialog(false);
      setNewEmail('');
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

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully.",
      });

      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-lg">
                {getInitials(user.email || user.id)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isEditingProfile ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedFullName}
                        onChange={(e) => setEditedFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="text-xl font-semibold"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveProfile}
                        disabled={isUpdating}
                        className="h-8 w-8 p-0"
                      >
                        {isUpdating ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold">{profile?.full_name || user.email}</h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingProfile(true)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <Badge variant="outline" className="capitalize">
                    {userRole?.toLowerCase()}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <Input
                      id="email"
                      value={user.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-id">User ID</Label>
                  <div className="flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-gray-500" />
                    <Input
                      id="user-id"
                      value={user.id}
                      disabled
                      className="bg-gray-50 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account Created</Label>
              <p className="text-sm text-gray-600">
                {formatDate(user.created_at)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Last Sign In</Label>
              <p className="text-sm text-gray-600">
                {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Email Confirmed</Label>
              <p className="text-sm text-gray-600">
                {user.email_confirmed_at ? '✅ Verified' : '❌ Not verified'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Account Status</Label>
              <Badge variant={user.email_confirmed_at ? 'default' : 'secondary'}>
                {user.email_confirmed_at ? 'Active' : 'Pending Verification'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <Mail className="w-4 h-4 mr-2" />
                  Change Email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Email Address</DialogTitle>
                  <DialogDescription>
                    Enter your new email address. You'll receive a confirmation link at the new address.
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
                    <Label htmlFor="new-email">New Email Address</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email address"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEmailDialog(false);
                        setNewEmail('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEmailChange}
                      disabled={isUpdatingEmail || !newEmail}
                    >
                      {isUpdatingEmail ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : null}
                      Update Email
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <IdCard className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your current password and choose a new one.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPasswordDialog(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePasswordChange}
                      disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
                    >
                      {isUpdatingPassword ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : null}
                      Update Password
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="pt-4 border-t">
            <Button variant="destructive" size="sm">
              Delete Account
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};