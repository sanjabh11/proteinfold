// src/components/AnnotationViewer.tsx
import React, { useState, useEffect } from 'react';
import { UniProtAnnotation } from '../types/protein';
import LoadingSpinner from './ui/LoadingSpinner';
import ErrorMessage from './ui/ErrorMessage';
import SearchBar from './ui/SearchBar';
import PositionIndicator from './ui/PositionIndicator';
import { uniprotService } from '../services/uniprotService';
import '../styles/components/AnnotationViewer.css';

const ANNOTATION_GROUPS = [
  {
    id: 'functional',
    name: 'Functional Sites',
    types: ['Active site', 'Binding site', 'Modified residue']
  },
  {
    id: 'variants',
    name: 'Variants',
    types: ['Mutagenesis', 'Sequence conflict']
  },
  {
    id: 'domains',
    name: 'Domains & Motifs',
    types: ['Motif', 'Chain']
  },
  {
    id: 'structural',
    name: 'Structural Features',
    types: ['Helix', 'Beta strand', 'Turn']
  },
  {
    id: 'other',
    name: 'Other',
    types: ['Unknown']
  }
];

interface AnnotationViewerProps {
  uniprotId: string;
}

const AnnotationViewer: React.FC<AnnotationViewerProps> = ({ uniprotId }) => {
  const [annotations, setAnnotations] = useState<UniProtAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    fetchAnnotations();
  }, [uniprotId]);

  const fetchAnnotations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await uniprotService.getAnnotations(uniprotId);
      setAnnotations(data);
    } catch (err) {
      setError('Failed to fetch annotations');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchAnnotations} />;

  const filteredAnnotations = annotations.filter(annotation => {
    const matchesSearch = searchTerm === '' || 
      annotation.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      annotation.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = selectedGroup === 'all' || 
      ANNOTATION_GROUPS.find(group => 
        group.id === selectedGroup)?.types.includes(annotation.type);
    
    return matchesSearch && matchesGroup;
  });

  const groupedAnnotations = ANNOTATION_GROUPS.reduce((acc, group) => {
    acc[group.id] = filteredAnnotations.filter(annotation => 
      group.types.includes(annotation.type));
    return acc;
  }, {} as Record<string, UniProtAnnotation[]>);

  return (
    <div className="annotation-viewer">
      <SearchBar 
        value={searchTerm}
        onChange={setSearchTerm}
        selectedGroup={selectedGroup}
        onGroupChange={setSelectedGroup}
      />
      
      {ANNOTATION_GROUPS.map(group => {
        const groupAnnotations = groupedAnnotations[group.id] || [];
        if (groupAnnotations.length === 0) return null;

        return (
          <div key={group.id} className="annotation-group">
            <div 
              className="group-header"
              onClick={() => toggleGroup(group.id)}
            >
              <h3>
                {group.name} ({groupAnnotations.length})
              </h3>
              <span className={`expand-icon ${
                expandedGroups.includes(group.id) ? 'expanded' : ''
              }`}>
                ▼
              </span>
            </div>
            {expandedGroups.includes(group.id) && (
              <div className="group-content">
                {groupAnnotations.map((annotation, index) => (
                  <div key={index} className="annotation-card">
                    <h4>{annotation.type}</h4>
                    {annotation.location && (
                      <PositionIndicator
                        start={annotation.location.start.value}
                        end={annotation.location.end.value}
                        totalLength={465} // Update with actual protein length
                      />
                    )}
                    <p className="description">{annotation.description}</p>
                    <p className="evidence">Evidence: {annotation.evidence}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AnnotationViewer;