import { Livrable } from './livrable.model';
import { StatutSujet } from './sujet-projet.model';
import { ReponseEliminatoire } from './critere.model';
import { EvaluationResponse } from './evaluation.model';

export type TypeCritere = 'ELIMINATOIRE' | 'NOTE';
export type TypeIndustrialisation = 'INTERNE' | 'EXTERNE';
export type StatutIndustrialisation =
  | 'BROUILLON'
  | 'SOUMISE'
  | 'RECUE_PAR_CI'
  | 'A_COMPLETER'
  | 'RECEVABLE'
  | 'GO'
  | 'NO_GO'
  | 'REFUSEE';
export type OrientationIndustrialisation =
  | 'DSI'
  | 'STARTUP'
  | 'ENTREPRISE_PARTENAIRE'
  | 'VALORISATION_RDI'
  | 'EXTERNE';
export type TypeReponseIndustrialisation = 'TEXTE' | 'BOOLEAN' | 'NUMERIQUE' | 'URL' | 'FICHIER' | 'CHOIX';
export type DecisionRecommandeeIndustrialisation = 'GO' | 'NO_GO' | 'A_INSTRUIRE';

export interface QuestionIndustrialisation {
  id: number;
  libelle: string;
  description: string | null;
  typeReponse: TypeReponseIndustrialisation;
  obligatoire: boolean;
  typeCritere: TypeCritere;
  poids: number | null;
  ordre: number;
  actif: boolean;
  conditionEliminatoire: boolean | null;
  dateCreation: string;
  dateMiseAJour: string;
}

export interface QuestionIndustrialisationRequest {
  libelle: string;
  description?: string | null;
  typeReponse: TypeReponseIndustrialisation;
  obligatoire: boolean;
  typeCritere: TypeCritere;
  poids?: number | null;
  ordre: number;
  actif?: boolean;
  conditionEliminatoire?: boolean | null;
}

export interface CandidatureIndustrialisationRequest {
  typeIndustrialisation: TypeIndustrialisation;
  commentaire?: string;
  confirmEliminatoryWarnings?: boolean;
}

export interface SubmitIndustrialisationRequest {
  confirmEliminatoryWarnings?: boolean;
}

export interface ReponseIndustrialisationRequest {
  questionId: number;
  valeurTexte?: string | null;
  valeurBoolean?: boolean | null;
  valeurNumerique?: number | null;
  valeurUrl?: string | null;
  reponseEliminatoire?: ReponseEliminatoire | null;
  noteObtenue?: number | null;
  justificatif?: string | null;
}

export interface ReponsesIndustrialisationRequest {
  reponses: ReponseIndustrialisationRequest[];
}

export interface ReponseIndustrialisation {
  id: number;
  questionId: number;
  questionLibelle?: string | null;
  valeurTexte: string | null;
  valeurBoolean: boolean | null;
  valeurNumerique: number | null;
  valeurUrl: string | null;
  preuveObjectName: string | null;
  preuveOriginalFileName: string | null;
  preuveContentType: string | null;
  preuveSize: number | null;
  reponseEliminatoire: ReponseEliminatoire | null;
  noteObtenue: number | null;
  justificatif: string | null;
  dateReponse: string;
}

export interface HistoriqueIndustrialisation {
  id: number;
  statutSource: StatutIndustrialisation | null;
  statutCible: StatutIndustrialisation;
  acteurId: number;
  acteurNom: string;
  roleActeur: string;
  dateTransition: string;
  motif: string | null;
  commentaire: string | null;
}

export interface CandidatureIndustrialisation {
  id: number;
  projetId: number;
  projetTitre: string;
  projetStatut: StatutSujet;
  projetCategorie?: string | null;
  projetDomaine?: string | null;
  projetDescription?: string | null;
  projetObjectifs?: string | null;
  projetTechnologies?: string | null;
  projetPrerequis?: string | null;
  projetDateCreation?: string | null;
  projetDateSoumission?: string | null;
  projetDateValidation?: string | null;
  projetDateTerminaison?: string | null;
  scoreEvaluationProjet: number | null;
  eligibleIndustrialisation: boolean | null;
  bloqueParEliminatoire: boolean | null;
  hasEliminatoryWarnings?: boolean | null;
  eliminatoryWarningsCount?: number | null;
  eliminatoryWarningsDetails?: string[];
  typeIndustrialisation: TypeIndustrialisation;
  statut: StatutIndustrialisation;
  demandeurId: number;
  demandeurNom: string;
  dateDemande: string;
  dateSoumission: string | null;
  dateReceptionCI: string | null;
  ciDecideurId: number | null;
  ciDecideurNom: string | null;
  dateDecisionCI: string | null;
  decisionGoNoGo: boolean | null;
  orientation: OrientationIndustrialisation | null;
  motifDecision: string | null;
  commentaire: string | null;
  reponses: ReponseIndustrialisation[];
  livrables: Livrable[];
  historique: HistoriqueIndustrialisation[];
  latestEvaluation?: EvaluationResponse | null;
}

export interface IndustrialisationFormResponse {
  candidature: CandidatureIndustrialisation;
  questions: QuestionIndustrialisation[];
  reponses: ReponseIndustrialisation[];
}

export interface BlocageEliminatoire {
  source: string;
  referenceId: number | null;
  libelle: string;
  raison: string;
}

export interface ScoreBreakdown {
  composant: string;
  reference: string;
  libelle: string;
  score: number | null;
  poids: number | null;
  statut: string;
  details: string;
  revueManuelleRequise: boolean;
}

export interface IndustrialisationScore {
  candidatureId: number;
  projetId: number;
  scoreFinal: number;
  decisionRecommandee: DecisionRecommandeeIndustrialisation;
  estBloqueParEliminatoire: boolean;
  blocagesEliminatoires: BlocageEliminatoire[];
  hasEliminatoryWarnings?: boolean;
  eliminatoryWarningsCount?: number;
  eliminatoryWarningsDetails?: BlocageEliminatoire[];
  scoreQuestions: number;
  scoreLivrables: number;
  scoreCriteresNotes: number;
  detailsCalcul: ScoreBreakdown[];
  elementsManquants: string[];
  message: string;
}

export interface DecisionGoRequest {
  orientation: OrientationIndustrialisation;
  commentaire?: string;
}

export interface DecisionNoGoRequest {
  motif: string;
}

export interface EliminatoryWarningsConfirmation {
  requiresConfirmation: boolean;
  nbCriteresEliminatoires: number;
  message: string;
  details: BlocageEliminatoire[];
}

export const TYPE_INDUSTRIALISATION_LABELS: Record<TypeIndustrialisation, string> = {
  INTERNE: 'Interne',
  EXTERNE: 'Externe',
};

export const STATUT_INDUSTRIALISATION_LABELS: Record<StatutIndustrialisation, string> = {
  BROUILLON: 'Brouillon',
  SOUMISE: 'Soumise',
  RECUE_PAR_CI: 'Recue par CI',
  A_COMPLETER: 'A completer',
  RECEVABLE: 'Recevable',
  GO: 'Go',
  NO_GO: 'No Go',
  REFUSEE: 'Refusee',
};

export const ORIENTATION_OPTIONS: { value: OrientationIndustrialisation; label: string }[] = [
  { value: 'DSI', label: 'DSI' },
  { value: 'STARTUP', label: 'Startup' },
  { value: 'ENTREPRISE_PARTENAIRE', label: 'Entreprise partenaire' },
  { value: 'VALORISATION_RDI', label: 'Valorisation RDI' },
  { value: 'EXTERNE', label: 'Externe' },
];
