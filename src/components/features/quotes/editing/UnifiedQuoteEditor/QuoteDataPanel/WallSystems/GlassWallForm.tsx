import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GlassWallFormProps {
  wallName: string;
  wall: any;
  onFieldChange: (wallName: string, field: string, value: any) => void;
}

export const GlassWallForm: React.FC<GlassWallFormProps> = ({
  wallName,
  wall,
  onFieldChange
}) => {
  return (
    <div className="space-y-4">
      {/* Glass Wall Model - Full width */}
      <div className="space-y-1">
        <Label className="text-xs">Glass Wall Model</Label>
        <Select
          key={`${wallName}-glasswallModel-${wall.glasswallModel}`}
          value={wall.glasswallModel || ''}
          onValueChange={(value) => {
            onFieldChange(wallName, 'glasswallModel', value);
            // Reset dependent fields
            onFieldChange(wallName, 'glasswallPanelConfiguration', '');
            onFieldChange(wallName, 'glasswallOperation', '');
          }}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="Stella">Stella</SelectItem>
            <SelectItem className="text-left" value="Luna">Luna</SelectItem>
            <SelectItem className="text-left" value="Illona">Illona</SelectItem>
            <SelectItem className="text-left" value="Ava">Ava</SelectItem>
            <SelectItem className="text-left" value="Mata">Mata</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 2x2 Grid Layout for Glass Wall Fields */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Panel Configuration</Label>
          <Select
            value={wall.glasswallPanelConfiguration || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallPanelConfiguration', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select config" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallModel === "Stella" && (
                <SelectItem className="text-left" value="Individual Panels">Individual Panels</SelectItem>
              )}
              {wall.glasswallModel === "Luna" && (
                <>
                  <SelectItem className="text-left" value="Individual Panels">Individual Panels</SelectItem>
                  <SelectItem className="text-left" value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Illona" && (
                <>
                  <SelectItem className="text-left" value="Individual Panels">Individual Panels</SelectItem>
                  <SelectItem className="text-left" value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
                  <SelectItem className="text-left" value="Pivoting Individual Panels">Pivoting Individual Panels</SelectItem>
                  <SelectItem className="text-left" value="Single & Telescoping Slider Panels">Single & Telescoping Slider Panels</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Ava" && (
                <>
                  <SelectItem className="text-left" value="Individual Panels">Individual Panels</SelectItem>
                  <SelectItem className="text-left" value="Hinged-Paired Panels">Hinged-Paired Panels</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Mata" && (
                <>
                  <SelectItem className="text-left" value="Individual Panels">Individual Panels</SelectItem>
                  <SelectItem className="text-left" value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
                  <SelectItem className="text-left" value="Single & Telescoping Slider Panels">Single & Telescoping Slider Panels</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Operation</Label>
          <Select
            value={wall.glasswallOperation || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallOperation', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select operation" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallModel === "Stella" && (
                <>
                  <SelectItem className="text-left" value="Manual">Manual</SelectItem>
                  <SelectItem className="text-left" value="Automated">Automated</SelectItem>
                  <SelectItem className="text-left" value="Programmable Self-Driving">Programmable Self-Driving</SelectItem>
                  <SelectItem className="text-left" value="Semi-Automated Seals">Semi-Automated Seals</SelectItem>
                </>
              )}
              {["Luna", "Illona", "Ava", "Mata"].includes(wall.glasswallModel || '') && (
                <SelectItem className="text-left" value="Manual">Manual</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Row 2 */}
        <div className="space-y-1">
          <Label className="text-xs">STC Rating</Label>
          <Select
            value={wall.glasswallSTCRating || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallSTCRating', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select STC" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallModel === "Stella" && (
                <>
                  <SelectItem className="text-left" value="44">44</SelectItem>
                  <SelectItem className="text-left" value="50">50</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Luna" && (
                <SelectItem className="text-left" value="43">43</SelectItem>
              )}
              {wall.glasswallModel === "Illona" && (
                <SelectItem className="text-left" value="33">33</SelectItem>
              )}
              {(wall.glasswallModel === "Ava" || wall.glasswallModel === "Mata") && (
                <SelectItem className="text-left" value="Non-Acoustic">Non-Acoustic</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Glass Type</Label>
          <Select
            value={wall.glasswallGlassType || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallGlassType', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select glass type" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallModel === "Stella" && (
                <>
                  <SelectItem className="text-left" value="Tempered Glass">Tempered Glass</SelectItem>
                  <SelectItem className="text-left" value="Laminated Glass">Laminated Glass</SelectItem>
                  <SelectItem className="text-left" value="Switchable Glass">Switchable Glass</SelectItem>
                  <SelectItem className="text-left" value="Child-Safe Glass">Child-Safe Glass</SelectItem>
                  <SelectItem className="text-left" value="Fully Back-Painted Glass">Fully Back-Painted Glass</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Luna" && (
                <>
                  <SelectItem className="text-left" value="Tempered Glass">Tempered Glass</SelectItem>
                  <SelectItem className="text-left" value="Laminated Glass">Laminated Glass</SelectItem>
                  <SelectItem className="text-left" value="Switchable Glass">Switchable Glass</SelectItem>
                  <SelectItem className="text-left" value="Child-Safe Glass">Child-Safe Glass</SelectItem>
                  <SelectItem className="text-left" value="Fully Back-Painted Glass">Fully Back-Painted Glass</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Illona" && (
                <>
                  <SelectItem className="text-left" value="Tempered Glass">Tempered Glass</SelectItem>
                  <SelectItem className="text-left" value="Laminated Glass">Laminated Glass</SelectItem>
                  <SelectItem className="text-left" value="Back-Painted Glass">Back-Painted Glass</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Ava" && (
                <SelectItem className="text-left" value="1/2&quot; Tempered Glass">1/2" Tempered Glass</SelectItem>
              )}
              {wall.glasswallModel === "Mata" && (
                <>
                  <SelectItem className="text-left" value="1/4&quot; Tempered Glass">1/4" Tempered Glass</SelectItem>
                  <SelectItem className="text-left" value="5/16&quot; Frosted Laminated Glass">5/16" Frosted Laminated Glass</SelectItem>
                  <SelectItem className="text-left" value="Custom Glass Options">Custom Glass Options</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Row 3 */}
        <div className="space-y-1">
          <Label className="text-xs">Partition Support</Label>
          <Select
            value={wall.glasswallPartitionSupport || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallPartitionSupport', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select support" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallModel === "Stella" && (
                <SelectItem className="text-left" value="Top-Supported">Top-Supported</SelectItem>
              )}
              {wall.glasswallModel === "Luna" && (
                <>
                  <SelectItem className="text-left" value="Top-Supported">Top-Supported</SelectItem>
                  <SelectItem className="text-left" value="Floor-Supported">Floor-Supported</SelectItem>
                </>
              )}
              {["Illona", "Ava", "Mata"].includes(wall.glasswallModel || '') && (
                <SelectItem className="text-left" value="Top-Supported">Top-Supported</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Frame Thickness</Label>
          <Input
            value={(() => {
              const model = wall.glasswallModel;
              const stc = wall.glasswallSTCRating;
              let thickness = '';
              if (model === 'Stella') thickness = stc === '44' ? '4-1/2"' : '4-11/16"';
              if (model === 'Luna') thickness = '2-3/4"';
              if (model === 'Illona') thickness = '1-3/8"';
              if (model === 'Ava') thickness = '1-7/16"';
              if (model === 'Mata') thickness = '1-3/4"';
              
              if (thickness && thickness !== wall.glasswallFrameThickness) {
                onFieldChange(wallName, 'glasswallFrameThickness', thickness);
              }
              
              return thickness || 'N/A';
            })()}
            readOnly
            className="text-xs h-8 bg-muted text-muted-foreground"
          />
        </div>

        {/* Row 4 */}
        <div className="space-y-1">
          <Label className="text-xs">Panel Width</Label>
          <Input
            value={(() => {
              const model = wall.glasswallModel;
              let width = '';
              if (model === 'Stella') width = '51"';
              if (model === 'Luna') width = '41-3/8"';
              if (model === 'Illona') width = '39-3/8"';
              if (model === 'Ava') width = '48"';
              if (model === 'Mata') width = '48"';
              
              if (width && width !== wall.glasswallPanelWidth) {
                onFieldChange(wallName, 'glasswallPanelWidth', width);
              }
              
              return width || 'N/A';
            })()}
            readOnly
            className="text-xs h-8 bg-muted text-muted-foreground"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Panel Face Options</Label>
          <Select
            value={wall.glasswallPanelFace || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallPanelFace', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select panel face" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallModel === "Stella" && (
                <>
                  <SelectItem className="text-left" value="Solid Face">Solid Face</SelectItem>
                  <SelectItem className="text-left" value="MDF-Backed Melamine">MDF-Backed Melamine</SelectItem>
                  <SelectItem className="text-left" value="High Pressure Laminate">High Pressure Laminate</SelectItem>
                  <SelectItem className="text-left" value="Electrical Internal Mini-Blinds">Electrical Internal Mini-Blinds</SelectItem>
                  <SelectItem className="text-left" value="Internal Mullions & Muntins">Internal Mullions & Muntins</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Luna" && (
                <>
                  <SelectItem className="text-left" value="Solid Face">Solid Face</SelectItem>
                  <SelectItem className="text-left" value="MDF-Backed Melamine">MDF-Backed Melamine</SelectItem>
                  <SelectItem className="text-left" value="High Pressure Laminate">High Pressure Laminate</SelectItem>
                  <SelectItem className="text-left" value="Electrical Internal Mini-Blinds">Electrical Internal Mini-Blinds</SelectItem>
                  <SelectItem className="text-left" value="Internal Muntins">Internal Muntins</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Illona" && (
                <SelectItem className="text-left" value="Surface-Mounted Muntins">Surface-Mounted Muntins</SelectItem>
              )}
              {wall.glasswallModel === "Ava" && (
                <SelectItem className="text-left" value="None">None</SelectItem>
              )}
              {wall.glasswallModel === "Mata" && (
                <>
                  <SelectItem className="text-left" value="Wood Insert">Wood Insert</SelectItem>
                  <SelectItem className="text-left" value="Mullions & Surface-Mounted Muntins">Mullions & Surface-Mounted Muntins</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Row 5 */}
        <div className="space-y-1">
          <Label className="text-xs">Frame Finish</Label>
          <Select
            value={wall.glasswallFrameFinish || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallFrameFinish', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select frame finish" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallModel === "Stella" && (
                <>
                  <SelectItem className="text-left" value="Clear Anodized">Clear Anodized</SelectItem>
                  <SelectItem className="text-left" value="Black">Black</SelectItem>
                  <SelectItem className="text-left" value="White">White</SelectItem>
                  <SelectItem className="text-left" value="Custom RAL Powder Coat">Custom RAL Powder Coat</SelectItem>
                  <SelectItem className="text-left" value="Sublimation Wood Look">Sublimation Wood Look</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Luna" && (
                <>
                  <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                  <SelectItem className="text-left" value="Custom RAL Powder Coat">Custom RAL Powder Coat</SelectItem>
                  <SelectItem className="text-left" value="Sublimation Wood Look">Sublimation Wood Look</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Illona" && (
                <>
                  <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                  <SelectItem className="text-left" value="White Powder Coat">White Powder Coat</SelectItem>
                  <SelectItem className="text-left" value="Custom RAL Powder Coat">Custom RAL Powder Coat</SelectItem>
                  <SelectItem className="text-left" value="Sublimation Wood Look">Sublimation Wood Look</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Ava" && (
                <>
                  <SelectItem className="text-left" value="Clear Anodized">Clear Anodized</SelectItem>
                  <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                  <SelectItem className="text-left" value="Custom RAL Color Options">Custom RAL Color Options</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Mata" && (
                <>
                  <SelectItem className="text-left" value="Stained Fruitwood Dark Oak">Stained Fruitwood Dark Oak</SelectItem>
                  <SelectItem className="text-left" value="Stained Wheat">Stained Wheat</SelectItem>
                  <SelectItem className="text-left" value="Stained Cordovan">Stained Cordovan</SelectItem>
                  <SelectItem className="text-left" value="Painted Black">Painted Black</SelectItem>
                  <SelectItem className="text-left" value="Painted White">Painted White</SelectItem>
                  <SelectItem className="text-left" value="Unfinished">Unfinished</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hinge Type</Label>
          <Select
            value={wall.glasswallHingeType || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallHingeType', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select hinge type" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {["Stella", "Luna", "Illona"].includes(wall.glasswallModel || '') && (
                <SelectItem className="text-left" value="Invisible Hinges">Invisible Hinges</SelectItem>
              )}
              {["Ava", "Mata"].includes(wall.glasswallModel || '') && (
                <SelectItem className="text-left" value="Full-Leaf Butt Hinges">Full-Leaf Butt Hinges</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Row 6 - Track Type spans full width */}
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Glass Wall Track Type</Label>
          <Select
            value={wall.glasswallTrackType || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallTrackType', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select track type" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallModel === "Stella" && (
                <SelectItem className="text-left" value="Top-Supported Multi-directional & Single-Point">Top-Supported Multi-directional & Single-Point</SelectItem>
              )}
              {wall.glasswallModel === "Luna" && (
                <>
                  <SelectItem className="text-left" value="Top-Supported Multi-directional & Single-Point">Top-Supported Multi-directional & Single-Point</SelectItem>
                  <SelectItem className="text-left" value="Floor-Supported Top Guide">Floor-Supported Top Guide</SelectItem>
                </>
              )}
              {["Illona", "Ava", "Mata"].includes(wall.glasswallModel || '') && (
                <SelectItem className="text-left" value="Top-Supported Multi-directional & Single-Point">Top-Supported Multi-directional & Single-Point</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Row 7 */}
        <div className="space-y-1">
          <Label className="text-xs">Track Finish</Label>
          <Select
            value={wall.glasswallTrackFinish || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallTrackFinish', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select track finish" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallModel === "Stella" && (
                <>
                  <SelectItem className="text-left" value="Clear Anodized">Clear Anodized</SelectItem>
                  <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                  <SelectItem className="text-left" value="White Powder Coat">White Powder Coat</SelectItem>
                  <SelectItem className="text-left" value="Custom RAL Option">Custom RAL Option</SelectItem>
                </>
              )}
              {["Luna", "Illona"].includes(wall.glasswallModel || '') && (
                <>
                  <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                  <SelectItem className="text-left" value="Clear Anodized">Clear Anodized</SelectItem>
                  <SelectItem className="text-left" value="White Powder Coat">White Powder Coat</SelectItem>
                  <SelectItem className="text-left" value="Custom RAL Option">Custom RAL Option</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Ava" && (
                <>
                  <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                  <SelectItem className="text-left" value="Clear Anodized">Clear Anodized</SelectItem>
                  <SelectItem className="text-left" value="Custom RAL Color Option">Custom RAL Color Option</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Mata" && (
                <>
                  <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                  <SelectItem className="text-left" value="Clear Anodized">Clear Anodized</SelectItem>
                  <SelectItem className="text-left" value="Custom RAL Option">Custom RAL Option</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Floor Guide</Label>
          <Select
            value={wall.glasswallFloorGuide || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallFloorGuide', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select floor guide" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {["Luna", "Illona"].includes(wall.glasswallModel || '') && (
                <SelectItem className="text-left" value="Optional">Optional</SelectItem>
              )}
              {["Ava", "Mata"].includes(wall.glasswallModel || '') && (
                <SelectItem className="text-left" value="None">None</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Row 8 */}
        <div className="space-y-1">
          <Label className="text-xs">Pass Door Type</Label>
          <Select
            value={wall.glasswallPassDoorType || ''}
            onValueChange={(value) => {
              onFieldChange(wallName, 'glasswallPassDoorType', value);
              onFieldChange(wallName, 'glasswallPassDoorOption', '');
            }}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select door type" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallModel === "Stella" && (
                <>
                  <SelectItem className="text-left" value="Full-Height">Full-Height</SelectItem>
                  <SelectItem className="text-left" value="Inset">Inset</SelectItem>
                </>
              )}
              {["Luna", "Illona", "Ava", "Mata"].includes(wall.glasswallModel || '') && (
                <SelectItem className="text-left" value="Full-Height">Full-Height</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Pass Door Option</Label>
          <Select
            value={wall.glasswallPassDoorOption || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallPassDoorOption', value)}
            disabled={!wall.glasswallModel || !wall.glasswallPassDoorType}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select door option" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallPassDoorType && (
                <>
                  <SelectItem className="text-left" value="Single">Single</SelectItem>
                  <SelectItem className="text-left" value="Double">Double</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Row 9 - Final Closure spans full width */}
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Final Closure</Label>
          <Select
            value={wall.glasswallFinalClosure || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallFinalClosure', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select closure" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallModel === "Stella" && (
                <>
                  <SelectItem className="text-left" value="Panel-Mounted Telescoping Jamb">Panel-Mounted Telescoping Jamb</SelectItem>
                  <SelectItem className="text-left" value="Wall-Mounted Telescoping Jamb">Wall-Mounted Telescoping Jamb</SelectItem>
                  <SelectItem className="text-left" value="Full-Height Door">Full-Height Door</SelectItem>
                </>
              )}
              {["Luna", "Illona"].includes(wall.glasswallModel || '') && (
                <>
                  <SelectItem className="text-left" value="Hinged Closure Panel">Hinged Closure Panel</SelectItem>
                  <SelectItem className="text-left" value="Full-Height Door">Full-Height Door</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Ava" && (
                <>
                  <SelectItem className="text-left" value="Fixed Pivot Panel">Fixed Pivot Panel</SelectItem>
                  <SelectItem className="text-left" value="Fixed Swing Panel">Fixed Swing Panel</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Mata" && (
                <>
                  <SelectItem className="text-left" value="Hinged Closure Panel">Hinged Closure Panel</SelectItem>
                  <SelectItem className="text-left" value="None Required">None Required</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Row 10 */}
        <div className="space-y-1">
          <Label className="text-xs">Bottom Seals</Label>
          <Select
            value={wall.glasswallBottomSeals || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallBottomSeals', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select bottom seals" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallModel === "Stella" && (
                <>
                  <SelectItem className="text-left" value="Electric">Electric</SelectItem>
                  <SelectItem className="text-left" value="Automatic">Automatic</SelectItem>
                  <SelectItem className="text-left" value="Semi-Automatic">Semi-Automatic</SelectItem>
                  <SelectItem className="text-left" value="Manual">Manual</SelectItem>
                  <SelectItem className="text-left" value="Operable">Operable</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Luna" && (
                <>
                  <SelectItem className="text-left" value="Floor Supported Fixed Bulb">Floor Supported Fixed Bulb</SelectItem>
                  <SelectItem className="text-left" value="Top Supported Fixed Brush">Top Supported Fixed Brush</SelectItem>
                </>
              )}
              {["Illona", "Ava"].includes(wall.glasswallModel || '') && (
                <SelectItem className="text-left" value="Fixed Brush">Fixed Brush</SelectItem>
              )}
              {wall.glasswallModel === "Mata" && (
                <SelectItem className="text-left" value="Fixed Flexible Vinyl">Fixed Flexible Vinyl</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Top Seals</Label>
          <Select
            value={wall.glasswallTopSeals || ''}
            onValueChange={(value) => onFieldChange(wallName, 'glasswallTopSeals', value)}
            disabled={!wall.glasswallModel}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select top seals" />
            </SelectTrigger>
            <SelectContent className="text-left">
              {wall.glasswallModel === "Stella" && (
                <>
                  <SelectItem className="text-left" value="Electric">Electric</SelectItem>
                  <SelectItem className="text-left" value="Automatic">Automatic</SelectItem>
                  <SelectItem className="text-left" value="Semi-Automatic">Semi-Automatic</SelectItem>
                  <SelectItem className="text-left" value="Manual">Manual</SelectItem>
                  <SelectItem className="text-left" value="Operable">Operable</SelectItem>
                </>
              )}
              {wall.glasswallModel === "Luna" && (
                <>
                  <SelectItem className="text-left" value="Floor Supported Fixed Bulb">Floor Supported Fixed Bulb</SelectItem>
                  <SelectItem className="text-left" value="Top Supported Fixed Brush">Top Supported Fixed Brush</SelectItem>
                </>
              )}
              {["Illona", "Ava"].includes(wall.glasswallModel || '') && (
                <SelectItem className="text-left" value="Fixed Brush">Fixed Brush</SelectItem>
              )}
              {wall.glasswallModel === "Mata" && (
                <SelectItem className="text-left" value="Fixed Flexible Vinyl">Fixed Flexible Vinyl</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};