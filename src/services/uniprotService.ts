// uniprotService.ts
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

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
  private parser = new XMLParser();

  async getAnnotations(uniprotId: string): Promise<UniProtAnnotation[]> {
    try {
      // First try the direct XML approach as it's more reliable
      const response = await axios.get(`${this.BASE_URL}${uniprotId}.xml`, {
        headers: {
          'Accept': 'application/xml'
        }
      });

      if (!response.data) {
        throw new Error('No data received');
      }

      // Parse XML response
      const result = this.parser.parse(response.data);
      const entry = result?.['uniprot']?.['entry'];

      if (!entry?.['feature']) {
        return [];
      }

      // Convert features to our annotation format
      const features = Array.isArray(entry['feature']) 
        ? entry['feature'] 
        : [entry['feature']];

      return features.map(feature => ({
        type: feature['@_type'] || 'Unknown',
        location: {
          start: parseInt(feature?.['location']?.['begin']?.['@_position']) || 0,
          end: parseInt(feature?.['location']?.['end']?.['@_position']) || 0
        },
        description: feature['@_description'] || feature['@_type'] || 'No description',
        evidence: feature['@_evidence'] || 'Not specified'
      }));

    } catch (error) {
      console.error('Error fetching annotations:', error);
      
      // Fallback to JSON API if XML fails
      try {
        const jsonResponse = await axios.get(`${this.BASE_URL}${uniprotId}`, {
          params: {
            format: 'json',
            fields: 'id,features'
          }
        });

        if (!jsonResponse.data?.features) {
          return [];
        }

        return jsonResponse.data.features.map((feature: any) => ({
          type: feature.type || 'Unknown',
          location: {
            start: feature.location?.start?.value || 0,
            end: feature.location?.end?.value || 0
          },
          description: feature.description || feature.type || 'No description',
          evidence: feature.evidences?.[0]?.source?.name || 'Not specified'
        }));

      } catch (jsonError) {
        console.error('Fallback JSON request failed:', jsonError);
        throw new Error('Failed to fetch annotations from both XML and JSON endpoints');
      }
    }
  }

  async getProteinInfo(uniprotId: string) {
    try {
      const response = await axios.get(`${this.BASE_URL}${uniprotId}`, {
        params: {
          format: 'json',
          fields: 'id,protein_name,gene_names,organism_name,sequence'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching protein info:', error);
      throw error;
    }
  }
}

export const uniprotService = new UniProtService();