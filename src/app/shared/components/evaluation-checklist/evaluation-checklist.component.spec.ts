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

    component.evaluation = evaluation({ scoreFinal: -5, eligibleIndustrialisation: false, resultats: [] });
    expect(component.scorePercent).toBe(0);
    expect(component.statusLabel).toBe('Non calculé');
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

  it('should compute eliminatoiresNotOk and eliminatoiresIndetermines from resultats', () => {
    expect(component.eliminatoiresNotOk).toBe(1);
    expect(component.eliminatoiresIndetermines).toBe(0);

    component.evaluation = evaluation({
      criteresEliminatoiresNonSatisfaits: 3,
      criteresEliminatoiresIndetermines: 2,
    });
    expect(component.eliminatoiresNotOk).toBe(3);
    expect(component.eliminatoiresIndetermines).toBe(2);
  });

  it('should compute eliminatoiresIndetermines from eliminatoryState fallback', () => {
    const indeterminate: ResultatCritereResponse = {
      id: 10,
      critereId: 20,
      critereLibelle: 'Indet',
      typeCritere: 'ELIMINATOIRE',
      reponseEliminatoire: undefined,
      eliminatoryState: 'INDETERMINATE',
    };
    component.evaluation = evaluation({ resultats: [indeterminate] });
    expect(component.eliminatoiresIndetermines).toBe(1);
  });

  it('should compute showIncompleteConfiguration and showAnalysisIncomplete', () => {
    component.evaluation = evaluation({
      incompleteCriteria: [{ criterionId: 1, criterionName: 'CRITERE_A', criterionType: 'NOTE', blockingMissingFields: [], nonBlockingMissingFields: [] }],
      scoreFinal: null,
      mlStatus: 'FAILED_RETRYABLE',
    });
    expect(component.showIncompleteConfiguration).toBeTrue();

    component.evaluation = evaluation({
      scoreFinal: null,
      mlStatus: 'COMPLETED',
      evaluationComplete: false,
    });
    expect(component.showAnalysisIncomplete).toBeTrue();

    component.evaluation = evaluation({ scoreFinal: 76 });
    expect(component.showAnalysisIncomplete).toBeFalse();
  });

  it('should return correct statusLabel for all eligibilityStatus values', () => {
    component.evaluation = evaluation({ eligibilityStatus: 'NOT_EVALUABLE_NO_DELIVERABLE' });
    expect(component.statusLabel).toBe('Non éligible');

    component.evaluation = evaluation({ eligibilityStatus: 'NON_ELIGIBLE_EN_L_ETAT' });
    expect(component.statusLabel).toBe('Non éligible');

    component.evaluation = evaluation({
      eligibilityStatus: '',
      scoreFinal: null,
      mlScore: null,
    });
    expect(component.statusLabel).toBe('Non calculé');

    component.evaluation = evaluation({
      eligibilityStatus: '',
      scoreFinal: 76,
      eligibleIndustrialisation: true,
      blockingCriteriaNames: undefined,
    });
    delete (component.evaluation as any).blockingCriteriaNames;
    expect(component.statusLabel).toBe('Non éligible');
  });

  it('should return correct statusClass for NOT_EVALUABLE', () => {
    component.evaluation = evaluation({ eligibilityStatus: 'NOT_EVALUABLE' });
    expect(component.statusClass).toBe('decision-badge--no');
  });

  it('should return correct statusClass for REVIEW_REQUIRED', () => {
    component.evaluation = evaluation({ eligibilityStatus: 'REVIEW_REQUIRED' });
    expect(component.statusClass).toBe('decision-badge--no');
  });

  it('should return correct progressClass for score >= 70', () => {
    component.evaluation = evaluation({
      resultats: [eliminatoireOk, note],
      scoreFinal: 75,
      evaluationComplete: true,
    });
    expect(component.progressClass).toBe('checklist-progress__bar--success');
  });

  it('should return progressClass warning for score < 70', () => {
    component.evaluation = evaluation({
      resultats: [eliminatoireOk, note],
      scoreFinal: 50,
      evaluationComplete: true,
    });
    expect(component.progressClass).toBe('checklist-progress__bar--warning');
  });

  it('should format normalizedScore > 1 in resultLabel', () => {
    const highNormalized: ResultatCritereResponse = {
      ...note,
      mlScore: 8,
      mlMaxScore: 10,
      normalizedScore: 85,
      noteValue: null,
      noteObtenue: undefined,
    };
    expect(component.resultLabel(highNormalized)).toBe('8/10 - 85/100');
  });

  it('should format noteValue without bareme', () => {
    const noBareme: ResultatCritereResponse = {
      ...note,
      mlScore: null,
      mlMaxScore: null,
      noteValue: 3,
      noteObtenue: 3,
      bareme: null,
    };
    expect(component.resultLabel(noBareme)).toBe('Satisfait');
  });

  it('should format noteLabel without bareme', () => {
    const noteOnlyLabel: ResultatCritereResponse = {
      ...note,
      mlScore: null,
      mlMaxScore: null,
      noteValue: null,
      noteObtenue: undefined,
      noteLabel: 'Custom Label',
      bareme: null,
    };
    expect(component.resultLabel(noteOnlyLabel)).toBe('Non calculé');
  });

  it('should format criterionStatusLabel for all statuses', () => {
    expect(component.criterionStatusLabel({ criterionStatus: 'OK' } as any)).toBe('OK');
    expect(component.criterionStatusLabel({ criterionStatus: 'NOT_OK' } as any)).toBe('NOT_OK');
    expect(component.criterionStatusLabel({ criterionStatus: 'INDETERMINATE' } as any)).toBe('Indéterminé');
    expect(component.criterionStatusLabel({ criterionStatus: 'UNKNOWN_STATUS' } as any)).toBe('UNKNOWN_STATUS');
    expect(component.criterionStatusLabel({ criterionStatus: null } as any)).toBeNull();
  });

  it('should handle confidencePercent for value > 1', () => {
    expect(component.confidencePercent(85)).toBe(85);
    expect(component.confidencePercent(0.85)).toBe(85);
    expect(component.confidencePercent(null)).toBeNull();
    expect(component.confidencePercent(undefined)).toBeNull();
  });

  it('should handle evidenceReferenceLabel with various reference shapes', () => {
    const refNoLocation = { sourceType: 'PDF', page: null, path: null, deliverableId: null } as any;
    expect(component.evidenceReferenceLabel(refNoLocation)).toBe('PDF');

    const refWithDeliverable = { sourceType: 'PDF', page: null, path: null, deliverableId: 42 } as any;
    expect(component.evidenceReferenceLabel(refWithDeliverable)).toBe('PDF - livrable #42');

    const refWithPage = { sourceType: 'PDF', page: 10, path: null, deliverableId: null } as any;
    expect(component.evidenceReferenceLabel(refWithPage)).toBe('PDF - page 10');

    const refNoSourceType = { sourceType: null, page: null, path: null, deliverableId: null } as any;
    expect(component.evidenceReferenceLabel(refNoSourceType)).toBe('Source');
  });

  it('should return projectRelevanceLabel for all types', () => {
    expect(component.projectRelevanceLabel({ projectRelevanceType: 'PROJECT_SPECIFIC' } as any)).toBe('Projet');
    expect(component.projectRelevanceLabel({ projectRelevanceType: 'GENERIC_DOMAIN_CONTENT' } as any)).toBe('Générique');
    expect(component.projectRelevanceLabel({ projectRelevanceType: 'EVALUATOR_DOCUMENTATION' } as any)).toBe('Documentation évaluateur');
    expect(component.projectRelevanceLabel({ projectRelevanceType: 'EXAMPLE_OR_TEMPLATE' } as any)).toBe('Exemple ou modèle');
    expect(component.projectRelevanceLabel({ projectRelevanceType: 'HISTORICAL_CONTENT' } as any)).toBe('Historique');
    expect(component.projectRelevanceLabel({ projectRelevanceType: 'UNKNOWN' } as any)).toBe('Incertain');
    expect(component.projectRelevanceLabel({ projectRelevanceType: null } as any)).toBe('-');
  });

  it('should return stanceLabel and stanceClass for INSUFFICIENT', () => {
    const ref = { stance: 'INSUFFICIENT' } as any;
    expect(component.stanceLabel(ref)).toBe('Insuffisant');
    expect(component.stanceClass(ref)).toBe('evidence-badge--insufficient');
  });

  it('should return stanceLabel and stanceClass for NEUTRAL', () => {
    const ref = { stance: 'NEUTRAL' } as any;
    expect(component.stanceLabel(ref)).toBe('Neutre');
    expect(component.stanceClass(ref)).toBe('evidence-badge--neutral');
  });

  it('should return stanceLabel and stanceClass for default', () => {
    const ref = { stance: 'UNKNOWN' } as any;
    expect(component.stanceLabel(ref)).toBe('Non qualifié');
    expect(component.stanceClass(ref)).toBe('evidence-badge--insufficient');
  });

  it('should return stanceLabel and stanceClass for CONTRADICTS', () => {
    const ref = { stance: 'CONTRADICTS' } as any;
    expect(component.stanceLabel(ref)).toBe('Contredit');
    expect(component.stanceClass(ref)).toBe('evidence-badge--contradicts');
  });

  it('should handle isIgnoredEvidence for DETERMINISTIC and STRUCTURED_REPORT', () => {
    const det = { stance: 'SUPPORTS', evidenceNature: 'DETERMINISTIC', projectRelevanceType: 'GENERIC' } as any;
    expect(component.isIgnoredEvidence(det)).toBeFalse();

    const struct = { stance: 'SUPPORTS', evidenceNature: 'STRUCTURED_REPORT', projectRelevanceType: 'GENERIC' } as any;
    expect(component.isIgnoredEvidence(struct)).toBeFalse();

    const notSupports = { stance: 'CONTRADICTS', evidenceNature: 'SEMANTIC', projectRelevanceType: 'GENERIC' } as any;
    expect(component.isIgnoredEvidence(notSupports)).toBeFalse();
  });

  it('should handle validatedScoreLabel for VALIDATED and OVERRIDDEN', () => {
    component.evaluation = evaluation({ validationStatus: 'VALIDATED', finalValidatedScore: 85 });
    expect(component.validatedScoreLabel).toBe('85.00 / 100');

    component.evaluation = evaluation({ validationStatus: 'OVERRIDDEN', finalValidatedScore: 92 });
    expect(component.validatedScoreLabel).toBe('92.00 / 100');
  });

  it('should handle validatedScoreLabel for PENDING', () => {
    component.evaluation = evaluation({ validationStatus: 'PENDING', finalValidatedScore: null });
    expect(component.validatedScoreLabel).toBe('-');
  });

  it('should handle uniqueWeaknesses and uniqueRecommendations', () => {
    component.evaluation = evaluation({
      weaknesses: ['LOW_EVIDENCE_COUNT', 'CONTRADICTORY_EVIDENCE_FOUND'],
      recommendations: ['ADD_DOCUMENT_EVIDENCE'],
    });
    expect(component.uniqueWeaknesses.length).toBe(2);
    expect(component.uniqueRecommendations.length).toBe(1);
  });

  it('should handle localizedReason substring matching', () => {
    const result: ResultatCritereResponse = {
      ...note,
      explanation: 'Eliminatory state derived from validated evidence.',
    };
    expect(component.criterionExplanation(result)).toContain("L\u2019état éliminatoire repose");

    const result2: ResultatCritereResponse = {
      ...note,
      explanation: 'Evidence-conditioned score calculation.',
    };
    expect(component.criterionExplanation(result2)).toContain('Score calculé à partir');
  });

  it('should handle localizedReason fallback for unknown code', () => {
    const result: ResultatCritereResponse = {
      ...note,
      explanation: 'SOME_UNKNOWN_CODE',
    };
    expect(component.criterionExplanation(result)).toBe('SOME_UNKNOWN_CODE');
  });

  it('should handle criterionExplanation when explanation is null', () => {
    const result: ResultatCritereResponse = { ...note, explanation: null };
    expect(component.criterionExplanation(result)).toBeNull();
  });

  it('should handle localizedMessage and localizedMessages', () => {
    expect(component.localizedMessage(null)).toBe('');
    expect(component.localizedMessage('LOW_EVIDENCE_COUNT')).toContain('limité');
    expect(component.localizedMessages(['ADD_DOCUMENT_EVIDENCE', 'ADD_IMAGE_EVIDENCE'])).toContain('preuve documentaire');
    expect(component.localizedMessages(null)).toBe('');
  });

  it('should handle modelDisplayName with and without backslashes', () => {
    component.evaluation = evaluation({ modelName: 'models\\gpt-4\\gpt-4-turbo' });
    expect(component.modelDisplayName).toBe('gpt-4-turbo');

    component.evaluation = evaluation({ modelName: 'plain-model' });
    expect(component.modelDisplayName).toBe('plain-model');

    component.evaluation = evaluation({ modelName: null });
    expect(component.modelDisplayName).toBeNull();
  });

  it('should handle evidenceReferences with invalid JSON', () => {
    const result: ResultatCritereResponse = {
      ...note,
      evidenceJson: 'not-valid-json',
    };
    expect(component.evidenceReferences(result)).toEqual([]);
  });

  it('should handle evidenceReferences with non-array JSON', () => {
    const result: ResultatCritereResponse = {
      ...note,
      evidenceJson: '{"key":"value"}',
    };
    expect(component.evidenceReferences(result)).toEqual([]);
  });

  it('should handle evidenceReferences with non-object items filtered', () => {
    const result: ResultatCritereResponse = {
      ...note,
      evidenceJson: '[null, "string", 42, {"evidenceId":"ev1","stance":"SUPPORTS","projectRelevanceType":"PROJECT_SPECIFIC"}]',
    };
    const refs = component.evidenceReferences(result);
    expect(refs.length).toBe(1);
  });

  it('should handle displayScore for null and undefined', () => {
    expect(component.displayScore(null)).toBe('Non calculé');
    expect(component.displayScore(undefined)).toBe('Non calculé');
    expect(component.displayScore(42)).toBe('42.00 / 100');
  });

  it('should handle hasCriterionDetails for empty result', () => {
    const empty: ResultatCritereResponse = { id: 99, critereId: 99, critereLibelle: 'Empty', typeCritere: 'NOTE' };
    expect(component.hasCriterionDetails(empty)).toBeFalse();
  });

  it('should handle blockingCriteriaNames fallback from eliminatoires', () => {
    component.evaluation = evaluation({ resultats: [eliminatoireOk, eliminatoireKo] });
    delete (component.evaluation as any).blockingCriteriaNames;
    expect(component.blockingCriteriaNames).toEqual(['Git disponible']);
  });

  it('should handle evaluateComplete with score null and no incomplete', () => {
    component.evaluation = evaluation({ scoreFinal: null, evaluationComplete: undefined });
    expect(component.evaluationComplete).toBeTrue();
  });

  it('should handle resultLabel for NOTE with noteValue only', () => {
    const noteOnly: ResultatCritereResponse = {
      ...note,
      mlScore: null,
      mlMaxScore: null,
      noteValue: 3,
      noteObtenue: undefined,
      bareme: null,
      noteLabel: null,
    };
    expect(component.resultLabel(noteOnly)).toBe('3');
  });
});
