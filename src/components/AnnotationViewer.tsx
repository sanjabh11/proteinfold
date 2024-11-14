import React, { useEffect, useState } from 'react';
import { uniprotService } from '../services/uniprotService';
import { Loader2 } from 'lucide-react';

interface AnnotationViewerProps {
  uniprotId: string;
}

const AnnotationViewer: React.FC<AnnotationViewerProps> = ({ uniprotId }) => {
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnnotations = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await uniprotService.getAnnotations(uniprotId);
        setAnnotations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch annotations');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnotations();
  }, [uniprotId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <h3 className="text-lg font-semibold mb-4">Protein Annotations</h3>
      {annotations.map((annotation, index) => (
        <div 
          key={index}
          className="bg-white p-3 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex justify-between items-start">
            <span className="font-medium text-gray-700">{annotation.type}</span>
            <span className="text-sm text-gray-500">
              {annotation.location.start}-{annotation.location.end}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{annotation.description}</p>
          {annotation.evidence && (
            <p className="text-xs text-gray-500 mt-1">
              Evidence: {annotation.evidence}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default AnnotationViewer; 