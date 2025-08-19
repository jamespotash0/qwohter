import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WallTypeFormProps } from './types';

export const OperableWallForm: React.FC<WallTypeFormProps> = ({
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
            <SelectItem className="text-left" value="Individual Panels">Individual Panels</SelectItem>
            <SelectItem className="text-left" value="Hinged-Paired Panels">Hinged-Paired Panels</SelectItem>
            <SelectItem className="text-left" value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
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
            {wall.panelConfiguration === "Individual Panels" && (
              <>
                <SelectItem className="text-left" value="2000">2000</SelectItem>
                <SelectItem className="text-left" value="3000">3000</SelectItem>
                <SelectItem className="text-left" value="Hufcor: 600">Hufcor: 600</SelectItem>
              </>
            )}
            {(wall.panelConfiguration === "Hinged-Paired Panels" || wall.panelConfiguration === "Continuously-Hinged Panels") && (
              <>
                <SelectItem className="text-left" value="2000">2000</SelectItem>
                <SelectItem className="text-left" value="3000">3000</SelectItem>
              </>
            )}
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
            {wall.panelConfiguration === "Individual Panels" && wall.series === "2000" && (
              <>
                <SelectItem className="text-left" value="2010">2010</SelectItem>
                <SelectItem className="text-left" value="2020">2020</SelectItem>
                <SelectItem className="text-left" value="2010GL">2010GL</SelectItem>
                <SelectItem className="text-left" value="2020GL">2020GL</SelectItem>
              </>
            )}
            {wall.panelConfiguration === "Individual Panels" && wall.series === "3000" && (
              <>
                <SelectItem className="text-left" value="3010">3010</SelectItem>
                <SelectItem className="text-left" value="3020">3020</SelectItem>
                <SelectItem className="text-left" value="3010GL">3010GL</SelectItem>
                <SelectItem className="text-left" value="3020GL">3020GL</SelectItem>
              </>
            )}
            {wall.panelConfiguration === "Individual Panels" && wall.series === "Hufcor: 600" && (
              <SelectItem className="text-left" value="Hufcor 641">Hufcor 641</SelectItem>
            )}
            {wall.panelConfiguration === "Continuously-Hinged Panels" && wall.series === "2000" && (
              <SelectItem className="text-left" value="2050e">2050e</SelectItem>
            )}
            {wall.panelConfiguration === "Continuously-Hinged Panels" && wall.series === "3000" && (
              <SelectItem className="text-left" value="3050e">3050e</SelectItem>
            )}
            {wall.panelConfiguration === "Hinged-Paired Panels" && wall.series === "2000" && (
              <>
                <SelectItem className="text-left" value="2030">2030</SelectItem>
                <SelectItem className="text-left" value="2030GL">2030GL</SelectItem>
              </>
            )}
            {wall.panelConfiguration === "Hinged-Paired Panels" && wall.series === "3000" && (
              <>
                <SelectItem className="text-left" value="3030">3030</SelectItem>
                <SelectItem className="text-left" value="3030GL">3030GL</SelectItem>
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
            if (series === "2000") return "3\"";
            if (series === "3000") return "4\"";
            if (series === "Hufcor: 600") return "4\"";
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
            <SelectItem className="text-left" value="Trimless U Capped">Trimless U Capped</SelectItem>
            <SelectItem className="text-left" value="U-Capped Trim">U-Capped Trim</SelectItem>
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
            {wall.model === "Hufcor 641" && (
              <SelectItem className="text-left" value="Steel">Steel</SelectItem>
            )}
            {["3010", "3020", "3030"].includes(wall.model || '') && (
              <>
                <SelectItem className="text-left" value="Standard Steel Skin">Standard Steel Skin</SelectItem>
                <SelectItem className="text-left" value="Optional Acoustical Substrate">Optional Acoustical Substrate</SelectItem>
                <SelectItem className="text-left" value="Optional Wood Veneer">Optional Wood Veneer</SelectItem>
                <SelectItem className="text-left" value="Optional High-Pressure Laminate">Optional High-Pressure Laminate</SelectItem>
              </>
            )}
            {["3050e", "3010GL", "3020GL", "3030GL"].includes(wall.model || '') && (
              <>
                <SelectItem className="text-left" value="Standard Steel Skin">Standard Steel Skin</SelectItem>
                <SelectItem className="text-left" value="Optional Acoustical Substrate">Optional Acoustical Substrate</SelectItem>
              </>
            )}
            {["2010", "2020", "2030"].includes(wall.model || '') && (
              <>
                <SelectItem className="text-left" value="Standard Acoustical Substrate">Standard Acoustical Substrate</SelectItem>
                <SelectItem className="text-left" value="Optional Steel Skin">Optional Steel Skin</SelectItem>
                <SelectItem className="text-left" value="Optional Wood Veneer">Optional Wood Veneer</SelectItem>
                <SelectItem className="text-left" value="Optional High-Pressure Laminate">Optional High-Pressure Laminate</SelectItem>
              </>
            )}
            {["2050e", "2010GL", "2020GL", "2030GL"].includes(wall.model || '') && (
              <>
                <SelectItem className="text-left" value="Standard Acoustical Substrate">Standard Acoustical Substrate</SelectItem>
                <SelectItem className="text-left" value="Optional Steel Skin">Optional Steel Skin</SelectItem>
              </>
            )}
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
            {wall.model === "Hufcor 641" && (
              <>
                <SelectItem className="text-left" value="43">43</SelectItem>
                <SelectItem className="text-left" value="47">47</SelectItem>
                <SelectItem className="text-left" value="49">49</SelectItem>
                <SelectItem className="text-left" value="52">52</SelectItem>
                <SelectItem className="text-left" value="54">54</SelectItem>
                <SelectItem className="text-left" value="56">56</SelectItem>
              </>
            )}
            {["2010GL", "2020GL", "2030GL"].includes(wall.model || '') && (
              <SelectItem className="text-left" value="38">38</SelectItem>
            )}
            {["3010GL", "3020GL", "3030GL"].includes(wall.model || '') && (
              <>
                <SelectItem className="text-left" value="43">43</SelectItem>
                <SelectItem className="text-left" value="48">48</SelectItem>
              </>
            )}
            {["2010", "2020", "2030", "2050e"].includes(wall.model || '') && wall.panelSkin?.includes("Acoustical Substrate") && (
              <>
                <SelectItem className="text-left" value="42">42</SelectItem>
                <SelectItem className="text-left" value="45">45</SelectItem>
                <SelectItem className="text-left" value="49">49</SelectItem>
                <SelectItem className="text-left" value="50">50</SelectItem>
              </>
            )}
            {["2010", "2020", "2030", "2050e"].includes(wall.model || '') && wall.panelSkin?.includes("Steel") && (
              <>
                <SelectItem className="text-left" value="49">49</SelectItem>
                <SelectItem className="text-left" value="51">51</SelectItem>
              </>
            )}
            {["3010", "3020", "3030", "3050e"].includes(wall.model || '') && wall.panelSkin?.includes("Steel") && (
              <>
                <SelectItem className="text-left" value="46">46</SelectItem>
                <SelectItem className="text-left" value="50">50</SelectItem>
                <SelectItem className="text-left" value="52">52</SelectItem>
                <SelectItem className="text-left" value="56">56</SelectItem>
              </>
            )}
            {["3010", "3020", "3030", "3050e"].includes(wall.model || '') && wall.panelSkin?.includes("Acoustical Substrate") && (
              <>
                <SelectItem className="text-left" value="43">43</SelectItem>
                <SelectItem className="text-left" value="46">46</SelectItem>
                <SelectItem className="text-left" value="48">48</SelectItem>
                <SelectItem className="text-left" value="50">50</SelectItem>
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
            <SelectItem className="text-left" value="Koroseal Standard Vinyl">Koroseal Standard Vinyl</SelectItem>
            <SelectItem className="text-left" value="Koroseal Upgrade Vinyl">Koroseal Upgrade Vinyl</SelectItem>
            <SelectItem className="text-left" value="Shaw Standard Carpet">Shaw Standard Carpet</SelectItem>
            <SelectItem className="text-left" value="HyTex Upgrade Carpet">HyTex Upgrade Carpet</SelectItem>
            <SelectItem className="text-left" value="HyTex Standard Fabric">HyTex Standard Fabric</SelectItem>
            <SelectItem className="text-left" value="HyTex Upgrade Fabric">HyTex Upgrade Fabric</SelectItem>
            <SelectItem className="text-left" value="Standard Wood Veneer">Standard Wood Veneer</SelectItem>
            <SelectItem className="text-left" value="Wilsonart High Pressure Laminate (HPL)">Wilsonart High Pressure Laminate (HPL)</SelectItem>
            <SelectItem className="text-left" value="Full Height Marker (Tack) Board">Full Height Marker (Tack) Board</SelectItem>
            <SelectItem className="text-left" value="Uncovered">Uncovered</SelectItem>
            <SelectItem className="text-left" value="C.O.M. Material">C.O.M. Material</SelectItem>
            <SelectItem className="text-left" value="Field Painting by Others">Field Painting by Others</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!["Uncovered", "C.O.M. Material", "Field Painting by Others"].includes(wall.panelFinishCategory || '') && wall.panelFinishCategory && (
        <div>
          <Label>Panel Finish Specific Item</Label>
          <Select
            value={wall.panelFinishSpecificItem || ''}
            onValueChange={(value) => onFieldChange(wallName, 'panelFinishSpecificItem', value)}
            disabled={!wall.panelFinishCategory}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select specific item" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.panelFinishCategory === "Standard Wood Veneer" && (
                <>
                  <SelectItem className="text-left" value="Unfinished Flat Cut White Maple">Unfinished Flat Cut White Maple</SelectItem>
                  <SelectItem className="text-left" value="Unfinished Flat Cut White Oak">Unfinished Flat Cut White Oak</SelectItem>
                  <SelectItem className="text-left" value="Unfinished Flat Cut Walnut">Unfinished Flat Cut Walnut</SelectItem>
                  <SelectItem className="text-left" value="Unfinished Flat Cut Cherry">Unfinished Flat Cut Cherry</SelectItem>
                  <SelectItem className="text-left" value="Unfinished Flat Cut Red Oak">Unfinished Flat Cut Red Oak</SelectItem>
                </>
              )}
              {/* Additional specific items can be added here for other finish categories */}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Vertical Seals</Label>
        <Select
          value={wall.verticalSeals || ''}
          onValueChange={(value) => onFieldChange(wallName, 'verticalSeals', value)}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select seals" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="None">None</SelectItem>
            <SelectItem className="text-left" value="Tongue-and-Groove">Tongue-and-Groove</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Bottom Seals</Label>
        <Select
          value={wall.bottomSeals || ''}
          onValueChange={(value) => onFieldChange(wallName, 'bottomSeals', value)}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select seals" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="None">None</SelectItem>
            <SelectItem className="text-left" value="Retractable">Retractable</SelectItem>
            <SelectItem className="text-left" value="Automatic">Automatic</SelectItem>
            <SelectItem className="text-left" value="Adjustable">Adjustable</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Top Seals</Label>
        <Select
          value={wall.topSeals || ''}
          onValueChange={(value) => onFieldChange(wallName, 'topSeals', value)}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select seals" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="None">None</SelectItem>
            <SelectItem className="text-left" value="Fixed">Fixed</SelectItem>
            <SelectItem className="text-left" value="Adjustable">Adjustable</SelectItem>
            <SelectItem className="text-left" value="Operable">Operable</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Initial Closure System</Label>
        <Select
          value={wall.initialClosureSystem || ''}
          onValueChange={(value) => onFieldChange(wallName, 'initialClosureSystem', value)}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select closure" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="None">None</SelectItem>
            <SelectItem className="text-left" value="Standard Bulb">Standard Bulb</SelectItem>
            <SelectItem className="text-left" value="Optional Fixed Starter Jamb">Optional Fixed Starter Jamb</SelectItem>
            <SelectItem className="text-left" value="Optional Adjustable Starter Jamb">Optional Adjustable Starter Jamb</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>End Panel Type</Label>
        <Select
          value={wall.endPanelType || ''}
          onValueChange={(value) => onFieldChange(wallName, 'endPanelType', value)}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select end panel" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="None">None</SelectItem>
            <SelectItem className="text-left" value="Standard Expander Panel Closure">Standard Expander Panel Closure</SelectItem>
            <SelectItem className="text-left" value="Optional Hinged Panel(s) Closure">Optional Hinged Panel(s) Closure</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Pass Door Panels</Label>
        <Select
          value={wall.passDoorPanels || ''}
          onValueChange={(value) => onFieldChange(wallName, 'passDoorPanels', value)}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select pass door" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="None">None</SelectItem>
            <SelectItem className="text-left" value="Single">Single</SelectItem>
            <SelectItem className="text-left" value="Double">Double</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Track System</Label>
        <Select
          value={wall.trackSystem || ''}
          onValueChange={(value) => onFieldChange(wallName, 'trackSystem', value)}
          disabled={!wall.trackType && !wall.model}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select system" />
          </SelectTrigger>
          <SelectContent className="text-left">
            {wall.model === "Hufcor 641" && (
              <>
                <SelectItem className="text-left" value="Type 26 Clear Satin-Anodized Aluminum">Type 26 Clear Satin-Anodized Aluminum</SelectItem>
                <SelectItem className="text-left" value="Type 36 Clear Satin-Anodized Aluminum">Type 36 Clear Satin-Anodized Aluminum</SelectItem>
                <SelectItem className="text-left" value="Type 57 Clear Anodized Aluminum">Type 57 Clear Anodized Aluminum</SelectItem>
                <SelectItem className="text-left" value="Type 11L Powder Coated Off-White Steel">Type 11L Powder Coated Off-White Steel</SelectItem>
                <SelectItem className="text-left" value="Type 11 Powder Coated Off-White Steel">Type 11 Powder Coated Off-White Steel</SelectItem>
              </>
            )}
            {(wall.trackType === "Multi-Directional Track" || wall.trackType === "Hinged-Pair (Straight Line) Track") && (
              <>
                <SelectItem className="text-left" value="Type 425 Clear Satin-Anodized Aluminum">Type 425 Clear Satin-Anodized Aluminum</SelectItem>
                <SelectItem className="text-left" value="Type 850 Clear Satin-Anodized Aluminum">Type 850 Clear Satin-Anodized Aluminum</SelectItem>
              </>
            )}
            {wall.trackType === "Curve & Diverter (Individual) Track" && (
              <SelectItem className="text-left" value="Type 850 Powder Coated Off-White Steel">Type 850 Powder Coated Off-White Steel</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};