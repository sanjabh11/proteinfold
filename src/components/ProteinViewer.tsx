import React, { useEffect, useRef, useState } from 'react';
import * as NGL from 'ngl';
import { Loader2, Pause, Play } from 'lucide-react';

interface ProteinViewerProps {
  pdbData: string;
  style?: React.CSSProperties;
  viewerStyle?: string;
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

const ProteinViewer: React.FC<ProteinViewerProps> = ({ 
  pdbData, 
  style,
  viewerStyle = 'cartoon'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const componentRef = useRef<any>(null);
  const controlsRef = useRef<CustomMouseControls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const animationRef = useRef<number | null>(null);

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

        // Create NGL Stage with specific parameters
        stage = new NGL.Stage(containerRef.current, {
          backgroundColor: 'white',
          quality: 'medium',
          antialias: true,
          webgl: true,
          impostor: true,
          camera: 'perspective',
          clipDist: 10,
          fogNear: 100,
          fogFar: 100,
          cameraType: 'perspective',
          sampleLevel: 0
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

          // Add representation based on style
          component.removeAllRepresentations();
          
          switch (viewerStyle) {
            case 'surface':
              component.addRepresentation('surface', {
                opacity: 0.7,
                colorScheme: 'chainid'
              });
              break;
            case 'ball+stick':
              component.addRepresentation('ball+stick', {
                colorScheme: 'element'
              });
              break;
            case 'ribbon':
              component.addRepresentation('ribbon', {
                colorScheme: 'chainid'
              });
              break;
            case 'cartoon':
            default:
              component.addRepresentation('cartoon', {
                colorScheme: 'chainid'
              });
          }

          // Center and zoom
          component.autoView();
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
  }, [pdbData, viewerStyle]);

  // Update the animation useEffect
  useEffect(() => {
    if (!stageRef.current?.viewer?.controls) return;

    const animate = () => {
      const controls = stageRef.current?.viewer?.controls;
      if (stageRef.current && isSpinning && controls) {
        // Use direct rotation on controls
        controls.rotate(0.01, 0);
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
  }, [isSpinning]);

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
      
      {/* Add Animation Controls */}
      <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded-lg shadow">
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