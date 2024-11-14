// src/services/uniprotService.ts
import axios from 'axios';

interface UniProtAnnotation {
  type: string;
  location: {
    start: number;
    end: number;
  };
  description: string;
  evidence?: string;
}

export class UniProtService {
  private BASE_URL = 'https://rest.uniprot.org/uniprotkb/';

  async getAnnotations(uniprotId: string): Promise<UniProtAnnotation[]> {
    try {
      // Using the correct fields parameter format
      const response = await axios.get(`${this.BASE_URL}${uniprotId}`, {
        params: {
          format: 'json',
          fields: 'id,protein_name,sequence,features'  // Simplified fields
        }
      });

      if (!response.data) {
        return [];
      }

      // Extract and transform features
      const features = response.data.features || [];
      
      return features.map((feature: any) => {
        // Handle different location formats
        let start = 0;
        let end = 0;

        if (feature.location) {
          if (feature.location.start && feature.location.end) {
            start = feature.location.start.value;
            end = feature.location.end.value;
          } else if (feature.location.position) {
            start = feature.location.position.value;
            end = feature.location.position.value;
          }
        }

        return {
          type: feature.type || 'Unknown',
          location: {
            start,
            end
          },
          description: feature.description || feature.type || 'No description available',
          evidence: feature.evidences?.length > 0 
            ? feature.evidences[0].code 
            : 'Not specified'
        };
      });

    } catch (error) {
      console.error('Error fetching UniProt annotations:', error);
      
      // Fallback request with minimal fields
      try {
        const basicResponse = await axios.get(`${this.BASE_URL}${uniprotId}`, {
          params: {
            format: 'json'
          }
        });

        if (basicResponse.data?.features) {
          return basicResponse.data.features.map((feature: any) => {
            let start = 0;
            let end = 0;

            if (feature.begin && feature.end) {
              start = feature.begin.position;
              end = feature.end.position;
            } else if (feature.position) {
              start = feature.position;
              end = feature.position;
            }

            return {
              type: feature.type || 'Unknown',
              location: {
                start,
                end
              },
              description: feature.description || 'No description available',
              evidence: 'Not specified'
            };
          });
        }
        
        return [];
      } catch (fallbackError) {
        console.error('Fallback request failed:', fallbackError);
        return []; // Return empty array instead of throwing
      }
    }
  }

  async getSequence(uniprotId: string): Promise<string> {
    try {
      const response = await axios.get(`${this.BASE_URL}${uniprotId}`, {
        params: {
          format: 'json',
          fields: 'sequence'
        }
      });

      return response.data?.sequence?.value || '';
    } catch (error) {
      console.error('Error fetching sequence:', error);
      return '';
    }
  }
}

export const uniprotService = new UniProtService();