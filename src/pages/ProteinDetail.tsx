// src/pages/ProteinDetail.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import ProteinViewer from '../components/ProteinViewer';
import AnnotationViewer from '../components/AnnotationViewer';
import SequenceViewer from '../components/SequenceViewer';
import BlastSearch from '../components/BlastSearch';
import { Loader2 } from 'lucide-react';

const ProteinDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [viewerStyle, setViewerStyle] = useState('cartoon');

  const { data: structure, isLoading, error } = useQuery({
    queryKey: ['structure', id],
    queryFn: () => api.getProteinStructure(id!),
    enabled: !!id
  });

  // Fetch protein data including sequence and features
  const { data: proteinData } = useQuery({
    queryKey: ['proteinData', id],
    queryFn: () => api.getProteinInfo(id!), // Assuming this API call fetches the protein sequence and features
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error loading structure</p>
          <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (!structure) return null;

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Protein Structure Viewer</h1>
          <div className="mb-4">
            <p className="text-gray-600">UniProt ID: {structure.pdbId}</p>
            <p className="text-gray-600">Method: {structure.experimentalMethod}</p>
          </div>
          
          {/* Viewer Controls */}
          <div className="mb-4 flex gap-2">
            <select
              value={viewerStyle}
              onChange={(e) => setViewerStyle(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="cartoon">Cartoon</option>
              <option value="surface">Surface</option>
              <option value="ball+stick">Ball & Stick</option>
              <option value="ribbon">Ribbon</option>
            </select>
          </div>

          {/* 3D Viewer */}
          <div className="relative">
            <ProteinViewer 
              pdbData={structure.coordinates} 
              style={{ height: '600px' }}
              viewerStyle={viewerStyle}
            />
            
            {/* Annotations Section */}
            <div className="border-t mt-6">
              <AnnotationViewer uniprotId={structure.pdbId} />
            </div>

            {/* Sequence Viewer */}
            <div className="mt-6">
              <SequenceViewer 
                uniprotId={structure.pdbId} 
                sequence={proteinData?.sequence} 
                features={proteinData?.features} 
              />
            </div>

            {/* BLAST Search */}
            {proteinData?.sequence && (
              <div className="mt-6">
                <BlastSearch sequence={proteinData.sequence} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProteinDetail;