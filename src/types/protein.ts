// src/types/protein.ts


export interface UniProtResponse {
  id: string;
  protein: {
    recommendedName?: {
      fullName?: {
        value: string;
      };
    };
  };
  sequence?: {
    value: string;
    length: number;
  };
  structure?: any;
  gene_names?: any[];
  organism_name?: any;
}