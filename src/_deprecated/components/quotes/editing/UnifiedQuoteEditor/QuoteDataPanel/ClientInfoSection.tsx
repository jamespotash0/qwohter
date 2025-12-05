import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';
import MapboxInput from '@/components/common/inputs/MapboxInput';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';

interface ClientInfoSectionProps {
  data: QuoteData;
  isOpen: boolean;
  onToggle: () => void;
  onFieldChange: FieldChangeHandler;
  onChange: (section: string, value: any) => void;
}

export const ClientInfoSection: React.FC<ClientInfoSectionProps> = ({
  data,
  isOpen,
  onToggle,
  onFieldChange,
  onChange
}) => (
  <CollapsibleSection
    title="Client Info"
    icon={<User className="w-4 h-4 text-purple-500" />}
    isOpen={isOpen}
    onToggle={onToggle}
  >
    <div className="space-y-3">
      <div>
        <Label htmlFor="proposalNumber" className="text-xs font-medium text-gray-600">
          Proposal Number
        </Label>
        <Input
          id="proposalNumber"
          value={data.proposal_number || ''}
          onChange={(e) => onChange('proposal_number', e.target.value)}
          placeholder="Q-2024-001"
          className="text-sm"
        />
      </div>
      
      <div>
        <Label htmlFor="projectName" className="text-xs font-medium text-gray-600">
          Project Name
        </Label>
        <Input
          id="projectName"
          value={data.project_name || ''}
          onChange={(e) => onChange('project_name', e.target.value)}
          placeholder="Project Name"
          className="text-sm"
        />
      </div>

      <div>
        <Label htmlFor="clientName" className="text-xs font-medium text-gray-600">
          Client Name
        </Label>
        <Input
          id="clientName"
          value={data.job_details?.client_name || ''}
          onChange={(e) => onFieldChange('job_details', 'client_name', e.target.value)}
          placeholder="Client Name"
          className="text-sm"
        />
      </div>
      
      <div>
        <Label htmlFor="clientCompany" className="text-xs font-medium text-gray-600">
          Client Company
        </Label>
        <Input
          id="clientCompany"
          value={data.job_details?.client_company || ''}
          onChange={(e) => onFieldChange('job_details', 'client_company', e.target.value)}
          placeholder="Company Name"
          className="text-sm"
        />
      </div>
      
      <div>
        <MapboxInput
          label="Client Address"
          id="clientAddress"
          value={data.job_details?.client_address || ''}
          onChange={(value) => onFieldChange('job_details', 'client_address', value)}
          placeholder="Client address..."
          required
        />
      </div>
      <div>
        <MapboxInput
          label="Job Location"
          id="jobLocation"
          value={data.job_details?.job_location || ''}
          onChange={(value) => onFieldChange('job_details', 'job_location', value)}
          placeholder="Project location"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="projectDate" className="text-xs font-medium text-gray-600">
          Date
        </Label>
        <Input
          id="projectDate"
          type="date"
          value={data.job_details?.date || ''}
          onChange={(e) => onFieldChange('job_details', 'date', e.target.value)}
          className="text-sm"
        />
      </div>
    </div>
  </CollapsibleSection>
);