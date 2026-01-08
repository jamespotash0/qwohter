/**
 * ContactsTable Component
 *
 * Data table for displaying and managing contacts with sorting, filtering,
 * bulk selection, export, and actions - styled like EnhancedProposalsTable
 */

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Contact, CONTACT_TYPES } from '@/lib/types/contacts';
import { formatPhoneNumber } from '@/lib/utils/contactUtils';
import {
  Download,
  Filter,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

interface ContactsTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  onBulkDelete?: (contactIds: string[]) => void;
  onAddContact?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: string;
  onFilterChange: (type: string) => void;
  isLoading?: boolean;
  isDeletingBulk?: boolean;
}

export const ContactsTable = ({
  contacts,
  onEdit,
  onDelete,
  onBulkDelete,
  onAddContact,
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
  isLoading = false,
  isDeletingBulk = false,
}: ContactsTableProps) => {
  const [sortField, setSortField] = useState<keyof Contact>('full_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(new Set(contacts.map(c => c.id)));
    } else {
      setSelectedContacts(new Set());
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    const newSelected = new Set(selectedContacts);
    if (checked) {
      newSelected.add(contactId);
    } else {
      newSelected.delete(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const clearSelection = () => {
    setSelectedContacts(new Set());
  };

  const isAllSelected = contacts.length > 0 && selectedContacts.size === contacts.length;

  const handleSort = (field: keyof Contact) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Export selected contacts as CSV
  const handleExportSelected = () => {
    const selectedContactsList = contacts.filter(c => selectedContacts.has(c.id));
    exportContactsToCSV(selectedContactsList, 'contacts_selected');
  };

  // Export all contacts as CSV
  const handleExportAll = () => {
    exportContactsToCSV(contacts, 'contacts_all');
  };

  const exportContactsToCSV = (contactsList: Contact[], filename: string) => {
    if (contactsList.length === 0) return;

    const headers = ['Name', 'Email', 'Phone', 'Company', 'Type', 'Address', 'Notes'];
    const rows = contactsList.map(contact => [
      contact.full_name || '',
      (contact.emails || []).join('; '),
      (contact.phones || []).map(p => formatPhoneNumber(p)).join('; '),
      contact.company_name || '',
      contact.contact_type || '',
      contact.address || '',
      contact.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (onBulkDelete && selectedContacts.size > 0) {
      onBulkDelete(Array.from(selectedContacts));
      clearSelection();
    }
  };

  // Helper to get badge color based on contact type
  const getContactTypeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      'Lead': 'bg-blue-100 text-black border-blue-300',
      'Customer': 'bg-green-100 text-black border-green-300',
      'Vendor': 'bg-purple-100 text-black border-purple-300',
      'Partner': 'bg-orange-100 text-black border-orange-300',
      'Contractor': 'bg-cyan-100 text-black border-cyan-300',
      'Architect': 'bg-pink-100 text-black border-pink-300',
      'Designer': 'bg-rose-100 text-black border-rose-300',
      'Supplier': 'bg-indigo-100 text-black border-indigo-300',
      'Consultant': 'bg-yellow-100 text-black border-yellow-300',
      'Other': 'bg-gray-100 text-black border-gray-300',
    };
    return colorMap[type] || 'bg-gray-100 text-black border-gray-300';
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Helper to display array field with "+N" indicator
  const displayArrayField = (values: string[] | undefined, emptyText = '-') => {
    if (!values || values.length === 0) {
      return <span className="text-muted-foreground">{emptyText}</span>;
    }

    const primaryValue = values[0];
    const additionalCount = values.length - 1;

    if (additionalCount === 0) {
      return <span>{primaryValue}</span>;
    }

    return (
      <div className="flex items-center gap-2">
        <span>{primaryValue}</span>
        <HoverCard openDelay={200}>
          <HoverCardTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              +{additionalCount}
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto p-3" side="top">
            <div className="space-y-1">
              {values.slice(1).map((value, idx) => (
                <div key={idx} className="text-sm">
                  {value}
                </div>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    );
  };

  const hasActiveFilters = searchQuery !== '' || filterType !== 'all';

  return (
    <div className="border border-gray-200 bg-white dark:bg-[var(--content-card-bg)] dark:border-[var(--content-card-border)] shadow-sm rounded-lg overflow-hidden">
      {/* Combined Search and Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 py-4 px-4 bg-white dark:bg-[var(--content-card-bg)] border-b border-gray-200 dark:border-[var(--content-card-border)]">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 dark:border-[var(--input-border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--sidebar-icon-active)] dark:focus:ring-[var(--sidebar-icon-active)] focus:border-[var(--sidebar-icon-active)] dark:bg-[var(--input-bg)] dark:text-[var(--input-text)]"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 w-8 h-6 p-0 rounded-full"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Show selection actions OR normal toolbar buttons */}
        {selectedContacts.size > 0 ? (
          <>
            {/* Selection count and clear */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {selectedContacts.size} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-9 px-2 text-xs text-blue-600 hover:text-blue-800"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>

            {/* Export Selected */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSelected}
              className="h-9"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            {/* Delete Selected */}
            {onBulkDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeletingBulk}
                className="h-9"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeletingBulk ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Type Filter */}
            <Select value={filterType} onValueChange={onFilterChange}>
              <SelectTrigger className="w-full md:w-[160px] h-9">
                <Filter className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CONTACT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export All */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              disabled={contacts.length === 0}
              className="h-9"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            {/* Add Contact */}
            {onAddContact && (
              <Button
                onClick={onAddContact}
                size="sm"
                className="h-9 bg-[#EE6C4D] hover:bg-[#d85d3f] text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            )}
          </>
        )}
      </div>

      {/* Table Area */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          {hasActiveFilters ? (
            <>
              <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                No results found
              </p>
              <p className="text-sm text-gray-500 mb-5">
                No contacts match your search. Try a different term or filter.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  onSearchChange('');
                  onFilterChange('all');
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </>
          ) : (
            <>
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                No contacts yet
              </p>
              <p className="text-sm text-gray-500 mb-5">
                Add your first contact to get started.
              </p>
              {onAddContact && (
                <Button
                  onClick={onAddContact}
                  className="bg-[#EE6C4D] hover:bg-[#d85d3f] text-white"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Contact
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="h-9 bg-[#EE6C4D]/10 border-b border-[#EE6C4D]/20">
                <TableHead className="w-10 px-2 align-middle">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      aria-label="Select all contacts"
                      className="h-4 w-4 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 align-middle px-3 py-2"
                  onClick={() => handleSort('full_name')}
                >
                  Name {sortField === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="align-middle px-3 py-2">
                  Email
                </TableHead>
                <TableHead className="align-middle px-3 py-2">Phone</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 align-middle px-3 py-2"
                  onClick={() => handleSort('company_name')}
                >
                  Company {sortField === 'company_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 align-middle px-3 py-2"
                  onClick={() => handleSort('contact_type')}
                >
                  Type {sortField === 'contact_type' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-center align-middle px-2 py-2 w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className={`h-10 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 ${selectedContacts.has(contact.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                >
                  {/* Checkbox */}
                  <TableCell className="px-2 py-1.5 align-middle">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedContacts.has(contact.id)}
                        onChange={(e) => handleSelectContact(contact.id, e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${contact.full_name}`}
                        className="h-4 w-4 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  </TableCell>

                  {/* Name */}
                  <TableCell className="font-normal align-middle px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {contact.full_name}
                      {contact.is_in_organization && (
                        <UserCheck className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>

                  {/* Email */}
                  <TableCell className="align-middle px-3 py-1.5">
                    {displayArrayField(contact.emails)}
                  </TableCell>

                  {/* Phone */}
                  <TableCell className="align-middle px-3 py-1.5">
                    {contact.phones && contact.phones.length > 0
                      ? displayArrayField(contact.phones.map(p => formatPhoneNumber(p)))
                      : <span className="text-muted-foreground">-</span>
                    }
                  </TableCell>

                  {/* Company */}
                  <TableCell className="align-middle px-3 py-1.5">
                    {contact.company_name || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Type */}
                  <TableCell className="align-middle px-3 py-1.5">
                    {contact.contact_type ? (
                      <Badge
                        variant="outline"
                        className={`${getContactTypeColor(contact.contact_type)} text-xs px-1.5 py-0`}
                      >
                        {contact.contact_type}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center align-middle px-2 py-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center justify-center p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors cursor-pointer">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(contact)} className="text-sm">
                          <Pencil className="w-3.5 h-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(contact.id)}
                          className="text-red-600 text-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Footer with count */}
      {!isLoading && contacts.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-[var(--content-card-border)] text-sm text-gray-500">
          Showing {contacts.length} contact{contacts.length === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
};
