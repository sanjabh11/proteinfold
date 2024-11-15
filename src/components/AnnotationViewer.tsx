// src/components/AnnotationViewer.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { uniprotService } from '../services/uniprotService';

interface AnnotationViewerProps {
  uniprotId: string;
}

const AnnotationViewer: React.FC<AnnotationViewerProps> = ({ uniprotId }) => {
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAnnotations = async () => {
      if (!uniprotId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await uniprotService.getAnnotations(uniprotId);
        setAnnotations(data);
        // Expand the first section by default
        if (data.length > 0) {
          setExpandedSections(new Set([data[0].type]));
        }
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error loading annotations: {error}</p>
      </div>
    );
  }

  return (
    <div className="annotations-container p-4">
      <h3 className="text-xl font-bold mb-6">Protein Annotations</h3>
      <div className="space-y-2">
        {Object.entries(groupedAnnotations).map(([type, items]) => (
          <div key={type} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(type)}
              className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 text-left"
            >
              <div className="flex items-center gap-2">
                {expandedSections.has(type) ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
                <span className="font-medium">{type}</span>
                <span className="text-sm text-gray-500">({items.length})</span>
              </div>
            </button>
            
            {expandedSections.has(type) && (
              <div className="p-4 space-y-2 bg-white">
                {items.map((annotation, index) => {
                  // Skip rendering if there's no meaningful description
                  if (annotation.description === 'No description available' && 
                      !annotation.location.start && 
                      !annotation.location.end) {
                    return null;
                  }

                  return (
                    <div 
                      key={`${type}-${index}`} 
                      className="annotation-item border-l-2 border-gray-200 pl-3 py-1"
                    >
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnnotationViewer;