import { User } from './user.model';

/** Réponse d'authentification (AuthResponse backend). */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
}

/** Corps de la requête de rafraîchissement de token. */
export interface RefreshTokenRequest {
  refreshToken: string;
}
