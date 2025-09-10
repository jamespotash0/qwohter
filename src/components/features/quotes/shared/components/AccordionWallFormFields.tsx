import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, ChevronDown } from 'lucide-react';
import { WallSpecification } from '@/lib/types';
import { useAccordionWallForm } from '../hooks/useAccordionWallForm';
import { AccordionWallSpecification } from '@/lib/types/walls/accordion';

interface AccordionWallFormFieldsProps {
  wall: WallSpecification;
  wallName: string;
  onChange: (wallName: string, updates: Record<string, any>) => void;
  showFullFields?: boolean;
  layout?: 'creation' | 'edit';
}

export const AccordionWallFormFields: React.FC<AccordionWallFormFieldsProps> = ({
  wall,
  wallName,
  onChange,
  showFullFields = false,
  layout = 'creation'
}) => {
  const [optionsOpen, setOptionsOpen] = useState(false);
  
  // Cast to AccordionWallSpecification for type safety
  const accordionWall = wall as AccordionWallSpecification;

  const {
    selectedSeries,
    selectedModel,
    selectedSTCRating,
    selectedOperation,
    selectedPanelFace,
    selectedTopSeals,
    selectedBottomSeals,
    selectedOptions,
    selectedTrackSystemOption,
    selectedTrackMounting,
    seriesOptions,
    availableModels,
    availablePanelFaces,
    availableTopSeals,
    availableBottomSeals,
    availableOptions,
    trackMountingOptions,
    trackSystemOptions,
    finalClosureSystemOptions,
    handleFieldChange,
  } = useAccordionWallForm({ wall, wallName, onChange });

  // Ensure panelConfiguration is initialized with default value
  React.useEffect(() => {
    if (!accordionWall.panelConfiguration) {
      handleFieldChange("panelConfiguration", "Individual Partition");
    }
  }, [accordionWall.panelConfiguration, handleFieldChange]);

  // Parse selected options as array - handle JSON array or legacy comma-separated string
  const selectedOptionsArray = useMemo(() => {
    if (!selectedOptions) return [];
    
    // Try to parse as JSON array first
    try {
      const parsed = JSON.parse(selectedOptions);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // If parsing fails, fallback to comma splitting for legacy data
      return selectedOptions.split(',').map(s => s.trim()).filter(Boolean);
    }
    
    return [];
  }, [selectedOptions]);

  // Handle multi-select options
  const handleOptionSelect = (option: string) => {
    const currentOptions = selectedOptionsArray;
    const isSelected = currentOptions.includes(option);
    
    let newOptions: string[];
    if (isSelected) {
      newOptions = currentOptions.filter((item: string) => item !== option);
    } else {
      newOptions = [...currentOptions, option];
    }
    
    handleFieldChange('options', JSON.stringify(newOptions));
  };

  const removeOption = (optionToRemove: string) => {
    const newOptions = selectedOptionsArray.filter((option: string) => option !== optionToRemove);
    handleFieldChange('options', JSON.stringify(newOptions));
  };

  // Layout classes based on context
  const labelClass = layout === 'edit' ? 'text-sm font-medium' : 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';

  return (
    <div className="space-y-6">
      {/* Row 1: Panel Configuration, Series, Model */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="panelConfiguration" className={labelClass}>
            Panel Configuration <span className="text-red-500">*</span>
          </Label>
          <Select
            value={accordionWall.panelConfiguration || "Individual Partition"}
            onValueChange={(value) => handleFieldChange("panelConfiguration", value)}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !accordionWall.panelConfiguration
                ? 'border-red-500'          // missing value
                : 'border-green-500'        // has value
              }`}
            >
              <SelectValue placeholder="Select panel configuration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Individual Partition">Individual Partition</SelectItem>
              <SelectItem value="Paired Partition">Paired Partition</SelectItem>
              <SelectItem value="Multiple (Intersecting) Partitions">Multiple (Intersecting) Partitions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="series" className={labelClass}>
            Series <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedSeries}
            onValueChange={(value) => handleFieldChange("series", value)}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedSeries
                ? 'border-red-500'          // active
                : 'border-green-500'        // complete
              }`}
            >
              <SelectValue placeholder="Select series" />
            </SelectTrigger>
            <SelectContent>
              {seriesOptions.map((series) => (
                <SelectItem key={series} value={series}>
                  {series}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model" className={labelClass}>
            Model <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedModel}
            onValueChange={(value) => handleFieldChange("model", value)}
            disabled={!selectedSeries}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedModel
                ? 'border-red-500'          // active
                : 'border-green-500'        // complete
              }`}
            >
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: STC Rating, Operation */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="stcRating" className={labelClass}>
            STC Rating <span className="text-red-500">*</span>
          </Label>
          <Input
            id="stcRating"
            value={selectedSTCRating}
            readOnly
            placeholder="Auto-calculated from model"
            disabled={!selectedModel}
            className={`bg-gray-50 ${
              !selectedModel ? 'bg-gray-100 cursor-not-allowed' : ''
            } ${selectedSTCRating ? 'border-green-500' : 'border-red-500'}`}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="operation" className={labelClass}>
            Operation <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedOperation || ""}
            onValueChange={(value) => handleFieldChange('operation', value)}
            disabled={!selectedModel}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedModel ? 'bg-gray-100 cursor-not-allowed' : ''
              } ${
                selectedOperation
                ? 'border-green-500'
                : 'border-red-500'
              }`}
            >
              <SelectValue placeholder="Select operation type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Manual, Top Supported">Manual, Top Supported</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3: Panel Face, Options */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="panelFace" className={labelClass}>
            Panel Face <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedPanelFace}
            onValueChange={(value) => handleFieldChange("panelFace", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedModel ? 'bg-gray-100 cursor-not-allowed' : ''
              } ${
                !selectedPanelFace
                ? 'border-red-500'          // active
                : 'border-green-500'        // complete
              }`}
            >
              <SelectValue placeholder="Select panel face" />
            </SelectTrigger>
            <SelectContent>
              {availablePanelFaces.map((face) => (
                <SelectItem key={face} value={face}>
                  {face}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Options
          </Label>
          <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={optionsOpen}
                disabled={!selectedModel}
                className={`w-full justify-between h-auto min-h-[40px] ${
                  !selectedModel ? 'bg-gray-100 cursor-not-allowed' : ''
                } ${
                  selectedOptionsArray.length === 0
                    ? 'border-red-500'
                    : 'border-green-500'
                }`}
              >
                <div className="flex flex-wrap gap-1 max-w-full">
                  {selectedOptionsArray.length === 0 ? (
                    <span className="text-muted-foreground">Select options...</span>
                  ) : (
                    selectedOptionsArray.map((option) => (
                      <Badge
                        key={option}
                        variant="secondary"
                        className="text-xs"
                      >
                        {option}
                        <button
                          className="ml-1 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeOption(option);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" side="bottom" align="start">
              <div className="max-h-64 overflow-auto p-1">
                {availableOptions.map((option) => (
                  <div
                    key={option}
                    className="flex items-center space-x-2 w-full p-2 hover:bg-accent rounded-sm cursor-pointer"
                    onClick={() => handleOptionSelect(option)}
                  >
                    <Checkbox
                      checked={selectedOptionsArray.includes(option)}
                      className="pointer-events-none"
                    />
                    <span className="flex-1 text-sm">{option}</span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Row 4: Top Seals, Bottom Seals (VL Series only) */}
      {selectedSeries === 'VL Series' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="topSeals" className={labelClass}>
              Top Seals
            </Label>
            <Select
              value={selectedTopSeals || "none"}
              onValueChange={(value) => handleFieldChange("topSeals", value)}
              disabled={!selectedModel || availableTopSeals.length === 0}
            >
              <SelectTrigger
                className={`border rounded-md ${
                  !selectedModel || availableTopSeals.length === 0 ? 'bg-gray-100 cursor-not-allowed' : ''
                } ${
                  selectedTopSeals
                  ? 'border-green-500'
                  : 'border-gray-300'
                }`}
              >
                <SelectValue placeholder="Select top seals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {availableTopSeals.map((seal) => (
                  <SelectItem key={seal} value={seal}>
                    {seal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bottomSeals" className={labelClass}>
              Bottom Seals
            </Label>
            <Select
              value={selectedBottomSeals || "none"}
              onValueChange={(value) => handleFieldChange("bottomSeals", value)}
              disabled={!selectedModel || availableBottomSeals.length === 0}
            >
              <SelectTrigger
                className={`border rounded-md ${
                  !selectedModel || availableBottomSeals.length === 0 ? 'bg-gray-100 cursor-not-allowed' : ''
                } ${
                  selectedBottomSeals
                  ? 'border-green-500'
                  : 'border-gray-300'
                }`}
              >
                <SelectValue placeholder="Select bottom seals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {availableBottomSeals.map((seal) => (
                  <SelectItem key={seal} value={seal}>
                    {seal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Row 5: Final Closure System, Track System Option */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="finalClosureSystem" className={labelClass}>
            Final Closure System <span className="text-red-500">*</span>
          </Label>
          <Select
            value={accordionWall.finalClosureSystem || ""}
            onValueChange={(value) => handleFieldChange("finalClosureSystem", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedModel ? 'bg-gray-100 cursor-not-allowed' : ''
              } ${
                accordionWall.finalClosureSystem
                ? 'border-green-500'
                : 'border-red-500'
              }`}
            >
              <SelectValue placeholder="Select final closure system" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(finalClosureSystemOptions) 
                ? finalClosureSystemOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))
                : null
              }
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="trackSystemOption" className={labelClass}>
            Track System Option
          </Label>
          <Select
            value={selectedTrackSystemOption || ""}
            onValueChange={(value) => handleFieldChange('trackSystemOption', value === 'None' ? '' : value)}
            disabled={!selectedModel}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedModel ? 'bg-gray-100 cursor-not-allowed' : ''
              } ${
                !selectedTrackSystemOption
                ? 'border-red-500'          // active
                : 'border-green-500'        // complete
              }`}
            >
              <SelectValue placeholder="Select track system option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              {trackSystemOptions && (
                <SelectItem key={trackSystemOptions} value={trackSystemOptions}>
                  {trackSystemOptions}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 6: Track Mounting, Track System */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trackMounting" className={labelClass}>
            Track Mounting <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedTrackMounting}
            onValueChange={(value) => handleFieldChange("trackMounting", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedModel ? 'bg-gray-100 cursor-not-allowed' : ''
              } ${
                !selectedTrackMounting
                ? 'border-red-500'          // active
                : 'border-green-500'        // complete
              }`}
            >
              <SelectValue placeholder="Select mounting type" />
            </SelectTrigger>
            <SelectContent>
              {trackMountingOptions.map((mounting) => (
                <SelectItem key={mounting} value={mounting}>
                  {mounting}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="suspensionTrackSystem" className={labelClass}>
            Track System <span className="text-red-500">*</span>
          </Label>
          <Input
            id="suspensionTrackSystem"
            value={selectedModel ? "Curtition #4 Architectural Grade Aluminum Extrusion" : ""}
            readOnly
            placeholder="Auto-calculated from model"
            disabled={!selectedModel}
            className={`bg-gray-50 ${
              !selectedModel ? 'bg-gray-100 cursor-not-allowed' : ''
            } ${selectedModel ? 'border-green-500' : 'border-red-500'}`}
          />
        </div>
      </div>

    </div>
  );
};