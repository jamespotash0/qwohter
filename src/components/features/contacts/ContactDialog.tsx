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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { CONTACT_TYPES, PHONE_TYPES } from '@/lib/types/contacts';
import { isValidEmail } from '@/lib/utils/contactUtils';
import {
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { parsePhoneNumberFromString, AsYouType } from 'libphonenumber-js';

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
    phones: [{ number: '', type: 'Mobile' }],
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
  const [showMore, setShowMore] = useState(false);

  const createContact = useCreateContact(organizationId);
  const updateContact = useUpdateContact();

  // Helper to validate phone number using libphonenumber-js
  const validatePhoneNumber = (phone: { number: string; type: string }): string | null => {
    const numberStr = phone.number.trim();

    // If empty, it's valid (optional field)
    if (!numberStr) {
      return null;
    }

    // Check if it starts with + (country code required)
    if (!numberStr.startsWith('+')) {
      return 'Phone number must start with country code (e.g., +1 for US/Canada)';
    }

    try {
      // Try to parse the phone number
      const phoneNumber = parsePhoneNumberFromString(numberStr);

      if (!phoneNumber) {
        return 'Unable to parse phone number. Please check the country code and format.';
      }

      if (!phoneNumber.isValid()) {
        const countryName = phoneNumber.country
          ? new Intl.DisplayNames(['en'], { type: 'region' }).of(phoneNumber.country)
          : 'the detected country';
        return `Invalid phone number format for ${countryName}. Please check the number.`;
      }

      return null;
    } catch (error) {
      return 'Invalid phone number format. Use international format: +[country code] [number]';
    }
  };

  // Helper to format phone number as user types
  const formatPhoneAsYouType = (value: string): string => {
    const formatter = new AsYouType();
    return formatter.input(value);
  };

  // Helper to get country name from phone number
  const getCountryFromPhone = (phoneNumber: string): { country: string; flag: string } | null => {
    try {
      const parsed = parsePhoneNumberFromString(phoneNumber);
      if (parsed && parsed.country) {
        // Get country name using Intl.DisplayNames
        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        const countryName = regionNames.of(parsed.country);

        // Get flag emoji (convert country code to flag emoji)
        const flag = parsed.country
          .toUpperCase()
          .replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));

        return { country: countryName || parsed.country, flag };
      }
      return null;
    } catch {
      return null;
    }
  };

  // Initialize form data when contact changes (edit mode)
  useEffect(() => {
    if (contact) {
      // Format phone numbers for display
      const formattedPhones = contact.phones && contact.phones.length > 0
        ? contact.phones.map(phone => {
            try {
              // Try to parse and format the stored phone number
              const parsed = parsePhoneNumberFromString(phone.number);
              return {
                number: parsed ? parsed.formatInternational() : phone.number,
                type: phone.type,
              };
            } catch {
              return phone;
            }
          })
        : [{ number: '', type: 'Mobile' }];

      setFormData({
        full_name: contact.full_name,
        emails: contact.emails.length > 0 ? contact.emails : [''],
        phones: formattedPhones,
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
      setFormData({
        full_name: '',
        emails: [''],
        phones: [{ number: '', type: 'Mobile' }],
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

    if (!formData.contact_type?.trim()) {
      newErrors.contact_type = 'Contact type is required';
    }

    if (!formData.company_name?.trim()) {
      newErrors.company_name = 'Company is required';
    }

    // Validate emails - at least one valid email required
    const validEmails = formData.emails.filter(email => email.trim() && isValidEmail(email));
    if (validEmails.length === 0) {
      newErrors.emails = 'At least one valid email is required';
    }

    // Validate phone numbers - at least one valid phone required
    const phoneValidationErrors: string[] = [];
    const validPhones = (formData.phones || []).filter(phone => phone.number.trim());

    if (validPhones.length === 0) {
      newErrors.phones = 'At least one phone number is required';
    } else {
      (formData.phones || []).forEach((phone) => {
        const error = validatePhoneNumber(phone);
        phoneValidationErrors.push(error || '');
      });

      setPhoneErrors(phoneValidationErrors);

      // Check if any phone has errors
      const hasPhoneErrors = phoneValidationErrors.some(error => error !== '');
      if (hasPhoneErrors) {
        newErrors.phones = 'Please fix phone number errors';
      }
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
      // Clean up arrays by removing empty values and convert to E.164 format
      const cleanedPhones = (formData.phones || [])
        .filter(phone => phone.number.trim())
        .map(phone => {
          try {
            // Try to parse and convert to E.164 format (e.g., +12019269883)
            const parsed = parsePhoneNumberFromString(phone.number);
            return {
              number: parsed?.number || phone.number, // E.164 format or original if parsing fails
              type: phone.type,
            };
          } catch {
            // If parsing fails, store as-is
            return {
              number: phone.number,
              type: phone.type,
            };
          }
        });

      const cleanedData: CreateContactInput = {
        ...formData,
        emails: formData.emails.filter(email => email.trim()),
        phones: cleanedPhones.length > 0 ? cleanedPhones : undefined,
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

  // Helper functions for managing array fields (emails and addresses)
  const handleArrayFieldChange = (
    field: 'emails' | 'addresses',
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

  const addArrayField = (field: 'emails' | 'addresses') => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), ''],
    }));
  };

  const removeArrayField = (field: 'emails' | 'addresses', index: number) => {
    setFormData((prev) => {
      const newArray = [...(prev[field] || [])];
      newArray.splice(index, 1);
      // Ensure at least one field remains for emails
      if (field === 'emails' && newArray.length === 0) {
        newArray.push('');
      }
      return { ...prev, [field]: newArray };
    });
  };

  // Phone-specific handler for single field
  const handlePhoneNumberChange = (index: number, value: string) => {
    // Use AsYouType to format as the user types
    const formatted = formatPhoneAsYouType(value);

    setFormData(prev => {
      const newPhones = [...(prev.phones || [])];
      const currentPhone = newPhones[index] || { number: '', type: 'Mobile' };
      newPhones[index] = { number: formatted, type: currentPhone.type };
      return { ...prev, phones: newPhones };
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

  const handlePhoneTypeChange = (index: number, value: string) => {
    setFormData(prev => {
      const newPhones = [...(prev.phones || [])];
      const currentPhone = newPhones[index] || { number: '', type: 'Mobile' };
      newPhones[index] = { number: currentPhone.number, type: value };
      return { ...prev, phones: newPhones };
    });
  };

  const addPhone = () => {
    setFormData(prev => ({
      ...prev,
      phones: [...(prev.phones || []), { number: '', type: 'Mobile' }]
    }));
    setPhoneErrors(prev => [...prev, '']);
  };

  const removePhone = (index: number) => {
    setFormData(prev => {
      const newPhones = [...(prev.phones || [])];
      newPhones.splice(index, 1);
      // Keep at least one phone field
      if (newPhones.length === 0) {
        newPhones.push({ number: '', type: 'Mobile' });
      }
      return { ...prev, phones: newPhones };
    });

    // Clear any error for this index
    setPhoneErrors(prev => {
      const newErrors = [...prev];
      newErrors.splice(index, 1);
      return newErrors;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the contact information below.'
              : 'Add a customer or prospect to your contact list.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Contact Type and Is In Organization */}
          <div className="grid grid-cols-2 gap-4">
            {/* Contact Type */}
            <div className="space-y-2">
              <Label htmlFor="contact_type">
                Contact Type <span className="text-red-500">*</span>
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
                    className={errors.contact_type ? 'border-red-500' : ''}
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
                  <SelectTrigger className={errors.contact_type ? 'border-red-500' : ''}>
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
              {errors.contact_type && (
                <p className="text-sm text-red-500">{errors.contact_type}</p>
              )}
            </div>

            {/* Is In Organization */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Is Contact in Organization?
              </Label>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="is_in_organization"
                    checked={formData.is_in_organization === true}
                    onChange={() => setFormData((prev) => ({ ...prev, is_in_organization: true }))}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="is_in_organization"
                    checked={formData.is_in_organization === false}
                    onChange={() => setFormData((prev) => ({ ...prev, is_in_organization: false }))}
                    className="w-4 h-4 text-blue-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">No</span>
                </label>
              </div>
            </div>
          </div>

          {/* Row 2: Full Name and Company */}
          <div className="grid grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">
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

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="company_name">
                Company <span className="text-red-500">*</span>
              </Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="Acme Corp"
                className={errors.company_name ? 'border-red-500' : ''}
                required
              />
              {errors.company_name && (
                <p className="text-sm text-red-500">{errors.company_name}</p>
              )}
            </div>
          </div>

          {/* Row 3: Phone and Email on same line */}
          <div className="grid grid-cols-5 gap-4">
            {/* Phone Numbers - 3 columns (60%) */}
            <div className="col-span-3 space-y-2">
              {(formData.phones || []).map((phone, index) => {
                const countryInfo = phone.number ? getCountryFromPhone(phone.number) : null;

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Label htmlFor={`phone_${index}`} className="font-semibold">
                          Phone #{index + 1} {index === 0 && <span className="text-red-500">*</span>}
                        </Label>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center cursor-help">
                                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" align="start" className="max-w-xs">
                              <p className="text-sm font-semibold mb-2">Phone Number Format</p>
                              <p className="text-xs mb-2">
                                Enter phone number starting with <strong>+</strong> followed by the country code and number.
                              </p>
                              <p className="text-xs font-medium mb-1">Examples:</p>
                              <p className="text-xs space-y-1">
                                <span className="block">• +1 (201) 555-0400 (US/Canada)</span>
                                <span className="block">• +44 20 1234 5678 (UK)</span>
                                <span className="block">• +52 55 1234 5678 (Mexico)</span>
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {index === (formData.phones || []).length - 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={addPhone}
                          className="h-6 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          id={`phone_${index}`}
                          type="tel"
                          value={phone.number}
                          onChange={(e) => handlePhoneNumberChange(index, e.target.value)}
                          placeholder="+1 (201) 555-0400"
                          className={`${phoneErrors[index] ? 'border-red-500' : ''} ${countryInfo ? 'pr-32' : ''}`}
                        />
                        {countryInfo && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground bg-background px-2 py-1 rounded pointer-events-none">
                            <span className="text-base">{countryInfo.flag}</span>
                            <span className="hidden sm:inline">{countryInfo.country}</span>
                          </div>
                        )}
                      </div>
                      <Select
                        value={phone.type}
                        onValueChange={(value) => handlePhoneTypeChange(index, value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PHONE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(formData.phones || []).length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removePhone(index)}
                          className="shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {phoneErrors[index] && (
                      <p className="text-sm text-red-500">{phoneErrors[index]}</p>
                    )}
                  </div>
                );
              })}
              {errors.phones && (
                <p className="text-sm text-red-500">{errors.phones}</p>
              )}
            </div>

            {/* Email Addresses - 2 columns (40%) */}
            <div className="col-span-2 space-y-2">
              {formData.emails.map((email, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`email_${index}`} className="font-semibold">
                      Email #{index + 1} {index === 0 && <span className="text-red-500">*</span>}
                    </Label>
                    {index === formData.emails.length - 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addArrayField('emails')}
                        className="h-6 text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id={`email_${index}`}
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
                </div>
              ))}
              {errors.emails && (
                <p className="text-sm text-red-500">{errors.emails}</p>
              )}
            </div>
          </div>

          {/* Show More/Less Button */}
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowMore(!showMore)}
              className="text-sm font-medium"
            >
              {showMore ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Show More
                </>
              )}
            </Button>
          </div>

          {/* Expanded Section: Address and Notes */}
          {showMore && (
            <div className="space-y-4 pt-2 border-t">
              {/* Address(es) */}
              <div className="space-y-2">
                {formData.addresses?.map((address, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`address_${index}`} className="font-semibold">
                        Address #{index + 1}
                      </Label>
                      {index === (formData.addresses?.length || 1) - 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addArrayField('addresses')}
                          className="h-6 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Address
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <MapboxInput
                          label=""
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
                          className="shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Additional notes about this contact..."
                  rows={3}
                />
              </div>
            </div>
          )}

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
