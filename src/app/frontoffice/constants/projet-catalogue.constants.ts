import { StatutProjet, TypeProjet } from '../../core/models/projet-catalogue.model';

/** Image de couverture par défaut des projets sans visuel. */
export const DEFAULT_PROJET_COVER_IMAGE = '/assets/images/catalogue-default-cover.png';

/** Options de type pour les boutons de filtre et le formulaire. */
export const TYPE_PROJET_OPTIONS: { value: TypeProjet; label: string }[] = [
  { value: 'PFE', label: 'PFE' },
  { value: 'STAGE_INGENIEUR', label: 'Stage' },
  { value: 'RDI', label: 'RDI' },
];

/** Libellé + classe CSS du badge de type. */
export const TYPE_PROJET_LABELS: Record<TypeProjet, { label: string; cssClass: string }> = {
  PFE: { label: 'PFE', cssClass: 'badge--pfe' },
  STAGE_INGENIEUR: { label: 'Stage', cssClass: 'badge--stage' },
  RDI: { label: 'RDI', cssClass: 'badge--rdi' },
};

/**
 * Libellé + classe CSS du badge de statut.
 * Les couleurs sont définies dans les CSS des composants (palette imposée par la maquette).
 */
export const STATUT_PROJET_LABELS: Record<StatutProjet, { label: string; cssClass: string }> = {
  SOUMIS_EN_VALIDATION: { label: 'Soumis en validation', cssClass: 'badge--soumis' },
  INVALIDE: { label: 'Invalide', cssClass: 'badge--invalide' },
  VALIDE: { label: 'Validé', cssClass: 'badge--valide' },
  CANDIDAT_INDUSTRIALISATION_INTERNE: { label: 'Candidat indust. interne', cssClass: 'badge--cand-interne' },
  CANDIDAT_INDUSTRIALISATION_EXTERNE: { label: 'Candidat indust. externe', cssClass: 'badge--cand-externe' },
  INDUSTRIALISE_DSI: { label: 'Industrialisé DSI', cssClass: 'badge--indus-dsi' },
  INDUSTRIALISE_EXTERNE: { label: 'Industrialisé externe', cssClass: 'badge--indus-externe' },
};

/** Options du filtre de statut dans le catalogue (statuts publics uniquement). */
export const STATUT_CATALOGUE_OPTIONS: { value: StatutProjet | ''; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'VALIDE', label: 'Validé' },
  { value: 'CANDIDAT_INDUSTRIALISATION_INTERNE', label: 'Candidat indust. interne' },
  { value: 'CANDIDAT_INDUSTRIALISATION_EXTERNE', label: 'Candidat indust. externe' },
  { value: 'INDUSTRIALISE_DSI', label: 'Industrialisé DSI' },
  { value: 'INDUSTRIALISE_EXTERNE', label: 'Industrialisé externe' },
];

/** Statuts considérés « Labellisés » (validés ou industrialisés). */
export const STATUTS_LABELLISES: StatutProjet[] = [
  'VALIDE',
  'CANDIDAT_INDUSTRIALISATION_INTERNE',
  'CANDIDAT_INDUSTRIALISATION_EXTERNE',
  'INDUSTRIALISE_DSI',
  'INDUSTRIALISE_EXTERNE',
];

/** Indique si un statut correspond à un projet labellisé. */
export function estLabellise(statut: StatutProjet): boolean {
  return STATUTS_LABELLISES.includes(statut);
}
