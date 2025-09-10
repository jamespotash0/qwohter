import React, { useState } from 'react';
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

  const {
    selectedSeries,
    selectedModel,
    selectedSTCRating,
    selectedOperation,
    selectedPanelFinish,
    selectedOptions,
    selectedTrackSystemOption,
    selectedTrackMounting,
    seriesOptions,
    availableModels,
    availablePanelFinishes,
    availableOptions,
    trackMountingOptions,
    trackSystemOptions,
    handleFieldChange,
  } = useAccordionWallForm({ wall, wallName, onChange });

  // Parse selected options as array
  const selectedOptionsArray = selectedOptions ? selectedOptions.split(',').map(s => s.trim()).filter(Boolean) : [];

  // Handle multi-select options
  const handleOptionSelect = (option: string) => {
    const currentOptions = selectedOptionsArray;
    const isSelected = currentOptions.includes(option);
    
    let newOptions;
    if (isSelected) {
      newOptions = currentOptions.filter(item => item !== option);
    } else {
      newOptions = [...currentOptions, option];
    }
    
    handleFieldChange('options', newOptions.join(', '));
  };

  const removeOption = (optionToRemove: string) => {
    const newOptions = selectedOptionsArray.filter(option => option !== optionToRemove);
    handleFieldChange('options', newOptions.join(', '));
  };

  // Layout classes based on context
  const labelClass = layout === 'edit' ? 'text-sm font-medium' : 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';

  return (
    <div className="space-y-6">
      {/* Panel Configuration */}
      <div className="space-y-2">
        <Label htmlFor="panelConfiguration" className={labelClass}>
          Panel Configuration <span className="text-red-500">*</span>
        </Label>
        <Select
          value={wall.panelConfiguration || "Individual panels"}
          onValueChange={(value) => handleFieldChange("panelConfiguration", value)}
        >
          <SelectTrigger className="border rounded-md border-green-500">
            <SelectValue placeholder="Select panel configuration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Individual panels">Individual panels</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row 1: Series, Model, STC Rating */}
      <div className="grid grid-cols-3 gap-4">
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

        <div className="space-y-2">
          <Label htmlFor="stcRating" className={labelClass}>
            STC Rating <span className="text-red-500">*</span>
          </Label>
          <Input
            id="stcRating"
            value={selectedSTCRating}
            readOnly
            placeholder="Auto-calculated from model"
            className={`bg-gray-50 ${selectedSTCRating ? 'border-green-500' : 'border-red-500'}`}
          />
        </div>
      </div>

      {/* Row 2: Panel Finish, Operation */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="panelFinish" className={labelClass}>
            Panel Finish <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedPanelFinish}
            onValueChange={(value) => handleFieldChange("panelFinish", value)}
            disabled={!selectedModel}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedModel ? 'bg-gray-100 cursor-not-allowed' : ''
              } ${
                !selectedPanelFinish
                ? 'border-red-500'          // active
                : 'border-green-500'        // complete
              }`}
            >
              <SelectValue placeholder="Select panel finish" />
            </SelectTrigger>
            <SelectContent>
              {availablePanelFinishes.map((finish) => (
                <SelectItem key={finish} value={finish}>
                  {finish}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="operation" className={labelClass}>
            Operation <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedOperation || "Manual, Top Supported"}
            onValueChange={(value) => handleFieldChange('operation', value)}
            disabled={!selectedModel}
          >
            <SelectTrigger
              className={`border rounded-md ${
                !selectedModel ? 'bg-gray-100 cursor-not-allowed' : ''
              } ${
                selectedOperation || !selectedModel
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

      {/* Options Section - Multi-Select Dropdown */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Options <span className="text-red-500">*</span>
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

      {/* Row 3: Track Mounting, Track System Option */}
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
          <Label htmlFor="trackSystemOption" className={labelClass}>
            Track System Option <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedTrackSystemOption || undefined}
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

      {/* Suspension Track System - Read Only */}
      <div className="space-y-2">
        <Label htmlFor="suspensionTrackSystem" className={labelClass}>
          Suspension/Track System <span className="text-red-500">*</span>
        </Label>
        <Input
          id="suspensionTrackSystem"
          value="Curtition #4 Architectural Grade Aluminum Extrusion"
          readOnly
          className="bg-gray-50 border-green-500"
        />
      </div>
    </div>
  );
};