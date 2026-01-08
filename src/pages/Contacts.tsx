/**
 * Contacts Page
 *
 * Standalone CRM page for managing customer/prospect contacts
 */

import { useState, useMemo } from 'react';
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
import { useContacts, useDeleteContact, useBulkDeleteContacts } from '@/hooks/useContacts';
import { useCurrentOrganization } from '@/hooks/queries';
import { useUser } from '@/auth';
import type { Contact } from '@/lib/types/contacts';

export default function ContactsPage() {
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id);
  const { data: contacts = [], isLoading } = useContacts(organization?.id);
  const deleteContact = useDeleteContact(organization?.id || '');
  const bulkDeleteContacts = useBulkDeleteContacts(organization?.id || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const [showContactDialog, setShowContactDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

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

  const handleBulkDelete = (contactIds: string[]) => {
    setBulkDeleteIds(contactIds);
  };

  const confirmDelete = async () => {
    if (deletingContactId) {
      await deleteContact.mutateAsync(deletingContactId);
      setDeletingContactId(null);
    }
  };

  const confirmBulkDelete = async () => {
    if (bulkDeleteIds.length > 0) {
      await bulkDeleteContacts.mutateAsync(bulkDeleteIds);
      setBulkDeleteIds([]);
    }
  };

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
      {/* Contacts Table with integrated search/toolbar */}
      <ContactsTable
        contacts={filteredContacts}
        onEdit={handleEditContact}
        onDelete={handleDeleteContact}
        onBulkDelete={handleBulkDelete}
        onAddContact={handleAddContact}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterChange={setFilterType}
        isLoading={isLoading}
        isDeletingBulk={bulkDeleteContacts.isPending}
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

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={bulkDeleteIds.length > 0}
        onOpenChange={(open) => !open && setBulkDeleteIds([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {bulkDeleteIds.length} Contact{bulkDeleteIds.length === 1 ? '' : 's'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {bulkDeleteIds.length} selected contact{bulkDeleteIds.length === 1 ? '' : 's'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkDeleteContacts.isPending}
            >
              {bulkDeleteContacts.isPending ? 'Deleting...' : `Delete ${bulkDeleteIds.length} Contact${bulkDeleteIds.length === 1 ? '' : 's'}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContent>
  );
}
