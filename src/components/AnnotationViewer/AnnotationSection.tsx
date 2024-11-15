// src/components/AnnotationViewer/AnnotationSection.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AnnotationSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
}

export const AnnotationSection: React.FC<AnnotationSectionProps> = ({
  title,
  count,
  children
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium">{title}</span>
          <span className="text-sm text-gray-500">({count})</span>
        </div>
      </button>
      {isExpanded && (
        <div className="p-4 border-t">{children}</div>
      )}
    </div>
  );
};