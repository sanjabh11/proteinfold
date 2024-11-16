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

  // Fetch structure and protein data
  const { data: structure, isLoading: structureLoading, error: structureError } = useQuery({
    queryKey: ['structure', id],
    queryFn: () => api.getProteinStructure(id!),
    enabled: !!id
  });

  const { data: proteinData, isLoading: proteinLoading } = useQuery({
    queryKey: ['proteinData', id],
    queryFn: () => api.getProteinInfo(id!),
    enabled: !!id
  });

  // Handle loading and error states
  if (structureLoading || proteinLoading) return <div>Loading...</div>;
  if (structureError) return <div>Error loading protein structure.</div>;

  // Download function
  const handleDownload = async (format: 'pdb' | 'mmcif') => {
    try {
      const response = await fetch(`https://alphafold.ebi.ac.uk/files/AF-${id}-F1-model_v4.${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Protein Structure Viewer</h1>
          <div className="mb-4">
            <p className="text-gray-600">UniProt ID: {structure.pdbId}</p>
            <p className="text-gray-600">Method: {structure.experimentalMethod}</p>
          </div>

          {/* Download buttons */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => handleDownload('pdb')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDB
            </button>
            <button
              onClick={() => handleDownload('mmcif')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download mmCIF
            </button>
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
          <ProteinViewer 
            pdbData={structure.coordinates} 
            style={{ height: '600px' }}
            viewerStyle={viewerStyle}
          />
          
          {/* Annotations Section */}
          <div className="border-t mt-6">
            <AnnotationViewer uniprotId={id!} />
          </div>

          {/* Sequence Viewer */}
          <div className="mt-6">
            <SequenceViewer 
              uniprotId={id!}
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
  );
};

export default ProteinDetail;
