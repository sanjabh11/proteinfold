// src/components/ProteinViewer.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as NGL from 'ngl';
import { Loader2, Pause, Play, Tag, Ruler, Layers } from 'lucide-react';
import { MeasurementTools } from './StructureAnalysis/MeasurementTools';
import { Measurement } from '../types/measurements';
import { AnnotationOverlay } from './AnnotationOverlay';
import './ProteinViewer.css';

interface ProteinViewerProps {
  pdbData: string;
  style?: React.CSSProperties;
  viewerStyle?: string;
  colorScheme?: 'chainid' | 'element' | 'residue' | 'secondary-structure' | 'hydrophobicity' | 'conservation';
  quality?: 'low' | 'medium' | 'high';
  showLabels?: boolean;
  measurements?: boolean;
  surfaceAnalysis?: boolean;
  onMeasurement?: (measurement: Measurement) => void;
  annotations?: Array<{
    id: string;
    label: string;
    residueRange: [number, number];
    type: string;
    description: string;
    color?: string;
  }>;
  onAnnotationClick?: (annotation: any) => void;
}

interface MeasurementState {
  type: 'distance' | 'angle' | 'surface';
  active: boolean;
  points: number[][];
}

class CustomMouseControls {
  stage: any;
  mouse: { x: number; y: number; moving: boolean; buttons: number };
  
  constructor(stage: any) {
    this.stage = stage;
    this.mouse = {
      x: 0,
      y: 0,
      moving: false,
      buttons: 0
    };
  }

  initEventListeners() {
    const container = this.stage.viewer.container;
    const viewer = this.stage.viewer;

    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      if (this.mouse.moving && this.mouse.buttons > 0) {
        const deltaX = event.clientX - this.mouse.x;
        const deltaY = event.clientY - this.mouse.y;
        
        if (this.mouse.buttons === 1) {
          viewer.controls.rotate(deltaX * 0.005, deltaY * 0.005);
        } else if (this.mouse.buttons === 2) {
          viewer.controls.zoom(deltaY * 0.1);
        } else if (this.mouse.buttons === 4) {
          viewer.controls.translate(deltaX, deltaY, 0);
        }
      }
      
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      viewer.controls.zoom(event.deltaY * -0.001);
    };

    const handleMouseDown = (event: MouseEvent) => {
      event.preventDefault();
      this.mouse.buttons = event.buttons;
      this.mouse.moving = true;
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
    };

    const handleMouseUp = () => {
      this.mouse.buttons = 0;
      this.mouse.moving = false;
    };

    // Add event listeners with proper options
    container.addEventListener('mousemove', handleMouseMove, { passive: false });
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown, { passive: false });
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
    };
  }
}

