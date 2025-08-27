import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { WallSpecification, WallDetails } from "@/types/quote";
import { useState } from "react";
import BaseSpecs from "@/components/features/quotes/specs/BaseCreationForm";
import GlassWallSpecs from "@/components/features/quotes/specs/GlassWallCreationForm";
import OperableWallSpecs from "@/components/features/quotes/specs/OperableWallCreationForm";

interface WallSpecificationFormProps {
  walls: WallDetails;
  onUpdate: (walls: WallDetails) => void;
}

const WallSpecificationForm = ({ walls, onUpdate }: WallSpecificationFormProps) => {
  const [editingWallName, setEditingWallName] = useState<string | null>(null);
  const [newWallName, setNewWallName] = useState("");
  const [collapsedWalls, setCollapsedWalls] = useState<Set<string>>(new Set());

  const handleWallChange = (wallName: string, field: keyof WallSpecification, value: string) => {
    // Convert "None" to empty string to reset to placeholder state
    const actualValue = value === "None" ? "" : value;
    
    const currentWall = walls.walls[wallName];
    if (!currentWall) {
      console.error(`Wall ${wallName} not found`);
      return;
    }
    
    const updatedWalls = {
      ...walls,
      walls: {
        ...walls.walls,
        [wallName]: {
          ...currentWall,
          [field]: actualValue,
        },
      },
    };
    
    // Cascading logic
    if (field === "wallSystemType") {
      // Reset all dependent fields when wall system type changes
      updatedWalls.walls[wallName] = {
        ...updatedWalls.walls[wallName],
        panelConfiguration: "",
        series: "",
        model: "",
        panelThickness: "",
        panelDesign: "",
        panelSkin: "",
        stcRating: "",
        passDoorPanels: "",
        passDoorQuantity: "",
        panelFinishCategory: "",
        panelFinishSpecificItem: "",
        trackType: "",
        trackSystem: "",
        verticalSeals: "",
        bottomSeals: "",
        topSeals: "",
        initialClosureSystem: "",
        endPanelType: "",
        // Clear glass wall specific fields too
        glasswallModel: "",
        glasswallOperation: "",
        glasswallPanelFace: "",
        glasswallFrameFinish: "",
        glasswallGlassType: "",
        glasswallSTCRating: "",
        glasswallPartitionSupport: "",
        glasswallPassDoorType: "",
        glasswallPassDoorOption: "",
        glasswallHingeType: "",
        glasswallFrameThickness: "",
        glasswallTrackType: "",
        glasswallTrackFinish: "",
        glasswallFinalClosure: "",
        glasswallBottomSeals: "",
        glasswallTopSeals: "",
      };
    }
    
    if (field === "panelConfiguration") {
      // Reset dependent fields
      const currentWallData = updatedWalls.walls[wallName];
      updatedWalls.walls[wallName] = {
        ...currentWallData,
        series: "",
        model: "",
        panelThickness: "",
        panelSkin: "",
        panelDesign: "",  
        stcRating: "",
        trackType: "",
        trackSystem: "",
        initialClosureSystem: "",
      };
    }
    
    if (field === "series") {
      // Auto-update panel thickness based on series
      const currentWallData = updatedWalls.walls[wallName];
      updatedWalls.walls[wallName] = {
        ...currentWallData,
        panelThickness: value === "2000" ? "3" : value === "3000" ? "4" : value === "Hufcor: 600" ? "4" : "",
        model: "",
        panelSkin: "",
        panelDesign: "",
        stcRating: "",
        initialClosureSystem: "",
      } as WallSpecification;
    }
    
    if (field === "model") {
      // Auto-update track type based on model
      const currentWallData = updatedWalls.walls[wallName];
      updatedWalls.walls[wallName] = {
        ...currentWallData,
        trackType: getTrackTypeByModel(value),
        trackSystem: "",
        panelSkin: "",
        panelDesign: "",
        stcRating: "",
        initialClosureSystem: "",
      } as WallSpecification;
    }
    
    if (field === "panelSkin" || field === "model") {
      // Reset STC rating when model or panel skin changes
      const currentWallData = updatedWalls.walls[wallName];
      updatedWalls.walls[wallName] = {
        ...currentWallData,
        stcRating: "",
      } as WallSpecification;
    }
    
    if (field === "trackType") {
      // Reset track system when track type changes
      const currentWallData = updatedWalls.walls[wallName];
      updatedWalls.walls[wallName] = {
        ...currentWallData,
        trackSystem: "",
      } as WallSpecification;
    }
    
    if (field === "passDoorPanels") {
      // Reset quantity when pass doors is set to "None" or empty
      if (actualValue === "" || actualValue === "None") {
        const currentWallData = updatedWalls.walls[wallName];
        updatedWalls.walls[wallName] = {
          ...currentWallData,
          passDoorQuantity: "",
        } as WallSpecification;
      }
    }
    
    if (field === "panelFinishCategory") {
      // Reset specific item when category changes
      // Clear the field entirely if the category doesn't need specific items
      const categoriesWithoutSpecificItems = ["Full Height Marker (Tack) Board", "Uncovered", "C.O.M. Material", "Field Painting by Others"];
      const currentWallData = updatedWalls.walls[wallName];
      updatedWalls.walls[wallName] = {
        ...currentWallData,
        panelFinishSpecificItem: categoriesWithoutSpecificItems.includes(value) ? "" : "",
      } as WallSpecification;
    }
    
    if (onUpdate) {
      onUpdate(updatedWalls);
    }
  };


  const getTrackTypeByModel = (model: string): string => {
    if (["Hufcor 641", "2010", "2010GL", "3010", "3010GL"].includes(model)) {
      return "Curve & Diverter (Individual) Track";
    } else if (["2020", "2020GL", "3020", "3020GL"].includes(model)) {
      return "Multi-Directional Track";
    } else if (["2050e", "3050e", "3030", "3030GL", "2030", "2030GL"].includes(model)) {
      return "Hinged-Pair (Straight Line) Track";
    }
    return "";
  };



  const removeWall = (wallName: string) => {
    const { [wallName]: removedWall, ...remainingWalls } = walls.walls;
    onUpdate({
      ...walls,
      walls: remainingWalls
    });
  };

  const addNewWall = () => {
    const wallCount = Object.keys(walls.walls).length;
    const newWallName = `Wall ${String.fromCharCode(65 + wallCount)}`;
    const newWall: WallSpecification = {
      wallSystemType: "",
      lengthFeet: "",
      lengthInches: "",
      heightFeet: "",
      heightInches: "",
      quantity: "1",
      panelCount: "",
      panelConfiguration: "",
      series: "",
      model: "",
      panelThickness: "",
      panelSkin: "",
      panelDesign: "",
      stcRating: "",
      passDoorPanels: "",
      passDoorQuantity: "",
      panelFinishCategory: "",
      panelFinishSpecificItem: "",
      verticalSeals: "",
      bottomSeals: "",
      topSeals: "",
      initialClosureSystem: "",
      endPanelType: "",
      trackType: "",
      trackSystem: ""
    };
    onUpdate({
      ...walls,
      walls: {
        ...walls.walls,
        [newWallName]: newWall,
      }
    });
  };

  const renameWall = (oldName: string, newName: string) => {
    if (newName && newName !== oldName && !walls.walls[newName]) {
      const wallData = walls.walls[oldName];
      if (wallData) {
        const { [oldName]: removedWall, ...otherWalls } = walls.walls;
        onUpdate({
          ...walls,
          walls: {
            ...otherWalls,
            [newName]: wallData,
          }
        });
      }
    }
    setEditingWallName(null);
    setNewWallName("");
  };


  const toggleWallCollapse = (wallName: string) => {
    setCollapsedWalls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wallName)) {
        newSet.delete(wallName);
      } else {
        newSet.add(wallName);
      }
      return newSet;
    });
  };


  const wallNames = Object.keys(walls.walls);

  if (wallNames.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No walls added yet. Click "Add Wall" to get started.</p>
        <Button
          onClick={addNewWall}
          className="mt-4"
        >
          Add Wall
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Wall Specifications</h2>
        <Button
          onClick={addNewWall}
          className="bg-primary text-white hover:bg-primary/90"
        >
          Add Wall
        </Button>
      </div>
      {wallNames.map((wallName) => {
        const wall = walls.walls[wallName];
        const isCollapsed = collapsedWalls.has(wallName);
        
        if (!wall) {
          return null;
        }
        
        return (
          <Collapsible key={wallName} open={!isCollapsed} onOpenChange={() => toggleWallCollapse(wallName)}>
            <Card className="shadow-sm border">
              <CollapsibleTrigger asChild>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    {editingWallName === wallName ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={newWallName}
                          onChange={(e) => setNewWallName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameWall(wallName, newWallName);
                            }
                          }}
                          onBlur={() => renameWall(wallName, newWallName)}
                          className="text-lg font-semibold"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-lg font-semibold">{wallName}</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingWallName(wallName);
                            setNewWallName(wallName);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-2 ml-4">
                          <Label className="text-sm font-medium">Qty:</Label>
                          <Input
                            value={wall.quantity || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleWallChange(wallName, "quantity", e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="1"
                            className="w-16 h-10 text-center"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWall(wallName);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-8">
                    <BaseSpecs 
                      wall={wall} 
                      wallName={wallName} 
                      onWallChange={handleWallChange} 
                    />

                    {wall.wallSystemType === "Operable Wall" && (
                      <OperableWallSpecs 
                        wall={wall} 
                        wallName={wallName} 
                        onWallChange={handleWallChange} 
                      />
                    )}

                    {wall.wallSystemType === "Glass Wall" && (
                      <GlassWallSpecs 
                        wall={wall} 
                        wallName={wallName} 
                        onWallChange={handleWallChange} 
                      />
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default WallSpecificationForm;