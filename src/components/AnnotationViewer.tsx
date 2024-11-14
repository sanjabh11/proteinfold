// src/components/AnnotationViewer.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { uniprotService } from '../services/uniprotService';

interface AnnotationViewerProps {
  uniprotId: string;
}

const AnnotationViewer: React.FC<AnnotationViewerProps> = ({ uniprotId }) => {
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnnotations = async () => {
      if (!uniprotId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await uniprotService.getAnnotations(uniprotId);
        setAnnotations(data);
      } catch (err) {
        console.error('Error fetching annotations:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch annotations');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnotations();
  }, [uniprotId]);

  const groupedAnnotations = useMemo(() => {
    return annotations.reduce((acc, annotation) => {
      const type = annotation.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(annotation);
      return acc;
    }, {} as Record<string, typeof annotations>);
  }, [annotations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">Error loading annotations: {error}</div>
    );
  }

  return (
    <div className="annotations-container p-4">
      <h3 className="text-xl font-bold mb-6">Protein Annotations</h3>
      <div className="space-y-6">
        {Object.entries(groupedAnnotations).map(([type, items]) => (
          <div key={type} className="annotation-group">
            <h4 className="text-lg font-semibold mb-2">{type}</h4>
            <div className="ml-4 space-y-2">
              {items.map((annotation, index) => {
                // Skip rendering if there's no meaningful description
                if (annotation.description === 'No description available' && 
                    !annotation.location.start && 
                    !annotation.location.end) {
                  return null;
                }

                return (
                  <div key={`${type}-${index}`} className="annotation-item">
                    {annotation.description !== 'No description available' && (
                      <p className="text-gray-800">{annotation.description}</p>
                    )}
                    {(annotation.location.start !== 0 || annotation.location.end !== 0) && (
                      <p className="text-sm text-gray-600">
                        Position: {annotation.location.start} - {annotation.location.end}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnnotationViewer;