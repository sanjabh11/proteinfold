// api.ts

import axios, { AxiosError } from 'axios';
import { Protein, StructureData, ApiResponse } from '../types';

const ALPHAFOLD_API = 'https://alphafold.ebi.ac.uk/api';
const UNIPROT_API = 'https://rest.uniprot.org/uniprotkb';

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Type for UniProt API response
interface UniProtResponse {
  results: Array<{
    primaryAccession: string;
    protein: {
      recommendedName?: {
        fullName?: { value: string };
        shortName?: { value: string };
      };
      submittedName?: Array<{
        fullName?: { value: string };
      }>;
    };
    sequence: {
      value: string;
      length: number;
    };
    organism: {
      scientificName: string;
    };
  }>;
}

// Type for AlphaFold API response
interface AlphaFoldResponse {
  entryId: string;
  confidenceScore: number;
  experimentalMethod: string;
  resolution?: number;
  cifUrl: string;
}

export const api = {
  /**
   * Search for proteins using UniProt API
   * @param query Search query string
   * @param limit Number of results to return (default: 10)
   * @returns Promise<Protein[]>
   * @throws ApiError
   */
  async searchProteins(query: string, limit: number = 10): Promise<Protein[]> {
    try {
      const response = await axios.get<UniProtResponse>(`${UNIPROT_API}/search`, {
        params: {
          query,
          format: 'json',
          fields: 'id,protein_name,organism_name,sequence,length,gene_names,structure_3d',
          size: limit
        },
        timeout: 5000 // 5 second timeout
      });

      return response.data.results.map((item): Protein => ({
        id: item.primaryAccession,
        name: item.protein.recommendedName?.fullName?.value || 
              item.protein.submittedName?.[0]?.fullName?.value || 
              'Unknown protein',
        description: item.protein.recommendedName?.shortName?.value || '',
        sequence: item.sequence.value,
        length: item.sequence.length,
        organism: item.organism.scientificName,
        uniprotId: item.primaryAccession
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          `Failed to search proteins: ${error.message}`,
          error.response?.status,
          error.response?.data
        );
      }
      throw new ApiError('Failed to search proteins: Unknown error');
    }
  },

  /**
   * Get structure data for a protein using AlphaFold API
   * @param uniprotId UniProt ID of the protein
   * @returns Promise<StructureData>
   * @throws ApiError
   */
  async getStructure(uniprotId: string): Promise<StructureData> {
    try {
      // First, check if the structure exists
      const metadataResponse = await axios.get<AlphaFoldResponse>(
        `${ALPHAFOLD_API}/prediction/${uniprotId}`,
        { timeout: 5000 }
      );

      const cifUrl = `${ALPHAFOLD_API}/prediction/download/${uniprotId}?format=cif`;
      
      // Verify the CIF file is accessible
      await axios.head(cifUrl);

      return {
        pdbId: uniprotId,
        resolution: metadataResponse.data.resolution || 0,
        experimentalMethod: 'AlphaFold3 Prediction',
        confidenceScore: metadataResponse.data.confidenceScore,
        coordinates: cifUrl,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new ApiError(
            `No structure found for protein ${uniprotId}`,
            404
          );
        }
        throw new ApiError(
          `Failed to get structure: ${error.message}`,
          error.response?.status,
          error.response?.data
        );
      }
      throw new ApiError('Failed to get structure: Unknown error');
    }
  },

  /**
   * Check if the APIs are accessible
   * @returns Promise<boolean>
   */
  async checkApiStatus(): Promise<{ alphafold: boolean; uniprot: boolean }> {
    try {
      const [alphafoldStatus, uniprotStatus] = await Promise.all([
        axios.head(ALPHAFOLD_API).then(() => true).catch(() => false),
        axios.head(UNIPROT_API).then(() => true).catch(() => false)
      ]);

      return {
        alphafold: alphafoldStatus,
        uniprot: uniprotStatus
      };
    } catch {
      return {
        alphafold: false,
        uniprot: false
      };
    }
  }
};

// Export types for use in other files
export type { Protein, StructureData };