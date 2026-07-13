import { Role } from './user.model';

export interface HistoriqueResponse {
  id: number;
  actorId: number;
  actorNom: string;
  actorPrenom: string;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId: number;
  summary: string;
  oldValues: string | null;
  newValues: string | null;
  metadata: string | null;
  createdAt: string;
}

export interface HistoriqueFilters {
  entityType?: string;
  entityId?: number;
  action?: string;
  actorId?: number;
  dateFrom?: string;
  dateTo?: string;
}

/** entityType enum values from backend */
export type EntityType =
  | 'USER'
  | 'SUJET_PROJET'
  | 'CANDIDATURE'
  | 'PROJET_CATALOGUE'
  | 'EQUIPE_RECHERCHE'
  | 'AFFILIATION_ENSEIGNANT'
  | 'EVALUATION'
  | 'CANDIDATURE_INDUSTRIALISATION';

/** ActionType enum values from backend */
export type ActionType =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'VALIDATE' | 'INVALIDATE'
  | 'SUBMIT' | 'DECISION_GO' | 'DECISION_NOGO' | 'ACCEPT' | 'REFUSE'
  | 'ACTIVATE' | 'DEACTIVATE' | 'REORDER' | 'UPLOAD' | 'LINK'
  | 'RETRAIT' | 'RETRAIT_ETUDIANT' | 'DECLARER_TERMINAISON'
  | 'OUVRIR_CANDIDATURES' | 'FERMER_CANDIDATURES'
  | 'ASSIGN_CHEF' | 'RETIRER_CHEF' | 'AJOUTER_MEMBRE' | 'RETIRER_MEMBRE'
  | 'DEMANDER_AFFILIATION' | 'TRAITER_AFFILIATION'
  | 'RECALCULER_EVALUATION' | 'OVERRIDE';

/** Maps entityType → display module name for UI */
export const MODULE_LABEL: Record<string, string> = {
  SUJET_PROJET: 'Sujets',
  EQUIPE_RECHERCHE: 'Équipes',
  CANDIDATURE: 'Candidatures',
  CANDIDATURE_INDUSTRIALISATION: 'Industrialisation',
  AFFILIATION_ENSEIGNANT: 'Affiliation',
  USER: 'Utilisateurs',
  PROJET_CATALOGUE: 'Catalogue',
  EVALUATION: 'Évaluation',
};

/** Maps ActionType → human-readable French label */
export const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  VALIDATE: 'Validation',
  INVALIDATE: 'Invalidation',
  SUBMIT: 'Soumission',
  DECISION_GO: 'Décision GO',
  DECISION_NOGO: 'Décision NO-GO',
  ACCEPT: 'Acceptation',
  REFUSE: 'Refus',
  ACTIVATE: 'Activation',
  DEACTIVATE: 'Désactivation',
  REORDER: 'Réorganisation',
  UPLOAD: 'Téléversement',
  LINK: 'Lien',
  RETRAIT: 'Retrait',
  RETRAIT_ETUDIANT: 'Retrait étudiant',
  DECLARER_TERMINAISON: 'Déclaration de fin',
  OUVRIR_CANDIDATURES: 'Ouverture candidatures',
  FERMER_CANDIDATURES: 'Fermeture candidatures',
  ASSIGN_CHEF: 'Désignation chef',
  RETIRER_CHEF: 'Retrait chef',
  AJOUTER_MEMBRE: 'Ajout membre',
  RETIRER_MEMBRE: 'Retrait membre',
  DEMANDER_AFFILIATION: 'Demande affiliation',
  TRAITER_AFFILIATION: 'Traitement affiliation',
  RECALCULER_EVALUATION: 'Recalcul évaluation',
  OVERRIDE: 'Forçage note',
};

/** Maps Role enum → display label */
export const ROLE_LABEL: Record<string, string> = {
  ROLE_ADMIN: 'Administrateur',
  ROLE_CI: 'CI',
  ROLE_CHEF_EQUIPE: "Chef d'équipe",
  ROLE_ENSEIGNANT: 'Enseignant',
  ROLE_ETUDIANT: 'Étudiant',
};

/** Set of module labels shown as filter chips */
export const MODULE_NAMES = [
  'Sujets', 'Équipes', 'Candidatures', 'Industrialisation',
  'Affiliation', 'Utilisateurs', 'Catalogue', 'Évaluation',
];

/** Module style config (color, background, ring) */
export const MODULE_STYLE: Record<string, { color: string; bg: string; bgSolid: string }> = {
  Sujets:                { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   bgSolid: '#3b82f6' },
  Équipes:               { color: '#E63946', bg: 'rgba(230,57,70,0.1)',    bgSolid: '#E63946' },
  Candidatures:          { color: '#10b981', bg: 'rgba(16,185,129,0.1)',   bgSolid: '#10b981' },
  Industrialisation:     { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',   bgSolid: '#8b5cf6' },
  Affiliation:           { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   bgSolid: '#f59e0b' },
  Utilisateurs:          { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    bgSolid: '#ef4444' },
  Catalogue:             { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   bgSolid: '#3b82f6' },
  Évaluation:            { color: '#a855f7', bg: 'rgba(168,85,247,0.1)',   bgSolid: '#a855f7' },
};
