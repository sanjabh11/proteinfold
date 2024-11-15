// src/types/protein.ts
export interface AnnotationGroup {
  id: string;
  name: string;
  types: string[];
}

export interface UniProtAnnotation {
  type: string;
  location: {
    start: { value: number };
    end: { value: number };
  } | null;
  description: string;
  evidence?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}