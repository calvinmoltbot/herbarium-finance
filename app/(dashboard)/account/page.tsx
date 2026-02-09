'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PageLayout, PageSection, PageCard } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Calendar, Shield, Database, Settings } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ChangePasswordDialog } from '@/components/account/change-password-dialog';

export default function AccountPage() {
  const { user } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  if (!user) {
    return (
      <PageLayout
        title="My Account"
        description="Manage your account settings and preferences"
        icon={User}
      >
        <PageCard>
          <p className="text-center text-muted-foreground">Please log in to view your account information.</p>
        </PageCard>
      </PageLayout>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].charAt(1)?.toUpperCase() || '';
  };

  return (
    <PageLayout
      title="My Account"
      description="Manage your account settings and preferences"
      icon={User}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <PageSection
          title="Profile Information"
          description="Your account details and profile information"
          icon={User}
        >
          <PageCard>
            {/* Avatar Section */}
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={user.user_metadata?.avatar_url || ""}
                  alt="Profile picture"
                />
                <AvatarFallback className="text-lg">
                  {getInitials(user.email || '')}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                </h3>
                <p className="text-sm text-muted-foreground">HDW Finance User</p>
                <Badge variant={user.email_confirmed_at ? 'default' : 'destructive'} className="text-xs">
                  {user.email_confirmed_at ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
            </div>

            <div className="border-t border-border pt-6"></div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-muted border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Email address cannot be changed. Contact support if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-id" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Database className="h-4 w-4" />
                  User ID
                </Label>
                <Input
                  id="user-id"
                  value={user.id}
                  disabled
                  className="bg-muted border-border font-mono text-xs"
                />
              </div>
            </div>
          </PageCard>
        </PageSection>

        {/* Account Security */}
        <PageSection
          title="Account Security"
          description="Security information and account status"
          icon={Shield}
        >
          <PageCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Email Verification</p>
                  <p className="text-sm text-muted-foreground">
                    {user.email_confirmed_at ? 'Your email is verified' : 'Email not verified'}
                  </p>
                </div>
                <Badge variant={user.email_confirmed_at ? 'default' : 'destructive'}>
                  {user.email_confirmed_at ? 'Verified' : 'Unverified'}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Additional security for your account
                  </p>
                </div>
                <Badge variant="outline">
                  Not Configured
                </Badge>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Account Created
                  </Label>
                  <p className="text-sm text-foreground">
                    {formatDate(user.created_at)}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Last Sign In
                  </Label>
                  <p className="text-sm text-foreground">
                    {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </PageCard>
        </PageSection>
      </div>

      {/* Account Actions */}
      <PageSection
        title="Account Actions"
        description="Manage your account settings and preferences"
        icon={Settings}
      >
        <PageCard>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>
              Change Password
            </Button>
            <Button variant="outline" onClick={() => toast.info('Profile editing coming soon')}>
              Edit Profile
            </Button>
            <Link href="/account/backups">
              <Button variant="outline" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Backup Management
              </Button>
            </Link>
            <Button variant="outline" onClick={() => toast.info('Export functionality coming soon')}>
              Export Data
            </Button>
          </div>
        </PageCard>
      </PageSection>

      {/* Change Password Dialog */}
      <ChangePasswordDialog 
        open={changePasswordOpen} 
        onOpenChange={setChangePasswordOpen} 
      />
    </PageLayout>
  );
}
