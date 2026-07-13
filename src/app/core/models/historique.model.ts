export type HistoriqueAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VALIDATE'
  | 'INVALIDATE'
  | 'SUBMIT'
  | 'ACCEPT'
  | 'REFUSE'
  | 'RETRAIT'
  | 'RETRAIT_ETUDIANT'
  | 'DECLARER_TERMINAISON'
  | 'OUVRIR_CANDIDATURES'
  | 'FERMER_CANDIDATURES'
  | string;

export type HistoriqueEntityType = 'SUJET_PROJET' | 'CANDIDATURE' | string;

export type HistoriqueFilter = 'TOUT' | 'SUJET' | 'CANDIDATURE';

export interface HistoriqueEntry {
  id: number;
  actorId: number;
  actorNom: string;
  actorPrenom: string;
  actorRole: string;
  action: HistoriqueAction;
  entityType: HistoriqueEntityType;
  entityId: number | null;
  summary: string;
  oldValues: string | null;
  newValues: string | null;
  metadata: string | null;
  createdAt: string;
}
