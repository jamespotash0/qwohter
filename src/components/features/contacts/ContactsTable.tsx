/**
 * ContactsTable Component
 *
 * Data table for displaying and managing contacts with sorting, filtering, and actions
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Contact } from '@/lib/types/contacts';
import { formatPhoneNumber } from '@/lib/utils/contactUtils';
import { MoreHorizontal, Pencil, Trash2, UserCheck } from 'lucide-react';

interface ContactsTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  isLoading?: boolean;
}

export const ContactsTable = ({
  contacts,
  onEdit,
  onDelete,
  isLoading = false,
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

  const isAllSelected = contacts.length > 0 && selectedContacts.size === contacts.length;
  const isSomeSelected = selectedContacts.size > 0 && selectedContacts.size < contacts.length;

  const handleSort = (field: keyof Contact) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
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

  // Helper to display array field with "+N" indicator that shows all values on hover
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading contacts...</p>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground mb-2">No contacts found</p>
        <p className="text-sm text-muted-foreground">
          Add your first contact to get started
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="h-9">
            <TableHead className="w-10 px-2 align-middle">
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all contacts"
                  className="h-3.5 w-3.5"
                />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 align-middle px-3 py-2"
              onClick={() => handleSort('full_name')}
            >
              Name {sortField === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="align-middle px-3 py-2">
              Email
            </TableHead>
            <TableHead className="align-middle px-3 py-2">Phone</TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 align-middle px-3 py-2"
              onClick={() => handleSort('company_name')}
            >
              Company {sortField === 'company_name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 align-middle px-3 py-2"
              onClick={() => handleSort('contact_type')}
            >
              Type {sortField === 'contact_type' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="text-center align-middle px-2 py-2 w-16">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedContacts.map((contact) => (
            <TableRow key={contact.id} className="h-10">
              {/* Checkbox */}
              <TableCell className="px-2 py-1.5 align-middle">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={selectedContacts.has(contact.id)}
                    onCheckedChange={(checked) => handleSelectContact(contact.id, checked as boolean)}
                    aria-label={`Select ${contact.full_name}`}
                    className="h-3.5 w-3.5"
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
  );
};