// Add utility functions for measurements
const calculateDistance = (point1: number[], point2: number[]): number => {
  const dx = point2[0] - point1[0];
  const dy = point2[1] - point1[1];
  const dz = point2[2] - point1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const addDistanceLabel = (distance: number, points: number[][]) => {
  if (!points || points.length !== 2) return;

  const [point1, point2] = points;
  const midpoint = [
    (point1[0] + point2[0]) / 2,
    (point1[1] + point2[1]) / 2,
    (point1[2] + point2[2]) / 2
  ];

  // Create label element
  const label = document.createElement('div');
  label.className = 'absolute bg-white/90 px-2 py-1 rounded text-sm';
  label.textContent = `${distance.toFixed(2)} Å`;

  // Position label at midpoint
  label.style.left = `${midpoint[0]}px`;
  label.style.top = `${midpoint[1]}px`;
  label.style.transform = 'translate(-50%, -50%)';

  // Add label to container
  const container = document.querySelector('.measurement-labels');
  if (container) {
    container.appendChild(label);
  }
};

const ProteinViewer: React.FC<ProteinViewerProps> = ({ 
  pdbData, 
  style,
  viewerStyle = 'cartoon',
  colorScheme = 'chainid',
  quality = 'medium',
  showLabels = false,
  measurements = false,
  surfaceAnalysis = false,
  onMeasurement,
  annotations,
  onAnnotationClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const componentRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);
  const [currentColorScheme, setCurrentColorScheme] = useState(colorScheme);
  const [currentQuality, setCurrentQuality] = useState(quality);
  const [showingLabels, setShowingLabels] = useState(showLabels);
  const [rotationSpeed, setRotationSpeed] = useState(0.01);
  const [measurementState, setMeasurementState] = useState<MeasurementState>({
    type: 'distance',
    active: false,
    points: []
  });
  const [surfaceVisible, setSurfaceVisible] = useState(false);
  const [mouseState, setMouseState] = useState({
    x: 0,
    y: 0,
    moving: false,
    buttons: 0
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(0.5);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!stageRef.current?.viewer?.controls) return;

    event.preventDefault();
    if (mouseState.moving && mouseState.buttons > 0) {
      const deltaX = event.clientX - mouseState.x;
      const deltaY = event.clientY - mouseState.y;
      
      const controls = stageRef.current.viewer.controls;
      if (mouseState.buttons === 1) {
        controls.rotate(deltaX * 0.005, deltaY * 0.005);
      } else if (mouseState.buttons === 2) {
        controls.zoom(deltaY * 0.1);
      } else if (mouseState.buttons === 4) {
        controls.translate(deltaX, deltaY, 0);
      }
    }

    setMouseState(prev => ({
      ...prev,
      x: event.clientX,
      y: event.clientY
    }));
  }, [mouseState]);

  const handleMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    setMouseState(prev => ({
      ...prev,
      buttons: event.buttons,
      moving: true,
      x: event.clientX,
      y: event.clientY
    }));
  };

  const handleMouseUp = () => {
    setMouseState(prev => ({
      ...prev,
      buttons: 0,
      moving: false
    }));
  };

  // Modify the initialization effect
  useEffect(() => {
    let mounted = true;
    let stage: any = null;
    let cleanup: (() => void) | null = null;

    const initViewer = async () => {
      if (!containerRef.current || !pdbData) {
        setError('No PDB data available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Clean PDB data before loading
        const cleanedPDB = pdbData
          .split('\n')
          .filter(line => line.trim().length > 0)
          .join('\n');

        // Create NGL Stage with updated parameters
        stage = new NGL.Stage(containerRef.current, {
          backgroundColor: 'white',
          quality: currentQuality,
          antialias: true,
          webgl: true,
          impostor: true,
          camera: 'perspective',
          clipDist: 10,
          fogNear: 100,
          fogFar: 100,
          cameraType: 'perspective',
          sampleLevel: currentQuality === 'high' ? 2 : currentQuality === 'medium' ? 1 : 0
        });

        // Initialize controls
        stage.mouseControls.add('drag-rotate', () => true);
        stage.mouseControls.add('scroll-zoom', () => true);
        stage.mouseControls.add('drag-pan', () => true);

        // Wait for stage initialization
        await new Promise(resolve => setTimeout(resolve, 100));

        stageRef.current = stage;
        
        // Initialize custom controls after stage is ready
        const controls = new CustomMouseControls(stage);
        cleanup = controls.initEventListeners();

        // Create a blob with the cleaned PDB data
        const blob = new Blob([cleanedPDB], { type: 'text/plain' });
        const file = new File([blob], 'structure.pdb', { type: 'text/plain' });

        try {
          // Load structure with specific parameters
          const component = await stage.loadFile(file, { 
            ext: 'pdb',
            firstModelOnly: true,
            asTrajectory: false
          });

          componentRef.current = component;

          // Update representation with new options
          componentRef.current.removeAllRepresentations();
          
          const representationParams = {
            quality: currentQuality,
            colorScheme: currentColorScheme,
            showLabels: showingLabels ? 'all' : 'none'
          };

          // Add main structure representation
          switch (viewerStyle) {
            case 'surface':
              componentRef.current.addRepresentation('surface', {
                ...representationParams,
                opacity: 0.7,
                colorScheme: currentColorScheme
              });
              break;
            case 'ball+stick':
              componentRef.current.addRepresentation('ball+stick', {
                ...representationParams,
                multipleBond: true,
                colorScheme: currentColorScheme === 'chainid' ? 'element' : currentColorScheme
              });
              break;
            case 'ribbon':
              componentRef.current.addRepresentation('ribbon', {
                ...representationParams,
                colorScheme: currentColorScheme
              });
              break;
            case 'cartoon':
            default:
              componentRef.current.addRepresentation('cartoon', {
                ...representationParams,
                colorScheme: currentColorScheme
              });
          }

          // Add annotation highlights if there are annotations
          if (annotations && annotations.length > 0) {
            annotations.forEach(annotation => {
              const [startResidue, endResidue] = annotation.residueRange;
              const selectionString = `${startResidue}-${endResidue}:A`;

              // Add highlight representation for the annotation
              componentRef.current.addRepresentation(viewerStyle === 'surface' ? 'surface' : 'cartoon', {
                sele: selectionString,
                color: annotation.color || '#FFD700',
                opacity: viewerStyle === 'surface' ? 0.7 : 1,
                quality: currentQuality
              });

              // Add ball+stick representation for better visibility
              componentRef.current.addRepresentation('ball+stick', {
                sele: selectionString + ' and sidechainAttached',
                color: annotation.color || '#FFD700',
                aspectRatio: 1.5,
                multipleBond: true,
                quality: currentQuality
              });
            });
          }

          componentRef.current.autoView();
          setLoading(false);
        } catch (err) {
          console.error('Error loading structure:', err);
          throw new Error('Failed to load structure file');
        }
      } catch (err) {
        console.error('Error initializing viewer:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load structure');
          setLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
      if (stageRef.current) {
        stageRef.current.dispose();
        stageRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [pdbData, viewerStyle, currentColorScheme, currentQuality, showingLabels]);

  // Separate animation effect
  useEffect(() => {
    if (!stageRef.current) return;

    let animationId: number | null = null;
    const stage = stageRef.current;

    const animate = () => {
      if (isAnimating && stage) {
        stage.spinAnimation.axis.set(0, 1, 0);
        stage.spinAnimation.angle = animationSpeed;
        stage.viewer.requestRender();
        animationId = requestAnimationFrame(animate);
      }
    };

    if (isAnimating) {
      stage.setParameters({ impostor: true });
      stage.spinAnimation.axis.set(0, 1, 0);
      animate();
    } else {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      if (stage.spinAnimation) {
        stage.spinAnimation.angle = 0;
      }
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isAnimating, animationSpeed]);

  const handleMeasurement = useCallback((measurement: Measurement) => {
    if (onMeasurement) {
      onMeasurement(measurement);
    }
    
    // Add visual representation of measurement
    if (measurement.type === 'distance') {
      const shape = new NGL.Shape('measurement-' + measurement.id);
      shape.addCylinder(
        measurement.points[0],
        measurement.points[1],
        [0.5, 0.5, 1],
        0.1
      );
      const shapeComp = stageRef.current.addComponentFromObject(shape);
      shapeComp.addRepresentation('buffer');
    }
  }, [onMeasurement]);

  const toggleSurfaceAnalysis = () => {
    if (!componentRef.current) return;
    
    if (surfaceVisible) {
      componentRef.current.removeRepresentation('surface');
    } else {
      componentRef.current.addRepresentation('surface', {
        opacity: 0.7,
        colorScheme: 'hydrophobicity',
        surfaceType: 'sas'
      });
    }
    setSurfaceVisible(!surfaceVisible);
  };

  const handleAnnotationClick = useCallback((annotation: any) => {
    if (!componentRef.current || !stageRef.current) return;

    // Get the residue range
    const [startResidue, endResidue] = annotation.residueRange;
    const selectionString = `${startResidue}-${endResidue}:A`;

    // Center view on the selected residues
    componentRef.current.autoView(selectionString, 2000);

    // Create a temporary highlight effect
    const shape = new NGL.Shape('highlight-' + annotation.id);
    const selection = new NGL.Selection(selectionString);
    const atoms = componentRef.current.structure.getAtomSetWithinSelection(selection);
    const positions = atoms.atomCenter();
    
    shape.addSphere(positions, [1, 0.8, 0], 3);
    const shapeComp = stageRef.current.addComponentFromObject(shape);
    shapeComp.addRepresentation('buffer');

    // Remove highlight after animation
    setTimeout(() => {
      stageRef.current?.removeComponent(shapeComp);
    }, 2000);

    // Call the onAnnotationClick callback if provided
    if (onAnnotationClick) {
      onAnnotationClick(annotation);
    }
  }, [onAnnotationClick]);

  useEffect(() => {
    if (!stageRef.current || !annotations) return;

    const stage = stageRef.current;
    
    // Add picking event handler
    const pickingProxy = stage.mouseControls.add('clickPick-left', (stage: any, pickingProxy: any) => {
      if (pickingProxy && annotations) {
        const residueIndex = pickingProxy.getResidueIndex();
        // Find if the clicked residue is part of any annotation
        const clickedAnnotation = annotations.find(
          annotation => residueIndex >= annotation.residueRange[0] && 
                       residueIndex <= annotation.residueRange[1]
        );
        
        if (clickedAnnotation) {
          handleAnnotationClick(clickedAnnotation);
        }
      }
    });

    return () => {
      if (stage.mouseControls) {
        stage.mouseControls.remove('clickPick-left');
      }
    };
  }, [annotations, handleAnnotationClick]);

  return (
    <div 
      className="protein-viewer-container relative" 
      style={{ ...style, position: 'relative' }} 
      ref={containerRef}
    >
      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg shadow">
            {error}
          </div>
        </div>
      )}

      {/* Annotation information panel */}
      {annotations && annotations.length > 0 && (
        <div className="absolute top-4 right-4 bg-white/90 p-4 rounded-lg shadow max-w-xs space-y-2">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Annotations
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {annotations.map(annotation => (
              <button
                key={annotation.id}
                onClick={() => handleAnnotationClick(annotation)}
                className="w-full text-left p-2 rounded hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: annotation.color || '#FFD700' }}
                  />
                  <span className="font-medium text-sm">{annotation.label}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {annotation.description}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Residues {annotation.residueRange[0]}-{annotation.residueRange[1]}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls panel */}
      <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded-lg shadow space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setIsAnimating(!isAnimating)}
            className={`flex items-center gap-2 p-2 rounded ${
              isAnimating ? 'bg-blue-100' : 'hover:bg-gray-100'
            }`}
            title={isAnimating ? "Stop Animation" : "Start Animation"}
          >
            {isAnimating ? (
              <>
                <Pause className="h-5 w-5" />
                <span>Stop Animation</span>
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                <span>Start Animation</span>
              </>
            )}
          </button>
          
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
            className="w-24"
            title="Animation Speed"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={currentColorScheme}
            onChange={(e) => setCurrentColorScheme(e.target.value as any)}
            className="text-sm px-2 py-1 rounded border"
          >
            <option value="chainid">Chain</option>
            <option value="element">Element</option>
            <option value="residue">Residue</option>
            <option value="secondary-structure">Secondary Structure</option>
          </select>
          
          <select
            value={currentQuality}
            onChange={(e) => setCurrentQuality(e.target.value as any)}
            className="text-sm px-2 py-1 rounded border"
          >
            <option value="low">Low Quality</option>
            <option value="medium">Medium Quality</option>
            <option value="high">High Quality</option>
          </select>
          
          <button
            onClick={() => setShowingLabels(!showingLabels)}
            className={`p-2 rounded ${showingLabels ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            title="Toggle Labels"
          >
            <Tag className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2">
          <select
            value={measurementState.type}
            onChange={(e) => setMeasurementState(prev => ({
              ...prev,
              type: e.target.value as 'distance' | 'angle' | 'surface'
            }))}
            className="text-sm px-2 py-1 rounded border"
          >
            <option value="distance">Distance</option>
            <option value="angle">Angle</option>
            <option value="surface">Surface Area</option>
          </select>
          
          <button
            onClick={() => setMeasurementState(prev => ({
              ...prev,
              active: !prev.active
            }))}
            className={`p-2 rounded ${measurementState.active ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
            title="Toggle Measurements"
          >
            <Ruler className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={toggleSurfaceAnalysis}
          className={`p-2 rounded ${surfaceVisible ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
          title="Toggle Surface Analysis"
        >
          <Layers className="h-5 w-5" />
        </button>
      </div>
      
      {/* Add AnnotationOverlay */}
      {stageRef.current && componentRef.current && annotations && (
        <AnnotationOverlay
          stage={stageRef.current}
          structure={componentRef.current}
          annotations={annotations}
          onAnnotationClick={onAnnotationClick}
        />
      )}
      
      {/* Keep existing loading and error states */}
      
      {stageRef.current && (
        <MeasurementTools
          stage={stageRef.current}
          onMeasurement={handleMeasurement}
        />
      )}
    </div>
  );
};

export default ProteinViewer;