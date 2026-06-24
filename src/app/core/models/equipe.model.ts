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
  domaine: string;
  statut: 'Actif' | 'Inactif';
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
