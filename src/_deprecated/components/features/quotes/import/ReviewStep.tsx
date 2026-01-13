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
import { User, Mail, Phone, MapPin, DollarSign, Ruler, Calendar, FileText, Package, ChevronDown, ChevronRight } from 'lucide-react';
import MapboxInput from '@/components/common/inputs/MapboxInput';
import type { ExtractedQuoteData, ImportQuoteStatus, ExtractedProductSpec } from '@/lib/types/proposalImport';
import { useState } from 'react';

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
  // Track expanded products
  const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});

  const toggleProductExpanded = (index: number) => {
    setExpandedProducts(prev => ({ ...prev, [index]: !prev[index] }));
  };

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

  const updateProduct = (index: number, updates: Partial<ExtractedProductSpec>) => {
    const newItems = [...extractedData.products.items];
    newItems[index] = { ...newItems[index], ...updates };
    onUpdateExtracted({
      products: { items: newItems },
    });
  };

  const updateProductSpec = (index: number, specKey: string, value: string) => {
    const product = extractedData.products.items[index];
    const newSpecs = { ...product.specifications, [specKey]: value || undefined };
    if (!value) delete newSpecs[specKey];
    updateProduct(index, { specifications: newSpecs });
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null) return '';
    return value.toString();
  };

  // Helper to format spec keys for display
  const formatSpecKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
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

      {/* Products Section - Only show if products were extracted */}
      {extractedData.products.items.length > 0 && (
        <>
          <Separator />
          <div>
            <SectionHeader icon={Package} title={`Products (${extractedData.products.items.length})`} />
            <div className="space-y-3">
              {extractedData.products.items.map((product, index) => {
                const isExpanded = expandedProducts[index] ?? true; // Default expanded
                const hasSpecs = Object.keys(product.specifications || {}).length > 0;
                const hasDimensions = product.dimensions && Object.values(product.dimensions).some(v => v);
                const hasComponents = product.components && Object.keys(product.components).length > 0;

                return (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {/* Product Header - Collapsible */}
                    <button
                      type="button"
                      onClick={() => toggleProductExpanded(index)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="font-medium text-gray-900">{product.name}</span>
                        {product.productType && (
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                            {product.productType}
                          </span>
                        )}
                      </div>
                      {product.quantity && (
                        <span className="text-sm text-gray-600">Qty: {product.quantity}</span>
                      )}
                    </button>

                    {/* Product Details - Expanded */}
                    {isExpanded && (
                      <div className="p-3 space-y-3 bg-white">
                        {/* Basic Info Row */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs text-gray-500">Manufacturer</Label>
                            <Input
                              value={product.manufacturer || ''}
                              onChange={(e) => updateProduct(index, { manufacturer: e.target.value || null })}
                              placeholder="Brand name"
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Model</Label>
                            <Input
                              value={product.model || ''}
                              onChange={(e) => updateProduct(index, { model: e.target.value || null })}
                              placeholder="Model #"
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Series</Label>
                            <Input
                              value={product.series || ''}
                              onChange={(e) => updateProduct(index, { series: e.target.value || null })}
                              placeholder="Series"
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                        </div>

                        {/* Dimensions - if present */}
                        {hasDimensions && product.dimensions && (
                          <div>
                            <Label className="text-xs text-gray-500 mb-1 block">Dimensions</Label>
                            <div className="grid grid-cols-4 gap-2">
                              {product.dimensions.height && (
                                <div className="text-xs">
                                  <span className="text-gray-400">H:</span> {product.dimensions.height}
                                </div>
                              )}
                              {product.dimensions.length && (
                                <div className="text-xs">
                                  <span className="text-gray-400">L:</span> {product.dimensions.length}
                                </div>
                              )}
                              {product.dimensions.width && (
                                <div className="text-xs">
                                  <span className="text-gray-400">W:</span> {product.dimensions.width}
                                </div>
                              )}
                              {product.dimensions.area && (
                                <div className="text-xs">
                                  <span className="text-gray-400">Area:</span> {product.dimensions.area}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Specifications - editable key-value pairs */}
                        {hasSpecs && (
                          <div>
                            <Label className="text-xs text-gray-500 mb-2 block">Specifications</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(product.specifications)
                                .filter(([key]) => !key.startsWith('//')) // Filter out comment keys
                                .map(([key, value]) => (
                                  <div key={key} className="flex items-center gap-2">
                                    <Label className="text-xs text-gray-400 w-24 truncate" title={formatSpecKey(key)}>
                                      {formatSpecKey(key)}:
                                    </Label>
                                    <Input
                                      value={String(value || '')}
                                      onChange={(e) => updateProductSpec(index, key, e.target.value)}
                                      className="h-7 text-xs flex-1"
                                    />
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Components - display nested structures */}
                        {hasComponents && product.components && (
                          <div>
                            <Label className="text-xs text-gray-500 mb-2 block">Components</Label>
                            <div className="bg-gray-50 rounded p-2 text-xs">
                              {Object.entries(product.components)
                                .filter(([key]) => !key.startsWith('//'))
                                .map(([key, value]) => (
                                  <div key={key} className="mb-1">
                                    <span className="font-medium text-gray-600">{formatSpecKey(key)}:</span>{' '}
                                    <span className="text-gray-700">
                                      {typeof value === 'object'
                                        ? Object.entries(value).map(([k, v]) => `${k}: ${v}`).join(', ')
                                        : String(value)
                                      }
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Product Notes */}
                        {product.notes && (
                          <div className="text-xs text-gray-500 italic">
                            Note: {product.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
