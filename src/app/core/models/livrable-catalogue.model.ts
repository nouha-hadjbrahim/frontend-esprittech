import { LivrableLinkRequest, TypeLivrable } from './livrable.model';

/** Livrable rattaché à un projet du catalogue applicatif (miroir de LivrableCatalogueResponse backend). */
export interface LivrableCatalogue {
  id: number;
  projetId: number;
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
  /** True si le livrable est hérité du sujet d'origine (lecture seule). */
  fromSujet?: boolean | null;
}

export type { LivrableLinkRequest };
