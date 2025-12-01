/**
 * Review Step Component
 * Displays extracted data for review and allows manual input
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, MapPin, DollarSign, Ruler, Calendar, FileText } from 'lucide-react';
import MapboxInput from '@/components/common/inputs/MapboxInput';
import type { ExtractedQuoteData, ImportQuoteStatus } from '@/lib/types/quoteImport';

interface ReviewStepProps {
  extractedData: ExtractedQuoteData;
  onUpdateExtracted: (data: Partial<ExtractedQuoteData>) => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  status: ImportQuoteStatus;
  onStatusChange: (status: ImportQuoteStatus) => void;
  proposalNumber: string;
  onProposalNumberChange: (value: string) => void;
  quoteDate: string;
  onQuoteDateChange: (value: string) => void;
}

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-gray-500" />
      <h4 className="font-medium text-gray-700">{title}</h4>
    </div>
  );
}

export function ReviewStep({
  extractedData,
  onUpdateExtracted,
  projectName,
  onProjectNameChange,
  status,
  onStatusChange,
  proposalNumber,
  onProposalNumberChange,
  quoteDate,
  onQuoteDateChange,
}: ReviewStepProps) {
  const updateClient = (field: keyof typeof extractedData.client, value: string) => {
    onUpdateExtracted({
      client: {
        ...extractedData.client,
        [field]: value || null,
      },
    });
  };

  const updateJob = (field: keyof typeof extractedData.job, value: string) => {
    onUpdateExtracted({
      job: {
        ...extractedData.job,
        [field]: value || null,
      },
    });
  };

  const updatePricing = (field: keyof typeof extractedData.pricing, value: string) => {
    const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
    onUpdateExtracted({
      pricing: {
        ...extractedData.pricing,
        [field]: isNaN(numValue) ? null : numValue,
      },
    });
  };

  const updateSpecifications = (field: keyof typeof extractedData.specifications, value: string) => {
    if (field === 'additionalSpecs') return;
    onUpdateExtracted({
      specifications: {
        ...extractedData.specifications,
        [field]: value || null,
      },
    });
  };

  const updateAdditionalSpec = (key: string, value: string) => {
    const newSpecs = { ...extractedData.specifications.additionalSpecs };
    if (value) {
      newSpecs[key] = value;
    } else {
      delete newSpecs[key];
    }
    onUpdateExtracted({
      specifications: {
        ...extractedData.specifications,
        additionalSpecs: newSpecs,
      },
    });
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null) return '';
    return value.toString();
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
      {/* Required: Project Name */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <Label htmlFor="projectName" className="text-orange-700 font-medium">
          Project Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="projectName"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder="Enter a name for this project"
          className="mt-2 border-orange-200 focus:border-orange-400"
        />
        <p className="text-xs text-orange-600 mt-1">
          This is required and will be used to identify the quote
        </p>
      </div>

      {/* Proposal Number, Date, Status */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="proposalNumber" className="text-xs text-gray-500">
            <FileText className="w-3 h-3 inline mr-1" />
            Proposal Number
          </Label>
          <Input
            id="proposalNumber"
            value={proposalNumber}
            onChange={(e) => onProposalNumberChange(e.target.value)}
            placeholder="e.g., Q-2024-001"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="quoteDate" className="text-xs text-gray-500">
            <Calendar className="w-3 h-3 inline mr-1" />
            Date
          </Label>
          <Input
            id="quoteDate"
            type="date"
            value={quoteDate}
            onChange={(e) => onQuoteDateChange(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Status</Label>
          <Select value={status} onValueChange={(v) => onStatusChange(v as ImportQuoteStatus)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Incomplete">Incomplete</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Won">Won</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Client Information */}
      <div>
        <SectionHeader icon={User} title="Client Information" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="clientName" className="text-xs text-gray-500">
              Client Name
            </Label>
            <Input
              id="clientName"
              value={extractedData.client.name || ''}
              onChange={(e) => updateClient('name', e.target.value)}
              placeholder="John Smith"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="clientCompany" className="text-xs text-gray-500">
              Company
            </Label>
            <Input
              id="clientCompany"
              value={extractedData.client.company || ''}
              onChange={(e) => updateClient('company', e.target.value)}
              placeholder="ABC Corp"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="clientEmail" className="text-xs text-gray-500">
              Email
            </Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="clientEmail"
                type="email"
                value={extractedData.client.email || ''}
                onChange={(e) => updateClient('email', e.target.value)}
                placeholder="email@example.com"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="clientPhone" className="text-xs text-gray-500">
              Phone
            </Label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="clientPhone"
                value={extractedData.client.phone || ''}
                onChange={(e) => updateClient('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className="pl-9"
              />
            </div>
          </div>
          <div className="col-span-2">
            <MapboxInput
              id="clientAddress"
              label="Address"
              value={extractedData.client.address || ''}
              onChange={(value) => updateClient('address', value)}
              placeholder="123 Main Street, City, State ZIP"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Job Location */}
      <div>
        <SectionHeader icon={MapPin} title="Job Location" />
        <MapboxInput
          id="jobLocation"
          label="Job Site Address"
          value={extractedData.job.location || ''}
          onChange={(value) => updateJob('location', value)}
          placeholder="Job site address (if different from client address)"
        />
      </div>

      <Separator />

      {/* Pricing - Only Total */}
      <div>
        <SectionHeader icon={DollarSign} title="Pricing" />
        <div className="max-w-xs">
          <Label htmlFor="total" className="text-xs text-gray-500">
            Total Amount
          </Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <Input
              id="total"
              value={formatCurrency(extractedData.pricing.total)}
              onChange={(e) => updatePricing('total', e.target.value)}
              placeholder="0.00"
              className="pl-7"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Specifications */}
      <div>
        <SectionHeader icon={Ruler} title="Specifications" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="productType" className="text-xs text-gray-500">
              Product/Service Type
            </Label>
            <Input
              id="productType"
              value={extractedData.specifications.productType || ''}
              onChange={(e) => updateSpecifications('productType', e.target.value)}
              placeholder="e.g., Office furniture, Wall partition"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="specMaterials" className="text-xs text-gray-500">
              Materials
            </Label>
            <Input
              id="specMaterials"
              value={extractedData.specifications.materials || ''}
              onChange={(e) => updateSpecifications('materials', e.target.value)}
              placeholder="e.g., Oak hardwood, Glass"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="dimensions" className="text-xs text-gray-500">
              Dimensions/Area
            </Label>
            <Input
              id="dimensions"
              value={extractedData.specifications.dimensions || ''}
              onChange={(e) => updateSpecifications('dimensions', e.target.value)}
              placeholder="e.g., 10ft x 25ft, 500 sq ft"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="quantity" className="text-xs text-gray-500">
              Quantity
            </Label>
            <Input
              id="quantity"
              value={extractedData.specifications.quantity || ''}
              onChange={(e) => updateSpecifications('quantity', e.target.value)}
              placeholder="e.g., 15 units, 3 rooms"
              className="mt-1"
            />
          </div>
        </div>

        {/* Additional Specs as editable inputs */}
        {extractedData.specifications.additionalSpecs &&
          Object.keys(extractedData.specifications.additionalSpecs).length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {Object.entries(extractedData.specifications.additionalSpecs).map(([key, value]) => (
              <div key={key}>
                <Label htmlFor={`spec-${key}`} className="text-xs text-gray-500 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Label>
                <Input
                  id={`spec-${key}`}
                  value={value}
                  onChange={(e) => updateAdditionalSpec(key, e.target.value)}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
