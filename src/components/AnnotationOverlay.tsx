import React, { useEffect, useState, useCallback } from 'react';
import * as NGL from 'ngl';
import { Stage } from 'ngl';
import { Tooltip } from './Tooltip';

interface Annotation {
  id: string;
  label: string;
  residueRange: [number, number];
  type: string;
  description: string;
  color?: string;
}

interface Position {
  x: number;
  y: number;
}

interface AnnotationOverlayProps {
  stage: Stage;
  structure: any; // NGL Structure component
  annotations: Annotation[];
  onAnnotationClick?: (annotation: Annotation) => void;
}

export const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
  stage,
  structure,
  annotations,
  onAnnotationClick
}) => {
  const [annotationPositions, setAnnotationPositions] = useState<Map<string, Position>>(new Map());
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [isStageReady, setIsStageReady] = useState(false);

  const updateAnnotationPositions = useCallback(() => {
    if (!structure?.structure || !stage || !isStageReady) return;
    
    const newPositions = new Map<string, Position>();
    
    annotations.forEach(annotation => {
      const [startResidue, endResidue] = annotation.residueRange;
      const selectionString = `${startResidue}-${endResidue}:A and .CA`;
      
      try {
        const selection = structure.structure.getAtoms(selectionString);
        if (selection && selection.length > 0) {
          const center = new Float32Array(3);
          selection.center(center);
          
          const position = stage.projectPoint(center[0], center[1], center[2]);
          newPositions.set(annotation.id, {
            x: position.x,
            y: position.y
          });
        }
      } catch (error) {
        console.warn(`Failed to process annotation ${annotation.id}:`, error);
      }
    });

    setAnnotationPositions(newPositions);
  }, [stage, structure, annotations, isStageReady]);

  // Check if stage is ready
  useEffect(() => {
    if (!stage) return;

    // Wait for stage to be fully initialized
    const checkStage = () => {
      if (stage.viewer && stage.signals) {
        setIsStageReady(true);
      } else {
        setTimeout(checkStage, 100);
      }
    };

    checkStage();
  }, [stage]);

  useEffect(() => {
    if (!structure?.structure || !stage || !isStageReady) return;
    
    // Update positions when annotations change
    updateAnnotationPositions();

    // Add listener for stage rendering
    const handleRender = () => {
      updateAnnotationPositions();
    };

    try {
      stage.signals.rendered.add(handleRender);
      return () => {
        if (stage?.signals?.rendered) {
          stage.signals.rendered.remove(handleRender);
        }
      };
    } catch (error) {
      console.warn('Failed to add render listener:', error);
      return undefined;
    }
  }, [stage, structure, updateAnnotationPositions, isStageReady]);

  const handleAnnotationHover = (annotationId: string | null) => {
    setHoveredAnnotation(annotationId);
  };

  const handleAnnotationClick = (annotation: Annotation) => {
    if (!structure?.structure || !stage || !isStageReady) return;

    if (onAnnotationClick) {
      onAnnotationClick(annotation);
    }

    // Highlight the residue range in the structure
    structure.removeAllRepresentations();
    
    // Add default representation
    structure.addRepresentation('cartoon', {
      sele: 'all',
      color: 'chainid'
    });

    // Add highlight representation
    structure.addRepresentation('ball+stick', {
      sele: `${annotation.residueRange[0]}-${annotation.residueRange[1]}:A`,
      color: annotation.color || '#FFD700'
    });

    try {
      const selectionString = `${annotation.residueRange[0]}-${annotation.residueRange[1]}:A and .CA`;
      const selection = structure.structure.getAtoms(selectionString);
      if (selection && selection.length > 0) {
        const center = new Float32Array(3);
        selection.center(center);
        stage.animationControls.zoomTo(center, 2000);
      }
    } catch (error) {
      console.warn('Failed to center on annotation:', error);
    }
  };

  if (!isStageReady) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {annotations.map(annotation => {
        const position = annotationPositions.get(annotation.id);
        if (!position) return null;

        return (
          <div
            key={annotation.id}
            className="annotation-marker pointer-events-auto"
            style={{
              position: 'absolute',
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
            onMouseEnter={() => handleAnnotationHover(annotation.id)}
            onMouseLeave={() => handleAnnotationHover(null)}
            onClick={() => handleAnnotationClick(annotation)}
          >
            <div className="w-4 h-4 bg-yellow-400 rounded-full border-2 border-white shadow-lg" />
            
            {hoveredAnnotation === annotation.id && (
              <Tooltip
                content={
                  <div className="p-2">
                    <div className="font-bold">{annotation.label}</div>
                    <div className="text-sm">{annotation.description}</div>
                    <div className="text-xs text-gray-500">
                      Residues {annotation.residueRange[0]}-{annotation.residueRange[1]}
                    </div>
                  </div>
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
};