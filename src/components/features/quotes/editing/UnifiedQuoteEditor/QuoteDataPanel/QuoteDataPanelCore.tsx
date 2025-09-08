import React, { useState, useCallback, useEffect } from 'react';
import { QuoteDataPanelProps, SectionState } from './types';
import { ContactInfoSection } from './ContactInfoSection';
import { ClientInfoSection } from './ClientInfoSection';
import { WallSystemsSection } from './WallSystemsSection';
import { PocketDoorsSection } from './PocketDoorsSection';
import { MountingTrackSection } from './MountingTrackSection';
import { LaborDeliverySection } from './LaborDeliverySection';
import { PricingSection } from './PricingSection';

export const QuoteDataPanelCore: React.FC<QuoteDataPanelProps> = ({
  data,
  onChange,
  className = '',
  onDatabaseSave,
  onUpdateWallSystem,
  onRemoveWallSystem
}) => {
  const [openSections, setOpenSections] = useState<SectionState>({
    contactInfo: false,
    clientInfo: false,
    wallSystems: false,
    pocketDoors: false,
    mountingTrack: false,
    laborDelivery: false,
    pricing: false
  });

  const toggleSection = useCallback((section: keyof SectionState) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const handleFieldChange = useCallback((section: string, field: string, value: any) => {
    const updatedSection = {
      ...data[section as keyof typeof data],
      [field]: value
    };
    onChange(section, updatedSection);
  }, [data, onChange]);

  // Note: Total price calculation is now handled by the EnhancedPricingForm
  // Legacy simple calculation removed in favor of enhanced pricing system

  return (
    <div className={`space-y-4 pb-6 ${className}`}>
      <ContactInfoSection
        data={data}
        isOpen={openSections.contactInfo}
        onToggle={() => toggleSection('contactInfo')}
        onFieldChange={handleFieldChange}
      />

      <ClientInfoSection
        data={data}
        isOpen={openSections.clientInfo}
        onToggle={() => toggleSection('clientInfo')}
        onFieldChange={handleFieldChange}
        onChange={onChange}
      />

      <WallSystemsSection
        data={data}
        isOpen={openSections.wallSystems}
        onToggle={() => toggleSection('wallSystems')}
        onChange={onChange}
        onDatabaseSave={onDatabaseSave}
        onUpdateWallSystem={onUpdateWallSystem}
        onRemoveWallSystem={onRemoveWallSystem}
      />

      <PocketDoorsSection
        data={data}
        isOpen={openSections.pocketDoors}
        onToggle={() => toggleSection('pocketDoors')}
        onFieldChange={handleFieldChange}
        onChange={onChange}
      />

      <MountingTrackSection
        data={data}
        isOpen={openSections.mountingTrack}
        onToggle={() => toggleSection('mountingTrack')}
        onFieldChange={handleFieldChange}
        onChange={onChange}
      />

      <LaborDeliverySection
        data={data}
        isOpen={openSections.laborDelivery}
        onToggle={() => toggleSection('laborDelivery')}
        onFieldChange={handleFieldChange}
      />

      <PricingSection
        data={data}
        isOpen={openSections.pricing}
        onToggle={() => toggleSection('pricing')}
        onFieldChange={handleFieldChange}
        onChange={onChange}
      />
    </div>
  );
};