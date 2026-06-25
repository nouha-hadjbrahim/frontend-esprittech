export type CategorieSujet = 'STAGE_INGENIEUR' | 'PFE' | 'RDI';

export type StatutSujet =
  | 'SOUMIS_EN_VALIDATION'
  | 'EN_ATTENTE'
  | 'INVALIDE'
  | 'VALIDE'
  | 'CANDIDATURE_OUVERTE'
  | 'CANDIDATURE_FERMEE'
  | 'REALISATION_EN_COURS'
  | 'REALISATION_TERMINEE'
  | 'CANDIDAT_INDUSTRIALISATION_INTERNE'
  | 'CANDIDAT_INDUSTRIALISATION_EXTERNE'
  | 'INDUSTRIALISE_DSI'
  | 'INDUSTRIALISE_EXTERNE';

export interface SujetProjetRequest {
  titre: string;
  categorie: CategorieSujet;
  description: string;
  objectifs: string;
  prerequis: string[];
  domaines: string[];
  technologies: string[];
  capaciteAccueil: number;
}

export interface SujetProjet {
  id: number;
  titre: string;
  categorie: CategorieSujet;
  description: string;
  objectifs: string;
  prerequis: string[];
  domaines: string[];
  technologies: string[];
  capaciteAccueil: number;
  statut: StatutSujet;
  scoreFinal: number | null;
  eligibleIndustrialisation: boolean;
  catalogue: boolean;
  encadrantId: number;
  encadrantNom: string;
  dateCreation: string;
  dateSoumission: string | null;
  dateValidation: string | null;
  dateDebutRealisation: string | null;
  dateTerminaison: string | null;
  motifInvalidation: string | null;
}
