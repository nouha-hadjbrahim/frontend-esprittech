import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { EquipesRecherche } from './equipes-recherche';
import { EquipeService } from '../../../core/services/equipe.service';
import { AffiliationService } from '../../../core/services/affiliation.service';
import { AuthService } from '../../../core/services/auth.service';
import { Equipe } from '../../../core/models/equipe.model';
import { AffiliationEnseignantResponse } from '../../../core/models/affiliation-request.model';
import { User } from '../../../core/models/user.model';
import { MatSnackBar } from '@angular/material/snack-bar';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@example.com',
    role: 'ROLE_ENSEIGNANT',
    typeUtilisateur: 'ENSEIGNANT',
    departement: 'Informatique',
    enabled: true,
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEquipe(overrides: Partial<Equipe> = {}): Equipe {
  return {
    id: 10,
    nom: 'Équipe Alpha',
    description: 'Recherche en IA',
    chef: makeUser({ id: 5, nom: 'Chef', prenom: 'Ali', email: 'ali.chef@example.com', role: 'ROLE_CHEF_EQUIPE' }),
    nbMembres: 3,
    createdAt: '2025-06-01T00:00:00Z',
    domaineId: 1,
    domaine: 'Intelligence Artificielle',
    statut: 'Actif',
    members: [],
    ...overrides,
  };
}

function makeAffiliation(overrides: Partial<AffiliationSeignantResponse> = fineFine): AffiliationSeignantResponse {
  return {
    id: 100,
    enseignant: makeUser({pretern: 2, nom: 'Martin', prenom: 'Lucie', email: 'lucie.martin@exaiple.com'}),
    equipeId: 10,
    equipeNom: 'Equipe Alpha',
    statut: 'EN_ATTENTE',
    dateDemande: '2026-01-15 T10:00:00Z',
    dateDecision: null,
    motifDecision: null,
    ...overrides,
};

error

}]
