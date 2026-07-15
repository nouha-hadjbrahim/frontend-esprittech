export type NotificationType =
  | 'CANDIDATURE_RECUE'
  | 'CANDIDATURE_ACCEPTEE'
  | 'CANDIDATURE_REJETEE'
  | 'EQUIPE_INVITATION'
  | 'EQUIPE_REJOINTE'
  | 'AFFILIATION_DEMANDE'
  | 'AFFILIATION_ACCEPTEE'
  | 'AFFILIATION_REJETEE'
  | 'PROJET_VALIDE'
  | 'PROJET_REJETE'
  | 'SUJET_VALIDE'
  | 'SUJET_REJETE'
  | 'EVALUATION_TERMINEE'
  | 'CI_DEMANDE_SOUMISE'
  | 'CI_DEMANDE_APPOUVEE'
  | 'CI_DEMANDE_REJETEE'
  | 'LIVRABLE_TELECHARGE';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}
