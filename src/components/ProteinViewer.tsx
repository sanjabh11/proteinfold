import React, { useEffect, useRef } from 'react';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';

interface ProteinViewerProps {
  pdbUrl: string;
  className?: string;
  onError?: (error: Error) => void;
}

export default function ProteinViewer({ pdbUrl, className = '', onError }: ProteinViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginRef = useRef<PluginUIContext>();

  useEffect(() => {
    if (!containerRef.current) return;

    const init = async () => {
      try {
        const plugin = await createPluginUI(containerRef.current!, {
          ...DefaultPluginUISpec,
          layout: {
            initial: {
              isExpanded: false,
              showControls: true,
              controlsDisplay: 'reactive',
            },
          },
          components: {
            controls: { left: true, right: true, top: true, bottom: false },
            remoteState: { autoAttach: true },
          },
        });

        pluginRef.current = plugin;

        await plugin.builders.structure.loadStructure(pdbUrl, 'mmcif', {
          representationStyle: 'cartoon',
          colorTheme: { name: 'chain-id' },
        });

        const canvas = plugin.canvas3d!;
        canvas.setProps({
          camera: {
            fov: 45,
            position: [0, 0, 100],
          },
        });

      } catch (error) {
        console.error('Error initializing protein viewer:', error);
        onError?.(error as Error);
      }
    };

    init();

    return () => {
      if (pluginRef.current) {
        pluginRef.current.dispose();
      }
    };
  }, [pdbUrl, onError]);

  return (
    <div className={`relative w-full h-[600px] bg-gray-50 rounded-lg overflow-hidden ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}