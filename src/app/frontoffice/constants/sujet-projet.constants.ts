import { CategorieSujet, StatutSujet } from '../../core/models/sujet-projet.model';

export const CATEGORIE_OPTIONS: { value: CategorieSujet; label: string }[] = [
  { value: 'STAGE_INGENIEUR', label: 'Stage' },
  { value: 'PFE', label: 'PFE' },
  { value: 'RDI', label: 'RDI' },
];

export const CATEGORIE_LABELS: Record<CategorieSujet, { label: string; cssClass: string }> = {
  STAGE_INGENIEUR: { label: 'Stage', cssClass: 'badge--stage' },
  PFE: { label: 'PFE', cssClass: 'badge--pfe' },
  RDI: { label: 'RDI', cssClass: 'badge--rdi' },
};

export const STATUT_LABELS: Record<StatutSujet, { label: string; cssClass: string }> = {
  SOUMIS_EN_VALIDATION: { label: 'Soumis en validation', cssClass: 'badge--warning' },
  EN_ATTENTE: { label: 'En attente', cssClass: 'badge--progress' },
  INVALIDE: { label: 'Invalide', cssClass: 'badge--danger' },
  VALIDE: { label: 'Validé', cssClass: 'badge--success' },
  CANDIDATURE_OUVERTE: { label: 'Candidature ouverte', cssClass: 'badge--success' },
  CANDIDATURE_FERMEE: { label: 'Candidature fermée', cssClass: 'badge--neutral' },
  REALISATION_EN_COURS: { label: 'Réalisation en cours', cssClass: 'badge--info' },
  REALISATION_TERMINEE: { label: 'Réalisation terminée', cssClass: 'badge--success' },
  CANDIDAT_INDUSTRIALISATION_INTERNE: { label: 'Candidat indust. interne', cssClass: 'badge--info' },
  CANDIDAT_INDUSTRIALISATION_EXTERNE: { label: 'Candidat indust. externe', cssClass: 'badge--info' },
  INDUSTRIALISE_DSI: { label: 'Industrialisé DSI', cssClass: 'badge--success' },
  INDUSTRIALISE_EXTERNE: { label: 'Industrialisé externe', cssClass: 'badge--success' },
};

export const FALLBACK_TECHNOLOGIES = [
  'Java', 'Python', 'Angular', 'Spring Boot', 'MySQL', 'Docker', 'React', 'TypeScript',
];

export const DEFAULT_PREREQUIS_OPTIONS = ['Soft skills', 'Hard skills'];
export const DEFAULT_DOMAINE_OPTIONS = ['Intelligence Artificielle', 'Développement Web', 'Cybersécurité'];
