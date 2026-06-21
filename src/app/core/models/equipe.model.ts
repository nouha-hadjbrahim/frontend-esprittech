import { User } from './user.model';

/** Équipe de recherche (EquipeResponse backend). */
export interface Equipe {
  id: number;
  nom: string;
  description: string | null;
  chef: User | null;
  nbMembres: number;
  createdAt: string;
}

/** Corps de création d'une équipe (admin). */
export interface CreateEquipeRequest {
  nom: string;
  description?: string;
  chefId: number;
}

/** Corps d'assignation/changement de chef. */
export interface AssignChefRequest {
  chefId: number;
}
