import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WallTypeFormProps } from './types';

export const AccordionPartitionForm: React.FC<WallTypeFormProps> = ({
  wallName,
  wall,
  onFieldChange
}) => {
  return (
    <>
      <div className="space-y-2">
        <Label>Panel Configuration</Label>
        <Select
          value={wall.panelConfiguration || ''}
          onValueChange={(value) => {
            onFieldChange(wallName, 'panelConfiguration', value);
            // Reset dependent fields when configuration changes
            onFieldChange(wallName, 'series', '');
            onFieldChange(wallName, 'model', '');
          }}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select config" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="Accordion Panels">Accordion Panels</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Series</Label>
        <Select
          value={wall.series || ''}
          onValueChange={(value) => {
            onFieldChange(wallName, 'series', value);
            // Reset model when series changes
            onFieldChange(wallName, 'model', '');
          }}
          disabled={!wall.panelConfiguration}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select series" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="100">100</SelectItem>
            <SelectItem className="text-left" value="200">200</SelectItem>
            <SelectItem className="text-left" value="300">300</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Model</Label>
        <Select
          value={wall.model || ''}
          onValueChange={(value) => {
            onFieldChange(wallName, 'model', value);
            // Reset dependent fields
            onFieldChange(wallName, 'panelSkin', '');
            onFieldChange(wallName, 'stcRating', '');
          }}
          disabled={!wall.series}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="text-left">
            {wall.series === "100" && (
              <>
                <SelectItem className="text-left" value="110">110</SelectItem>
                <SelectItem className="text-left" value="120">120</SelectItem>
              </>
            )}
            {wall.series === "200" && (
              <>
                <SelectItem className="text-left" value="210">210</SelectItem>
                <SelectItem className="text-left" value="220">220</SelectItem>
              </>
            )}
            {wall.series === "300" && (
              <>
                <SelectItem className="text-left" value="310">310</SelectItem>
                <SelectItem className="text-left" value="320">320</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Panel Thickness</Label>
        <Input
          value={(() => {
            const series = wall.series;
            if (series === "100") return "2\"";
            if (series === "200") return "3\"";
            if (series === "300") return "4\"";
            return "";
          })()}
          readOnly
          className="text-xs h-8 bg-muted text-muted-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label>Panel Design</Label>
        <Select
          value={wall.panelDesign || ''}
          onValueChange={(value) => onFieldChange(wallName, 'panelDesign', value)}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select design" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="Accordion Fold">Accordion Fold</SelectItem>
            <SelectItem className="text-left" value="Continuous Hinge">Continuous Hinge</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Panel Skin</Label>
        <Select
          value={wall.panelSkin || ''}
          onValueChange={(value) => {
            onFieldChange(wallName, 'panelSkin', value);
            // Reset STC rating when skin changes
            onFieldChange(wallName, 'stcRating', '');
          }}
          disabled={!wall.model}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select skin" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="Vinyl Fabric">Vinyl Fabric</SelectItem>
            <SelectItem className="text-left" value="Carpet">Carpet</SelectItem>
            <SelectItem className="text-left" value="Wood Veneer">Wood Veneer</SelectItem>
            <SelectItem className="text-left" value="High-Pressure Laminate">High-Pressure Laminate</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>STC Rating</Label>
        <Select
          value={wall.stcRating || ''}
          onValueChange={(value) => onFieldChange(wallName, 'stcRating', value)}
          disabled={!wall.model || !wall.panelSkin}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select STC" />
          </SelectTrigger>
          <SelectContent className="text-left">
            {wall.series === "100" && (
              <>
                <SelectItem className="text-left" value="35">35</SelectItem>
                <SelectItem className="text-left" value="38">38</SelectItem>
              </>
            )}
            {wall.series === "200" && (
              <>
                <SelectItem className="text-left" value="40">40</SelectItem>
                <SelectItem className="text-left" value="43">43</SelectItem>
              </>
            )}
            {wall.series === "300" && (
              <>
                <SelectItem className="text-left" value="45">45</SelectItem>
                <SelectItem className="text-left" value="48">48</SelectItem>
                <SelectItem className="text-left" value="52">52</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Panel Finish Category</Label>
        <Select
          value={wall.panelFinishCategory || ''}
          onValueChange={(value) => {
            onFieldChange(wallName, 'panelFinishCategory', value);
            // Reset specific item when category changes
            onFieldChange(wallName, 'panelFinishSpecificItem', '');
          }}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select finish" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="Standard Vinyl">Standard Vinyl</SelectItem>
            <SelectItem className="text-left" value="Upgrade Vinyl">Upgrade Vinyl</SelectItem>
            <SelectItem className="text-left" value="Standard Carpet">Standard Carpet</SelectItem>
            <SelectItem className="text-left" value="Upgrade Carpet">Upgrade Carpet</SelectItem>
            <SelectItem className="text-left" value="Wood Veneer">Wood Veneer</SelectItem>
            <SelectItem className="text-left" value="High Pressure Laminate">High Pressure Laminate</SelectItem>
            <SelectItem className="text-left" value="Uncovered">Uncovered</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Track System</Label>
        <Select
          value={wall.trackSystem || ''}
          onValueChange={(value) => onFieldChange(wallName, 'trackSystem', value)}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select system" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="Top-Suspended Track">Top-Suspended Track</SelectItem>
            <SelectItem className="text-left" value="Floor-Supported Track">Floor-Supported Track</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Track Type</Label>
        <Input
          value="Accordion Track System"
          readOnly
          className="text-xs h-8 bg-muted text-muted-foreground"
        />
      </div>
    </>
  );
};