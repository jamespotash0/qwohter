import React from 'react';
import { WallSpecification, isOperableWall } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface WallConfigItem {
  name: string;
  value: string | undefined;
  configured: boolean;
  required: boolean;
}

interface WallStatus {
  name: string;
  configs: WallConfigItem[];
  isComplete: boolean;
  hasAnyConfiguration: boolean;
}

interface WallCompletionModalProps {
  isOpen: boolean;
  walls: { [wallName: string]: WallSpecification };
  onClose: () => void;
  onReviewWall?: (wallName: string) => void;
  onContinueAnyway?: () => void;
}

export const WallCompletionModal: React.FC<WallCompletionModalProps> = ({
  isOpen,
  walls,
  onClose,
  onReviewWall,
  onContinueAnyway
}) => {
  
  const getWallConfigurations = (wall: WallSpecification): WallConfigItem[] => [
    {
      name: 'Pass Doors',
      value: isOperableWall(wall) ? wall.passDoorPanels : undefined,
      configured: isOperableWall(wall) && !!wall.passDoorPanels && wall.passDoorPanels !== 'None' && wall.passDoorPanels !== '',
      required: false
      
    },
    {
      name: 'Pocket Doors',
      value: wall.pocketDoors?.foldType,
      configured: !!(wall.pocketDoors?.foldType && wall.pocketDoors.foldType !== 'None' && wall.pocketDoors.foldType !== ''),
      required: false
    },
    {
      name: 'Structure Support',
      value: wall.structureSupport,
      configured: !!(wall.structureSupport && wall.structureSupport !== 'None' && wall.structureSupport !== ''),
      required: false
    }
  ];

  const getWallStatus = (wallName: string, wall: WallSpecification): WallStatus => {
    const configs = getWallConfigurations(wall);
    const configuredCount = configs.filter(c => c.configured).length;
    const hasAnyConfiguration = configuredCount > 0;
    const isComplete = configuredCount === configs.length; // For now, require all configurations
    
    return {
      name: wallName,
      configs,
      isComplete,
      hasAnyConfiguration
    };
  };

  const wallStatuses = Object.entries(walls).map(([name, wall]) => getWallStatus(name, wall));
  const completeWalls = wallStatuses.filter(w => w.isComplete);
  const incompleteWalls = wallStatuses.filter(w => !w.isComplete);
  const wallsWithNoConfig = wallStatuses.filter(w => !w.hasAnyConfiguration);

  const completionPercentage = Math.round((completeWalls.length / wallStatuses.length) * 100);

  const getStatusColor = (status: WallStatus) => {
    if (status.isComplete) return 'text-green-600';
    if (status.hasAnyConfiguration) return 'text-amber-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: WallStatus) => {
    if (status.isComplete) return '✅';
    if (status.hasAnyConfiguration) return '⚠️';
    return '❌';
  };

  const getStatusText = (status: WallStatus) => {
    if (status.isComplete) return 'Complete';
    if (status.hasAnyConfiguration) return 'Partial';
    return 'Not Started';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Wall Configuration Status</span>
            <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
              {completionPercentage}% Complete
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completeWalls.length}</div>
              <div className="text-sm text-gray-600">Complete</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{incompleteWalls.length}</div>
              <div className="text-sm text-gray-600">Incomplete</div>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{wallsWithNoConfig.length}</div>
              <div className="text-sm text-gray-600">Not Started</div>
            </CardContent>
          </Card>
        </div>

        {/* Wall Details */}
        <div className="space-y-4">
          {wallStatuses.map(wallStatus => (
            <Card key={wallStatus.name} className={`${
              wallStatus.isComplete ? 'border-green-200' : 
              wallStatus.hasAnyConfiguration ? 'border-amber-200' : 'border-red-200'
            }`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-lg">{wallStatus.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${getStatusColor(wallStatus)}`}>
                      {getStatusIcon(wallStatus)} {getStatusText(wallStatus)}
                    </span>
                    {!wallStatus.isComplete && onReviewWall && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onReviewWall(wallStatus.name)}
                      >
                        Configure
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {wallStatus.configs.map(config => (
                    <div key={config.name} className="flex items-center gap-2 text-sm">
                      <span className={config.configured ? 'text-green-600' : 'text-gray-400'}>
                        {config.configured ? '✅' : '⭕'}
                      </span>
                      <span className={config.configured ? '' : 'text-gray-500'}>
                        {config.name}
                      </span>
                      {config.configured && config.value && (
                        <Badge variant="outline" className="text-xs">
                          {config.value}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Warning for incomplete configurations */}
        {incompleteWalls.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2">
              <span className="text-amber-600">⚠️</span>
              <div>
                <h4 className="font-medium text-amber-800">Incomplete Configurations</h4>
                <p className="text-sm text-amber-700">
                  {incompleteWalls.length} wall{incompleteWalls.length > 1 ? 's' : ''} {incompleteWalls.length > 1 ? 'have' : 'has'} incomplete configurations. 
                  These sections may not appear correctly in the quote preview.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {onContinueAnyway && incompleteWalls.length > 0 && (
              <Button variant="outline" onClick={onContinueAnyway}>
                Continue Anyway
              </Button>
            )}
          </div>
          
          <Button 
            onClick={onClose}
            className={completionPercentage === 100 ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {completionPercentage === 100 ? "All Configured - Continue" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WallCompletionModal;