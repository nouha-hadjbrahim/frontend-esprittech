import { User } from './user.model';

/** Équipe de recherche (EquipeResponse backend). */
export interface Equipe {
  id: number;
  nom: string;
  description: string | null;
  chef: User | null;
  emailChef?: string;
  nbMembres: number;
  createdAt: string;
  domaineId: number;
  domaine: string;
  statut: 'Actif' | 'Inactif';
  members?: User[];
  chefId?: number | null;
  memberIds?: number[] | null;
}

/** Corps de création d'une équipe (admin). */
export interface CreateEquipeRequest {
  nom: string;
  description?: string;
  domaineId: number;
  chefId?: number;
  memberIds?: number[];
}

/** Payload de création renvoyé par le dialogue. */
export interface CreateEquipePayload {
  nom: string;
  description: string | null;
  domaineId: number;
  chefId: number | null;
  memberIds: number[] | null;
}

/** Corps d'assignation/changement de chef. */
export interface AssignChefRequest {
  chefId: number;
}

/** Corps d'ajout de membres. */
export interface AjouterMembresRequest {
  memberIds: number[];
}
