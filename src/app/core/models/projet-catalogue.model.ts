/** Type d'un projet du catalogue applicatif (miroir de l'enum backend TypeProjet). */
export type TypeProjet = 'RDI' | 'PFE' | 'STAGE_INGENIEUR';

/** Cycle de vie d'un projet du catalogue (miroir de l'enum backend StatutProjet). */
export type StatutProjet =
  | 'SOUMIS_EN_VALIDATION'
  | 'INVALIDE'
  | 'VALIDE'
  | 'CANDIDAT_INDUSTRIALISATION_INTERNE'
  | 'CANDIDAT_INDUSTRIALISATION_EXTERNE'
  | 'INDUSTRIALISE_DSI'
  | 'INDUSTRIALISE_EXTERNE';

/** Élément de référentiel (domaine, technologie, prérequis) pour les multi-sélecteurs. */
export interface ReferenceItem {
  id: number;
  nom: string;
  dateCreation?: string;
}

/** Corps de la requête de dépôt d'un projet (CreateProjetRequest backend). */
export interface CreateProjetRequest {
  typeProjet: TypeProjet;
  titre: string;
  description: string;
  objectifs: string;
  /** Dates au format ISO yyyy-MM-dd. */
  dateDebut: string;
  dateFin: string;
  domainesIds: number[];
  technologiesIds: number[];
  prerequisIds: number[];
}

/** Représentation allégée d'un projet en carte (ProjetCardResponse backend). */
export interface ProjetCard {
  id: number;
  typeProjet: TypeProjet;
  titre: string;
  description: string;
  statut: StatutProjet;
  score: number;
  encadrantId: number;
  encadrantNom: string;
  equipeId: number | null;
  equipeNom: string | null;
  dateDebut: string;
  dateFin: string;
  dateCreation: string;
  domaines: string[];
  technologies: string[];
}

/** Représentation canonique complète (ProjetCatalogueResponse backend). */
export interface ProjetCatalogue {
  id: number;
  typeProjet: TypeProjet;
  titre: string;
  description: string;
  objectifs: string;
  dateDebut: string;
  dateFin: string;
  statut: StatutProjet;
  score: number;
  encadrantId: number;
  encadrantNom: string;
  equipeId: number | null;
  equipeNom: string | null;
  chefValidateurId: number | null;
  chefValidateurNom: string | null;
  motifRefus: string | null;
  dateCreation: string;
  dateValidation: string | null;
  domaines: string[];
  technologies: string[];
  prerequis: string[];
}

/** Détails complets d'un projet pour les pages de détail (ProjetDetailsResponse backend). */
export interface ProjetDetails extends ProjetCatalogue {
  encadrantEmail: string | null;
}
