/**
 * ContactDialog Component
 *
 * Modal dialog for creating and editing customer/prospect contacts
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MapboxInput from '@/components/common/inputs/MapboxInput';
import { useCreateContact, useUpdateContact } from '@/hooks/useContacts';
import type { Contact, CreateContactInput } from '@/lib/types/contacts';
import { CONTACT_TYPES } from '@/lib/types/contacts';
import { isValidEmail } from '@/lib/utils/contactUtils';
import {
  User,
  Mail,
  Phone,
  Building,
  FileText,
  Plus,
  X,
} from 'lucide-react';

interface ContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  contact?: Contact; // If provided, edit mode
  onSuccess?: (contact: Contact) => void;
}

export const ContactDialog = ({
  open,
  onOpenChange,
  organizationId,
  contact,
  onSuccess,
}: ContactDialogProps) => {
  const isEditMode = !!contact;

  const [formData, setFormData] = useState<CreateContactInput>({
    full_name: '',
    emails: [''],
    phones: [''],
    company_name: '',
    contact_type: '',
    addresses: [''],
    notes: '',
    is_in_organization: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateContactInput, string>>>({});
  const [phoneErrors, setPhoneErrors] = useState<string[]>([]);
  const [showCustomType, setShowCustomType] = useState(false);
  const [customType, setCustomType] = useState('');

  // Separate state for country codes and phone numbers
  const [countryCodes, setCountryCodes] = useState<string[]>(['']);
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(['']);

  const createContact = useCreateContact(organizationId);
  const updateContact = useUpdateContact();

  // Helper to parse phone number into country code and number
  const parsePhoneNumber = (phone: string): { countryCode: string; number: string } => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // Assume first 1-3 digits could be country code
    // Common patterns: +1 (US/Canada), +44 (UK), +91 (India), etc.
    if (digits.length > 10) {
      // If more than 10 digits, assume first 1-3 are country code
      const possibleCountryCode = digits.substring(0, digits.length - 10);
      return {
        countryCode: possibleCountryCode.slice(0, 3),
        number: digits.substring(digits.length - 10)
      };
    } else if (digits.length === 10) {
      // If exactly 10 digits, assume no country code (or default to empty)
      return {
        countryCode: '',
        number: digits
      };
    } else {
      // Less than 10 digits, put all in number
      return {
        countryCode: '',
        number: digits
      };
    }
  };

  // Helper to validate phone number
  const validatePhoneNumber = (countryCode: string, number: string): string | null => {
    const countryCodeDigits = countryCode.replace(/\D/g, '');
    const numberDigits = number.replace(/\D/g, '');

    // If both are empty, it's valid (optional field)
    if (!countryCodeDigits && !numberDigits) {
      return null;
    }

    // Check if country code is 1-3 digits if provided
    if (countryCodeDigits && (countryCodeDigits.length < 1 || countryCodeDigits.length > 3)) {
      return 'Country code must be 1-3 digits';
    }

    // Check if number has exactly 10 digits
    if (numberDigits && numberDigits.length !== 10) {
      return 'Phone number must be 10 digits';
    }

    // If one is filled, both must be filled
    if ((countryCodeDigits && !numberDigits) || (!countryCodeDigits && numberDigits)) {
      return 'Both country code and phone number are required';
    }

    return null;
  };

  // Initialize form data when contact changes (edit mode)
  useEffect(() => {
    if (contact) {
      // Parse phone numbers into country codes and numbers
      const parsedPhones = (contact.phones && contact.phones.length > 0
        ? contact.phones
        : ['']
      ).map(phone => parsePhoneNumber(phone));

      setCountryCodes(parsedPhones.map(p => p.countryCode));
      setPhoneNumbers(parsedPhones.map(p => p.number));

      setFormData({
        full_name: contact.full_name,
        emails: contact.emails.length > 0 ? contact.emails : [''],
        phones: contact.phones && contact.phones.length > 0 ? contact.phones : [''],
        company_name: contact.company_name || '',
        contact_type: contact.contact_type || '',
        addresses: contact.addresses && contact.addresses.length > 0 ? contact.addresses : [''],
        notes: contact.notes || '',
        is_in_organization: contact.is_in_organization || false,
      });

      // Check if custom type value needs to be shown
      if (contact.contact_type && !CONTACT_TYPES.includes(contact.contact_type as any)) {
        setShowCustomType(true);
        setCustomType(contact.contact_type);
      }
    } else {
      // Reset form for create mode
      setCountryCodes(['']);
      setPhoneNumbers(['']);
      setFormData({
        full_name: '',
        emails: [''],
        phones: [''],
        company_name: '',
        contact_type: '',
        addresses: [''],
        notes: '',
        is_in_organization: false,
      });
      setShowCustomType(false);
      setCustomType('');
    }
    setErrors({});
    setPhoneErrors([]);
  }, [contact, open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateContactInput, string>> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Name is required';
    }

    // Validate emails - at least one valid email required
    const validEmails = formData.emails.filter(email => email.trim() && isValidEmail(email));
    if (validEmails.length === 0) {
      newErrors.emails = 'At least one valid email is required';
    }

    // Validate phone numbers
    const phoneValidationErrors: string[] = [];
    countryCodes.forEach((countryCode, index) => {
      const phoneNumber = phoneNumbers[index] || '';
      const error = validatePhoneNumber(countryCode, phoneNumber);
      phoneValidationErrors.push(error || '');
    });

    setPhoneErrors(phoneValidationErrors);

    // Check if any phone has errors
    const hasPhoneErrors = phoneValidationErrors.some(error => error !== '');
    if (hasPhoneErrors) {
      newErrors.phones = 'Please fix phone number errors';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Combine country codes and phone numbers into full phone numbers
      const fullPhones = countryCodes
        .map((countryCode, index) => {
          const phoneNumber = phoneNumbers[index] || '';
          const countryCodeDigits = countryCode.replace(/\D/g, '');
          const phoneDigits = phoneNumber.replace(/\D/g, '');

          // Only include if both country code and number are complete
          if (countryCodeDigits.length >= 1 && countryCodeDigits.length <= 3 && phoneDigits.length === 10) {
            return `${countryCodeDigits}${phoneDigits}`;
          }
          return '';
        })
        .filter(phone => phone !== '');

      // Clean up arrays by removing empty values
      const cleanedData: CreateContactInput = {
        ...formData,
        emails: formData.emails.filter(email => email.trim()),
        phones: fullPhones,
        addresses: formData.addresses?.filter(address => address.trim()),
      };

      if (isEditMode) {
        const updatedContact = await updateContact.mutateAsync({
          contactId: contact.id,
          input: cleanedData,
        });
        onSuccess?.(updatedContact);
      } else {
        const newContact = await createContact.mutateAsync(cleanedData);
        onSuccess?.(newContact);
      }

      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hooks
      console.error('Failed to save contact:', error);
    }
  };

  const handleChange = (field: keyof CreateContactInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleTypeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomType(true);
      setCustomType('');
      handleChange('contact_type', '');
    } else {
      setShowCustomType(false);
      handleChange('contact_type', value);
    }
  };

  // Helper functions for managing array fields
  const handleArrayFieldChange = (
    field: 'emails' | 'phones' | 'addresses',
    index: number,
    value: string
  ) => {
    setFormData((prev) => {
      const newArray = [...(prev[field] || [])];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const addArrayField = (field: 'emails' | 'phones' | 'addresses') => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), ''],
    }));
  };

  const removeArrayField = (field: 'emails' | 'phones' | 'addresses', index: number) => {
    if (field === 'phones') {
      // Handle phone removal by removing from both country codes and phone numbers
      setCountryCodes(prev => {
        const newArray = [...prev];
        newArray.splice(index, 1);
        if (newArray.length === 0) {
          newArray.push('');
        }
        return newArray;
      });
      setPhoneNumbers(prev => {
        const newArray = [...prev];
        newArray.splice(index, 1);
        if (newArray.length === 0) {
          newArray.push('');
        }
        return newArray;
      });
      // Clear any error for this index
      setPhoneErrors(prev => {
        const newErrors = [...prev];
        newErrors.splice(index, 1);
        return newErrors;
      });
    } else {
      setFormData((prev) => {
        const newArray = [...(prev[field] || [])];
        newArray.splice(index, 1);
        // Ensure at least one field remains for emails
        if (field === 'emails' && newArray.length === 0) {
          newArray.push('');
        }
        return { ...prev, [field]: newArray };
      });
    }
  };

  // Handler for country code changes
  const handleCountryCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');
    // Limit to 3 digits
    const limited = digitsOnly.slice(0, 3);

    setCountryCodes(prev => {
      const newArray = [...prev];
      newArray[index] = limited;
      return newArray;
    });

    // Clear error when user types
    if (phoneErrors[index]) {
      setPhoneErrors(prev => {
        const newErrors = [...prev];
        newErrors[index] = '';
        return newErrors;
      });
    }
  };

  // Handler for phone number changes
  const handlePhoneNumberChange = (index: number, value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');
    // Limit to 10 digits
    const limited = digitsOnly.slice(0, 10);

    setPhoneNumbers(prev => {
      const newArray = [...prev];
      newArray[index] = limited;
      return newArray;
    });

    // Clear error when user types
    if (phoneErrors[index]) {
      setPhoneErrors(prev => {
        const newErrors = [...prev];
        newErrors[index] = '';
        return newErrors;
      });
    }
  };

  // Handler for adding phone field
  const addPhoneField = () => {
    setCountryCodes(prev => [...prev, '']);
    setPhoneNumbers(prev => [...prev, '']);
    setPhoneErrors(prev => [...prev, '']);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the contact information below.'
              : 'Add a customer or prospect to your contact list.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              placeholder="John Doe"
              className={errors.full_name ? 'border-red-500' : ''}
              required
            />
            {errors.full_name && (
              <p className="text-sm text-red-500">{errors.full_name}</p>
            )}
          </div>

          {/* Email(s) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email(s) <span className="text-red-500">*</span>
            </Label>
            {formData.emails.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => handleArrayFieldChange('emails', index, e.target.value)}
                  placeholder="john@example.com"
                  className={errors.emails ? 'border-red-500' : ''}
                />
                {formData.emails.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeArrayField('emails', index)}
                    className="shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addArrayField('emails')}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Email
            </Button>
            {errors.emails && (
              <p className="text-sm text-red-500">{errors.emails}</p>
            )}
          </div>

          {/* Is In Organization */}
          <div className="space-y-2 py-4">
            <Label className="text-sm font-medium">
              Is Contact in Organization?
            </Label>
            {contact?.user_id && (
              <p className="text-xs text-muted-foreground">
                This contact is a team member and is automatically in the organization.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.is_in_organization ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData((prev) => ({ ...prev, is_in_organization: true }))}
                className="flex-1"
                disabled={!!contact?.user_id}
              >
                Yes
              </Button>
              <Button
                type="button"
                variant={!formData.is_in_organization ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData((prev) => ({ ...prev, is_in_organization: false }))}
                className="flex-1"
                disabled={!!contact?.user_id}
              >
                No
              </Button>
            </div>
          </div>

          {/* Phone(s) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone(s)
            </Label>
            {countryCodes.map((countryCode, index) => (
              <div key={index} className="space-y-1">
                <div className="flex gap-2">
                  <div className="w-24">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">+</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={countryCode}
                        onChange={(e) => handleCountryCodeChange(index, e.target.value)}
                        placeholder="1"
                        maxLength={3}
                        className={`pl-6 ${phoneErrors[index] ? 'border-red-500' : ''}`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Country code</p>
                  </div>
                  <div className="flex-1 flex gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={phoneNumbers[index] || ''}
                      onChange={(e) => handlePhoneNumberChange(index, e.target.value)}
                      placeholder="5551234567"
                      maxLength={10}
                      className={phoneErrors[index] ? 'border-red-500' : ''}
                    />
                    {countryCodes.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeArrayField('phones', index)}
                        className="shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {phoneErrors[index] && (
                  <p className="text-sm text-red-500">{phoneErrors[index]}</p>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPhoneField}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Phone
            </Button>
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company_name" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Company
            </Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              placeholder="Acme Corp"
            />
          </div>

          {/* Contact Type */}
          <div className="space-y-2">
            <Label htmlFor="contact_type" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Contact Type
            </Label>
            {showCustomType ? (
              <div className="space-y-2">
                <Input
                  value={customType}
                  onChange={(e) => {
                    setCustomType(e.target.value);
                    handleChange('contact_type', e.target.value);
                  }}
                  placeholder="Enter custom type"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomType(false);
                    setCustomType('');
                    handleChange('contact_type', '');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ← Back to dropdown
                </button>
              </div>
            ) : (
              <Select
                value={formData.contact_type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Custom type...
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Address(es) */}
          <div className="space-y-2">
            {formData.addresses?.map((address, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <MapboxInput
                    label={index === 0 ? "Address(es)" : ""}
                    value={address}
                    onChange={(value) => handleArrayFieldChange('addresses', index, value)}
                    placeholder="123 Main St, City, State ZIP"
                    id={`address_${index}`}
                    className="w-full"
                  />
                </div>
                {(formData.addresses?.length || 0) > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeArrayField('addresses', index)}
                    className="shrink-0 mt-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addArrayField('addresses')}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes about this contact..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createContact.isPending || updateContact.isPending}
            >
              {createContact.isPending || updateContact.isPending
                ? 'Saving...'
                : isEditMode
                ? 'Update Contact'
                : 'Add Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
