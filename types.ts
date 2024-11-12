// types.ts

export interface Protein {
  id: string;
  name: string;
  description: string;
  sequence: string;
  length: number;
  organism: string;
  uniprotId: string;
}

export interface StructureData {
  pdbId: string;
  resolution: number;
  experimentalMethod: string;
  confidenceScore: number;
  coordinates: string;
  lastUpdated: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}