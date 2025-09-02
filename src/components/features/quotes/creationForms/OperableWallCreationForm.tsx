import React from "react";
import { WallSpecification, isOperableWall } from "@/lib/types";
import { OperableWallFormAdapter } from "@/components/features/quotes/shared/components/OperableWallFormAdapter";

interface OperableWallCreationFormProps {
  wall: WallSpecification;
  wallName: string;
  onWallChange: (wallName: string, fieldOrUpdates: string | Record<string, string>, value?: string) => void;
}

const OperableWallCreationForm = ({ wall, wallName, onWallChange }: OperableWallCreationFormProps) => {
  if (!isOperableWall(wall)) {
    return <div>This form is only for Operable Walls</div>;
  }

  // Adapter function to handle the different signature expected by creation form
  const handleWallChange = (wallName: string, updates: Record<string, string>) => {
    onWallChange(wallName, updates);
  };

  return (
    <OperableWallFormAdapter
      wallName={wallName}
      wall={wall}
      onWallChange={handleWallChange}
      showFullFields={true}
      layout="creation"
    />
  );
};

export default OperableWallCreationForm;