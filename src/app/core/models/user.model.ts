/** Rôles applicatifs (miroir de l'enum backend Role). */
export type Role =
  | 'ROLE_ETUDIANT'
  | 'ROLE_ENSEIGNANT'
  | 'ROLE_CHEF_EQUIPE'
  | 'ROLE_ADMIN'
  | 'ROLE_CI';

/** Type d'utilisateur issu du référentiel. */
export type TypeUtilisateur = 'ETUDIANT' | 'ENSEIGNANT';

/** Utilisateur tel que renvoyé par l'API (UserResponse). */
export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  typeUtilisateur: TypeUtilisateur;
  departement: string | null;
  enabled: boolean;
  createdAt: string | null;
  /** Affiliation à une équipe de recherche (membre ou chef). */
  isAffilieToEquipe?: boolean;
  equipeId?: number | null;
  equipeNom?: string | null;
}

/** Corps de mise à jour d'un utilisateur par l'admin (UpdateUserRequest backend). */
export interface UpdateUserRequest {
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  enabled: boolean;
}

/** Corps de création directe d'un utilisateur par l'admin (CreateUserRequest backend). */
export interface CreateUserRequest {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: Role;
  enabled: boolean;
}

/** Corps de la requête d'inscription. */
export interface RegisterRequest {
  nom: string;
  prenom: string;
  email: string;
  password: string;
}

/** Corps de la requête de connexion. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Corps de mise à jour du profil par l'utilisateur lui-même (email non modifiable). */
export interface UpdateProfileRequest {
  nom: string;
  prenom: string;
}

/** Corps de la requête de changement de mot de passe. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
