import { ReponseEliminatoire } from '../../../core/models/critere.model';
import { EvaluationResponse, ResultatCritereResponse } from '../../../core/models/evaluation.model';
import { EvaluationChecklistComponent } from './evaluation-checklist.component';

describe('EvaluationChecklistComponent', () => {
  let component: EvaluationChecklistComponent;

  const eliminatoireOk: ResultatCritereResponse = {
    id: 1,
    critereId: 10,
    critereLibelle: 'Dossier complet',
    typeCritere: 'ELIMINATOIRE',
    reponseEliminatoire: ReponseEliminatoire.OK,
    ruleConfigured: true,
  };

  const eliminatoireKo: ResultatCritereResponse = {
    id: 2,
    critereId: 11,
    critereLibelle: 'Git disponible',
    typeCritere: 'ELIMINATOIRE',
    reponseEliminatoire: ReponseEliminatoire.NOT_OK,
    ruleConfigured: false,
  };

  const note: ResultatCritereResponse = {
    id: 3,
    critereId: 12,
    critereLibelle: 'Qualite',
    typeCritere: 'NOTE',
    mlScore: 4,
    mlMaxScore: 5,
    normalizedScore: 0.8,
    confidence: 0.82,
    criterionStatus: 'SCORED',
    evidenceQuality: 0.9,
    analysisMethods: ['SEMANTIC_RETRIEVAL', 'DOCUMENT_STRUCTURE'],
    evidenceJson: '[{"evidenceId":"ev1","deliverableId":99,"sourceType":"PDF","source":"rapport.pdf","page":7,"relevance":0.74,"calibratedRelevance":0.74,"rawSemanticSimilarity":0.91,"stance":"SUPPORTS","projectRelevanceType":"PROJECT_SPECIFIC","excerpt":"Architecture"}]',
    evidenceSummary: 'Architecture modulaire documentee',
    evidenceLivrableIds: [99],
    noteValue: 4,
    noteLabel: 'Satisfait',
    noteObtenue: 4,
    scorePondere: 1.6,
    bareme: 5,
    poids: 2,
    ruleConfigured: true,
  };

  const evaluation = (overrides: Partial<EvaluationResponse> = {}): EvaluationResponse => ({
    id: 7,
    sujetProjetId: 42,
    scoreFinal: 76,
    eligibleIndustrialisation: true,
    bloqueParEliminatoire: false,
    dateCalcul: '2026-01-01T00:00:00Z',
    commentaire: '',
    resultats: [eliminatoireOk, eliminatoireKo, note],
    ...overrides,
  });

  beforeEach(() => {
    component = new EvaluationChecklistComponent();
    component.evaluation = evaluation();
  });

  it('should split criteria, compute blocking state and labels', () => {
    expect(component.eliminatoires).toEqual([eliminatoireOk, eliminatoireKo]);
    expect(component.notes).toEqual([note]);
    expect(component.eliminatoiresOk).toBe(1);
    expect(component.evaluationComplete).toBeTrue();
    expect(component.hasBlockingCriteria).toBeTrue();
    expect(component.scorePercent).toBe(76);
    expect(component.mlScoreLabel).toBe('76.00 / 100');
    expect(component.officialScoreLabel).toBe('76.00 / 100');
    expect(component.validatedScoreLabel).toBe('-');
    expect(component.statusLabel).toBe('Non éligible');
    expect(component.statusClass).toBe('decision-badge--no');
    expect(component.progressClass).toBe('checklist-progress__bar--danger');
    expect(component.blockingCriteriaNames).toEqual(['Git disponible']);
    expect(component.analysisIssueCount).toBe(1);
    expect(component.isBlocking(eliminatoireKo)).toBeTrue();
    expect(component.isBlocking(note)).toBeFalse();
    expect(component.resultLabel(eliminatoireOk)).toBe('OK');
    expect(component.resultLabel(note)).toBe('4/5 - 80/100');
    expect(component.confidencePercent(note.confidence)).toBe(82);
    expect(component.evidenceLabel(note)).toContain('Livrables: #99');
    expect(component.evidenceLabel(note)).toContain('PDF - page 7');
    expect(component.criterionStatusLabel(note)).toBe('Score calculé');
    expect(component.hasCriterionDetails(note)).toBeTrue();
  });

  it('should use explicit aggregate fields and explicit blocking criteria names', () => {
    component.evaluation = evaluation({
      criteresEliminatoiresSatisfaits: 5,
      blockingCriteriaNames: ['Architecture absente'],
    });

    expect(component.eliminatoiresOk).toBe(5);
    expect(component.blockingCriteriaNames).toEqual(['Architecture absente']);
  });

  it('should expose warning and success states for eligible incomplete and complete evaluations', () => {
    component.evaluation = evaluation({ eligibilityStatus: 'REVIEW_REQUIRED' });
    expect(component.statusLabel).toBe('Revue requise');
    expect(component.statusClass).toBe('decision-badge--no');

    component.evaluation = evaluation({
      resultats: [eliminatoireOk, note],
      evaluationComplete: false,
      scoreFinal: 68,
    });

    expect(component.statusLabel).toBe('Éligible');
    expect(component.statusClass).toBe('decision-badge--warning');
    expect(component.progressClass).toBe('checklist-progress__bar--warning');

    component.evaluation = evaluation({
      resultats: [eliminatoireOk, note],
      evaluationComplete: true,
      scoreFinal: 72,
    });

    expect(component.statusClass).toBe('decision-badge--warning');
    expect(component.progressClass).toBe('checklist-progress__bar--success');
  });

  it('should clamp score and handle missing evaluation data', () => {
    component.evaluation = evaluation({ scoreFinal: 130, resultats: undefined });
    expect(component.scorePercent).toBe(100);
    expect(component.eliminatoires).toEqual([]);
    expect(component.notes).toEqual([]);
    expect(component.analysisIssueCount).toBe(0);

    component.evaluation = evaluation({ scoreFinal: -5, eligibleIndustrialisation: false });
    expect(component.scorePercent).toBe(0);
    expect(component.statusLabel).toBe('Non éligible');
  });

  it('should format empty eliminatory and note results with fallbacks', () => {
    const emptyEliminatory: ResultatCritereResponse = {
      id: 4,
      critereId: 13,
      critereLibelle: 'Avis CI',
      typeCritere: 'ELIMINATOIRE',
    };
    const weightedNote: ResultatCritereResponse = {
      id: 5,
      critereId: 14,
      critereLibelle: 'Impact',
      typeCritere: 'NOTE',
      scorePondere: 8,
    };

    expect(component.resultLabel(emptyEliminatory)).toBe('Non renseigné');
    expect(component.resultLabel(weightedNote)).toBe('Non calculé');
  });

  it('should render dynamic note scale when bareme is available', () => {
    const dynamicNote: ResultatCritereResponse = {
      ...note,
      mlScore: null,
      mlMaxScore: null,
      normalizedScore: null,
      noteValue: 7,
      noteObtenue: 7,
      bareme: 10,
      noteLabel: 'Bon',
    };

    expect(component.resultLabel(dynamicNote)).toBe('7/10 - Bon');
  });

  it('should display insufficient evidence without a fabricated score', () => {
    const insufficient: ResultatCritereResponse = {
      id: 6,
      critereId: 15,
      critereLibelle: 'Securite',
      typeCritere: 'NOTE',
      criterionStatus: 'INSUFFICIENT_EVIDENCE',
      normalizedScore: null,
      confidence: 0.12,
      ruleConfigured: false,
    };

    expect(component.resultLabel(insufficient)).toBe('Preuves insuffisantes');
    expect(component.criterionStatusLabel(insufficient)).toBe('Preuves insuffisantes');
    expect(component.evidenceReferences(insufficient)).toEqual([]);
  });

  it('should render unscored notes as non calculated instead of zero', () => {
    const unscored: ResultatCritereResponse = {
      id: 7,
      critereId: 16,
      critereLibelle: 'Disponibilite',
      typeCritere: 'NOTE',
      normalizedScore: null,
      noteValue: undefined,
      noteObtenue: undefined,
      bareme: 5,
      ruleConfigured: false,
    };

    expect(component.resultLabel(unscored)).toBe('Non calculé');
  });

  it('should expose git repository path evidence without raw json', () => {
    const gitResult: ResultatCritereResponse = {
      ...note,
      evidenceJson: '[{"sourceType":"GIT","source":"repository","path":"src/main/java/App.java","relevance":0.88,"excerpt":"class App"}]',
    };

    expect(component.evidenceReferences(gitResult)[0].path).toBe('src/main/java/App.java');
    expect(component.evidenceLabel(gitResult)).toContain('GIT - src/main/java/App.java');
  });

  it('should expose stance labels and calibrated relevance for evidence', () => {
    const references = component.evidenceReferences(note);

    expect(references[0].stance).toBe('SUPPORTS');
    expect(component.stanceLabel(references[0])).toBe('Preuve validée');
    expect(component.stanceClass(references[0])).toBe('evidence-badge--supports');
    expect(component.projectRelevanceLabel(references[0])).toBe('Projet');
    expect(component.relevancePercent(references[0])).toBe(74);
  });

  it('should ignore semantic supports evidence without project relevance', () => {
    const invalidEvidenceResult: ResultatCritereResponse = {
      ...note,
      evidenceJson: '[{"sourceType":"PDF","source":"guide.pdf","stance":"SUPPORTS","projectRelevanceType":"EVALUATOR_DOCUMENTATION","evidenceNature":"SEMANTIC","excerpt":"EvaluationService"}]',
    };
    const reference = component.evidenceReferences(invalidEvidenceResult)[0];

    expect(component.isIgnoredEvidence(reference)).toBeTrue();
    expect(component.stanceLabel(reference)).toBe('Preuve ignorée');
    expect(component.stanceClass(reference)).toBe('evidence-badge--ignored');
  });

  it('should localize backend reason codes', () => {
    const result: ResultatCritereResponse = {
      ...note,
      explanation: 'NO_VALIDATED_SUPPORTING_EVIDENCE',
    };

    expect(component.criterionExplanation(result)).toBe('Aucune preuve positive validée n’a été trouvée.');
  });

  it('should display non calculated score for failed evaluations and deduplicate summaries', () => {
    component.evaluation = evaluation({
      scoreFinal: 0,
      mlScore: null,
      mlStatus: 'FAILED_RETRYABLE',
      finalValidatedScore: null,
      strengths: ['TRACEABLE_MULTISOURCE_EVIDENCE', 'TRACEABLE_MULTISOURCE_EVIDENCE'],
    });

    expect(component.mlScore).toBeNull();
    expect(component.mlScoreLabel).toBe('Non calculé');
    expect(component.officialScoreLabel).toBe('Non calculé');
    expect(component.validatedScoreLabel).toBe('-');
    expect(component.uniqueStrengths).toEqual(['Preuves traçables provenant de plusieurs sources.']);
  });
});
