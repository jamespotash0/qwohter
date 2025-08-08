// Wall Specification View - Pure UI Component
// Main view component that orchestrates all wall specification UI

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { WallSpecificationViewModel } from '@/viewmodels/WallSpecificationViewModel';
import type { useWallSpecification } from '@/hooks/useWallSpecification';
import { BasicWallInfo } from './WallFormSections/BasicWallInfo';
import { GlassWallSection } from './WallFormSections/GlassWallSection';
import { WallActions } from './WallFormSections/WallActions';

interface WallSpecificationViewProps {
  viewModel: ReturnType<typeof useWallSpecification>;
  disabled?: boolean;
  className?: string;
}

/**
 * Pure UI component for Wall Specification management
 * 
 * This component renders the complete wall specification interface including:
 * - Wall list with collapsible sections
 * - Add wall functionality
 * - Individual wall configuration sections
 * - Wall management actions (rename, remove, duplicate)
 */
export const WallSpecificationView: React.FC<WallSpecificationViewProps> = ({
  viewModel,
  disabled = false,
  className = ""
}) => {
  
  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Header with Add Wall Button - only show button when there are walls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Wall Specifications</h2>
          <p className="text-sm text-muted-foreground">
            {viewModel.hasWalls 
              ? `${viewModel.wallCount} wall${viewModel.wallCount !== 1 ? 's' : ''} configured`
              : 'No walls configured yet'
            }
          </p>
        </div>
        
        {/* {viewModel.hasWalls && ( */}
          <Button
            onClick={() => viewModel.addWall()}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Wall
          </Button>
        {/* )} */}
      </div>


      {/* Wall List */}
      {viewModel.hasWalls ? (
        <div className="space-y-4">
          {viewModel.wallNames.map((wallName) => {
            const wall = viewModel.getWall(wallName);
            if (!wall) return null;
            
            const isCollapsed = viewModel.isWallCollapsed(wallName);
            const isEditing = viewModel.currentEditingWallName === wallName;
            
            return (
              <Collapsible key={wallName} open={!isCollapsed}>
                <Card>
                  <CollapsibleTrigger 
                    onClick={() => viewModel.toggleWallCollapse(wallName)}
                    disabled={disabled}
                    className="w-full"
                  >
                    <CardHeader className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between w-full">
                        
                        {/* Wall Title and Actions */}
                        <div className="flex items-center justify-between w-full">
                          <WallActions
                            wallName={wallName}
                            isEditing={isEditing}
                            newWallName={viewModel.currentNewWallName}
                            onStartEditing={() => viewModel.startEditingWallName(wallName)}
                            onCancelEditing={viewModel.cancelEditingWallName}
                            onSaveNewName={() => viewModel.renameWall(wallName, viewModel.currentNewWallName)}
                            onNewNameChange={viewModel.setNewWallName}
                            onRemoveWall={() => viewModel.removeWall(wallName)}
                            onDuplicateWall={() => viewModel.duplicateWall(wallName)}
                            disabled={disabled}
                          />
                          
                          {/* Wall Summary */}
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              {wall.wallSystemType || 'No system selected'}
                              {wall.wallSystemType === 'Glass Wall' && wall.glasswallModel && 
                                ` - ${wall.glasswallModel}`
                              }
                              {wall.wallSystemType === 'Operable Wall' && wall.model && 
                                ` - ${wall.model}`
                              }
                            </div>
                            {wall.lengthFeet && wall.heightFeet && (
                              <div className="text-xs text-muted-foreground">
                                {wall.lengthFeet}'{wall.lengthInches ? wall.lengthInches + '"' : ''} × {wall.heightFeet}'{wall.heightInches ? wall.heightInches + '"' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Collapse/Expand Icon */}
                        <div className="ml-4">
                          {isCollapsed ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronUp className="h-5 w-5" />
                          )}
                        </div>
                        
                      </div>
                      
                      
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      
                      {/* Basic Wall Information */}
                      <BasicWallInfo
                        wall={wall}
                        onFieldChange={(field, value) => viewModel.updateWallField(wallName, field, value)}
                        disabled={disabled}
                      />
                      
                      {/* System-Specific Sections */}
                      
                      {/* Glass Wall Configuration */}
                      <GlassWallSection
                        wall={wall}
                        onConfigurationChange={(config) => viewModel.updateGlassWallConfig(wallName, config)}
                        disabled={disabled}
                      />

                      
                      {/* Operable Wall Section - Placeholder for future implementation */}
                      {wall.wallSystemType === "Operable Wall" && (
                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                          <h3 className="text-lg font-semibold text-blue-800">Operable Wall Configuration</h3>
                          <p className="text-sm text-blue-600 mt-1">
                            Operable wall configuration will be implemented here.
                          </p>
                        </div>
                      )}
                      
                      {/* Accordion Wall Section - Placeholder for future implementation */}
                      {wall.wallSystemType === "Accordion Wall" && (
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                          <h3 className="text-lg font-semibold text-green-800">Accordion Wall Configuration</h3>
                          <p className="text-sm text-green-600 mt-1">
                            Accordion wall configuration will be implemented here.
                          </p>
                        </div>
                      )}
                      
                      
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex items-center justify-between">
          <Card className="flex-1">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center space-y-2">
                <div className="text-muted-foreground">
                  <div className="text-lg font-medium">No walls configured yet</div>
                  <div className="text-sm">Click "Add Wall" to get started with your wall specifications.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Quick Actions for Multiple Walls */}
      {viewModel.wallCount > 1 && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={viewModel.clearAllWalls}
            disabled={disabled}
            className="text-red-600 hover:text-red-800"
          >
            Clear All Walls
          </Button>
        </div>
      )}
      
    </div>
  );
};