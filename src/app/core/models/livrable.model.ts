export type TypeLivrable =
  | 'DOCUMENTATION'
  | 'CODE_SOURCE'
  | 'LIEN_GIT'
  | 'RAPPORT'
  | 'PRESENTATION'
  | 'IMAGE'
  | 'FICHIER_TXT'
  | 'AUTRE';

export interface Livrable {
  id: number;
  sujetProjetId: number;
  projetTitre: string;
  typeLivrable: TypeLivrable;
  nom: string;
  description: string | null;
  originalFileName: string | null;
  objectName: string | null;
  contentType: string | null;
  size: number | null;
  lienExterne: string | null;
  deposantId: number;
  deposantNom: string;
  dateDepot: string;
  actif: boolean;
}

export interface LivrableLinkRequest {
  typeLivrable: TypeLivrable;
  nom: string;
  description?: string;
  lienExterne: string;
}

export interface LivrableUpdateRequest {
  typeLivrable: TypeLivrable;
  nom: string;
  description?: string | null;
  lienExterne?: string | null;
  actif?: boolean;
}

export const TYPE_LIVRABLE_LABELS: Record<TypeLivrable, string> = {
  DOCUMENTATION: 'Documentation',
  CODE_SOURCE: 'Code source',
  LIEN_GIT: 'Lien Git',
  RAPPORT: 'Rapport',
  PRESENTATION: 'Presentation',
  IMAGE: 'Image',
  FICHIER_TXT: 'Fichier texte',
  AUTRE: 'Autre',
};

export const TYPE_LIVRABLE_OPTIONS: { value: TypeLivrable; label: string }[] = Object.entries(TYPE_LIVRABLE_LABELS)
  .map(([value, label]) => ({ value: value as TypeLivrable, label }));
