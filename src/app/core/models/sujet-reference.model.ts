export interface ReferenceItem {
  id: number;
  nom: string;
  dateCreation: string;
}

export interface ReferenceCounts {
  domaines: number;
  prerequis: number;
  technologies: number;
}

export type ReferenceType = 'domaines' | 'prerequis' | 'technologies';

export interface ReferenceItemRequest {
  nom: string;
}
