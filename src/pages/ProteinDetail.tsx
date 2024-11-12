import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RotateCw, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import ProteinViewer from '../components/ProteinViewer';

export default function ProteinDetail() {
  const { id } = useParams<{ id: string }>();
  const [viewerError, setViewerError] = useState<Error | null>(null);

  const { data: structure, isLoading, error } = useQuery({
    queryKey: ['structure', id],
    queryFn: () => api.getStructure(id!),
    enabled: !!id,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || viewerError) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Structure</h2>
        <p className="text-gray-600 mb-4">
          {viewerError?.message || 'We couldn\'t load the protein structure. Please try again later.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!structure) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Protein Structure Viewer</h1>
              <p className="text-gray-600 mt-2">
                Method: {structure.experimentalMethod}
                {structure.confidenceScore && (
                  <span className="ml-2">
                    (Confidence Score: {structure.confidenceScore.toFixed(2)})
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                className="p-2 rounded-lg hover:bg-gray-100" 
                title="Reset View"
                onClick={() => window.location.reload()}
              >
                <RotateCw className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100" title="Zoom In">
                <ZoomIn className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100" title="Zoom Out">
                <ZoomOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
        <div className="h-[600px] relative">
          <ProteinViewer 
            pdbUrl={structure.coordinates} 
            onError={setViewerError}
          />
          <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded-lg shadow text-sm">
            <p className="text-gray-600">Tip: Use mouse to rotate, scroll to zoom</p>
          </div>
        </div>
      </div>
    </div>
  );
}