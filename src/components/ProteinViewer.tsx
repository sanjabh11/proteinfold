import React, { useEffect, useRef, useState } from 'react';
import * as NGL from 'ngl';
import { Loader2, Pause, Play, Tag, Ruler, Layers } from 'lucide-react';

interface ProteinViewerProps {
  pdbData: string;
  style?: React.CSSProperties;
  viewerStyle?: string;
  colorScheme?: 'chainid' | 'element' | 'residue' | 'secondary-structure' | 'hydrophobicity' | 'conservation';
  quality?: 'low' | 'medium' | 'high';
  showLabels?: boolean;
  measurements?: boolean;
  surfaceAnalysis?: boolean;
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
  surfaceAnalysis = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const componentRef = useRef<any>(null);
  const controlsRef = useRef<CustomMouseControls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
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

        // Wait for stage initialization
        await new Promise(resolve => setTimeout(resolve, 100));

        stageRef.current = stage;
        
        // Initialize custom controls after stage is ready
        controlsRef.current = new CustomMouseControls(stage);
        cleanup = controlsRef.current.initEventListeners();

        // Create a blob URL for the PDB data
        const blob = new Blob([pdbData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        try {
          // Load structure with specific parameters
          const component = await stage.loadFile(url, { 
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

          // Add labels if enabled
          if (showingLabels) {
            componentRef.current.addRepresentation('label', {
              sele: 'backbone',
              color: '#000000',
              name: 'residue',
              labelType: 'residue'
            });
          }

          componentRef.current.autoView();
          setLoading(false);
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error('Error loading structure:', err);
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
    };
  }, [pdbData, viewerStyle, currentColorScheme, currentQuality, showingLabels]);

  // Update animation with speed control
  useEffect(() => {
    if (!stageRef.current?.viewer?.controls) return;

    const animate = () => {
      const controls = stageRef.current?.viewer?.controls;
      if (stageRef.current && isSpinning && controls) {
        controls.rotate(rotationSpeed, 0);
        stageRef.current.viewer.requestRender();
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (isSpinning) {
      animate();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isSpinning, rotationSpeed]);

  const handleMeasurement = (event: MouseEvent) => {
    if (!measurementState.active) return;

    const picked = stageRef.current?.pickingProxy(event);
    if (!picked) return;

    setMeasurementState(prev => ({
      ...prev,
      points: [...prev.points, picked.position]
    }));

    if (measurementState.type === 'distance' && measurementState.points.length === 2) {
      // Calculate and display distance
      const distance = calculateDistance(measurementState.points[0], measurementState.points[1]);
      addDistanceLabel(distance, measurementState.points);
    }
  };

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

  return (
    <div className="relative">
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '500px',
          position: 'relative',
          ...style
        }}
        className="bg-gray-50 rounded-lg overflow-hidden"
      />
      
      {/* Enhanced Controls Panel */}
      <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded-lg shadow space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setIsSpinning(!isSpinning)}
            className="p-2 rounded hover:bg-gray-100"
            title={isSpinning ? "Stop Spinning" : "Start Spinning"}
          >
            {isSpinning ? 
              <Pause className="h-5 w-5" /> : 
              <Play className="h-5 w-5" />
            }
          </button>
          <input
            type="range"
            min="0.001"
            max="0.05"
            step="0.001"
            value={rotationSpeed}
            onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
            className="w-24"
            title="Rotation Speed"
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
      
      {/* Keep existing loading and error states */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="text-red-500 text-center p-4">
            <p className="font-semibold">Error loading structure</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProteinViewer;