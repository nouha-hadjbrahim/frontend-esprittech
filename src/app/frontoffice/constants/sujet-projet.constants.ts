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

export const STATUT_CANDIDATURE_LABELS: Record<
  Exclude<import('../../core/models/candidature.model').StatutCandidature, 'ARCHIVEE'>,
  { label: string; cssClass: string }
> = {
  DEPOSEE: { label: 'En attente', cssClass: 'badge--warning' },
  ACCEPTEE: { label: 'Acceptée', cssClass: 'badge--success' },
  REFUSEE: { label: 'Refusée', cssClass: 'badge--danger' },
};

/** Couleurs distinctes par statut — cartes et liste « Mes sujets » uniquement */
export const MES_SUJETS_STATUT_STYLES: Record<
  StatutSujet,
  { listClass: string; cardTagClass: string; cardDotClass: string }
> = {
  SOUMIS_EN_VALIDATION: {
    listClass: 'badge--statut-soumis',
    cardTagClass: 'dispo-card__status-tag--soumis',
    cardDotClass: 'dispo-card__status-dot--soumis',
  },
  EN_ATTENTE: {
    listClass: 'badge--statut-attente',
    cardTagClass: 'dispo-card__status-tag--attente',
    cardDotClass: 'dispo-card__status-dot--attente',
  },
  INVALIDE: {
    listClass: 'badge--statut-invalide',
    cardTagClass: 'dispo-card__status-tag--invalide',
    cardDotClass: 'dispo-card__status-dot--invalide',
  },
  VALIDE: {
    listClass: 'badge--statut-valide',
    cardTagClass: 'dispo-card__status-tag--valide',
    cardDotClass: 'dispo-card__status-dot--valide',
  },
  CANDIDATURE_OUVERTE: {
    listClass: 'badge--statut-cand-ouverte',
    cardTagClass: 'dispo-card__status-tag--cand-ouverte',
    cardDotClass: 'dispo-card__status-dot--cand-ouverte',
  },
  CANDIDATURE_FERMEE: {
    listClass: 'badge--statut-cand-fermee',
    cardTagClass: 'dispo-card__status-tag--cand-fermee',
    cardDotClass: 'dispo-card__status-dot--cand-fermee',
  },
  REALISATION_EN_COURS: {
    listClass: 'badge--statut-realisation',
    cardTagClass: 'dispo-card__status-tag--realisation',
    cardDotClass: 'dispo-card__status-dot--realisation',
  },
  REALISATION_TERMINEE: {
    listClass: 'badge--statut-terminee',
    cardTagClass: 'dispo-card__status-tag--terminee',
    cardDotClass: 'dispo-card__status-dot--terminee',
  },
  CANDIDAT_INDUSTRIALISATION_INTERNE: {
    listClass: 'badge--statut-indust-interne',
    cardTagClass: 'dispo-card__status-tag--indust-interne',
    cardDotClass: 'dispo-card__status-dot--indust-interne',
  },
  CANDIDAT_INDUSTRIALISATION_EXTERNE: {
    listClass: 'badge--statut-indust-externe',
    cardTagClass: 'dispo-card__status-tag--indust-externe',
    cardDotClass: 'dispo-card__status-dot--indust-externe',
  },
  INDUSTRIALISE_DSI: {
    listClass: 'badge--statut-indus-dsi',
    cardTagClass: 'dispo-card__status-tag--indus-dsi',
    cardDotClass: 'dispo-card__status-dot--indus-dsi',
  },
  INDUSTRIALISE_EXTERNE: {
    listClass: 'badge--statut-indus-externe',
    cardTagClass: 'dispo-card__status-tag--indus-externe',
    cardDotClass: 'dispo-card__status-dot--indus-externe',
  },
};
