/**
 * Contacts Page
 *
 * Standalone CRM page for managing customer/prospect contacts
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageContent } from '@/components/common/layout';
import { ContactsTable } from '@/components/features/contacts/ContactsTable';
import { ContactDialog } from '@/components/features/contacts/ContactDialog';
import { useContacts, useDeleteContact } from '@/hooks/useContacts';
import { useCurrentOrganization } from '@/hooks/queries';
import { useUser } from '@/auth';
import type { Contact } from '@/lib/types/contacts';
import { CONTACT_TYPES } from '@/lib/types/contacts';
import {
  UserPlus,
  Search,
  Filter,
  Download,
  X,
} from 'lucide-react';

export default function ContactsPage() {
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id);
  const { data: contacts = [], isLoading } = useContacts(organization?.id);
  const deleteContact = useDeleteContact(organization?.id || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const [showContactDialog, setShowContactDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

  // Filter and search contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Search filter (name, emails, company)
      const matchesSearch = searchQuery === '' ||
        contact.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.emails.some(email => email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (contact.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

      // Type filter
      const matchesType = filterType === 'all' || contact.contact_type === filterType;

      return matchesSearch && matchesType;
    });
  }, [contacts, searchQuery, filterType]);

  const handleAddContact = () => {
    setEditingContact(undefined);
    setShowContactDialog(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowContactDialog(true);
  };

  const handleDeleteContact = (contactId: string) => {
    setDeletingContactId(contactId);
  };

  const confirmDelete = async () => {
    if (deletingContactId) {
      await deleteContact.mutateAsync(deletingContactId);
      setDeletingContactId(null);
    }
  };

  const handleExportContacts = () => {
    if (filteredContacts.length === 0) return;

    // Create CSV content
    const headers = ['Name', 'Emails', 'Phones', 'Company', 'Type', 'Addresses', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredContacts.map(contact => [
        `"${contact.full_name}"`,
        `"${contact.emails.join('; ')}"`,
        `"${contact.phones?.join('; ') || ''}"`,
        `"${contact.company_name || ''}"`,
        `"${contact.contact_type || ''}"`,
        `"${contact.addresses?.join('; ') || ''}"`,
        `"${contact.notes || ''}"`,
      ].join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
  };

  const hasActiveFilters = searchQuery !== '' || filterType !== 'all';

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <PageContent
      title="Contacts"
      subtitle="Manage your customer and prospect contacts"
      showPageHeader={true}
    >
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CONTACT_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Export */}
          <Button
            variant="outline"
            onClick={handleExportContacts}
            disabled={filteredContacts.length === 0}
            className="w-full md:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          {/* Add Contact */}
          <Button
            onClick={handleAddContact}
            className="w-full md:w-auto bg-[#EE6C4D] hover:bg-[#d85d3f]"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Contacts Table */}
      <ContactsTable
        contacts={filteredContacts}
        onEdit={handleEditContact}
        onDelete={handleDeleteContact}
        isLoading={isLoading}
      />

      {/* Contact Dialog */}
      <ContactDialog
        open={showContactDialog}
        onOpenChange={setShowContactDialog}
        organizationId={organization.id}
        contact={editingContact}
        onSuccess={() => setEditingContact(undefined)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingContactId !== null}
        onOpenChange={(open) => !open && setDeletingContactId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContent>
  );
}
