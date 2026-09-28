# EspritTECH — Frontend

> Plateforme web de gouvernance des projets académiques d'ESPRIT : **stages, PFE et projets R&D (RDI)**.

Interface Angular de la plateforme EspritTECH. Elle consomme l'API Spring Boot (`com.esprittech.rdi`) et couvre les six axes fonctionnels de la plateforme.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Lancement](#lancement)
- [Structure du projet](#structure-du-projet)
- [Authentification & sécurité](#authentification--sécurité)
- [Notifications temps réel](#notifications-temps-réel)
- [Scripts disponibles](#scripts-disponibles)
- [Docker](#docker)
- [CI/CD (GitLab)](#cicd-gitlab)
- [Conventions](#conventions)

---

## Fonctionnalités

| Axe | Description |
|---|---|
| **Gouvernance des sujets** | Proposition, validation et publication des sujets de stage / PFE / R&D |
| **Candidatures** | Dépôt et suivi des candidatures des étudiants, sélection par les encadrants |
| **Réalisation des projets** | Suivi d'avancement, livrables, jalons |
| **Catalogue d'applications** | Vitrine des applications issues des projets |
| **Évaluation** | Grilles d'évaluation + scoring assisté par IA (ScoreEngine) |
| **Industrialisation** | Passage des projets vers un usage réel / partenaires |

Autres modules transverses : tableau de bord par rôle, notifications temps réel, gestion documentaire (MinIO).

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Angular 20 (standalone components) |
| Langage | TypeScript |
| HTTP | `HttpClient` + interceptors (`withCredentials`) |
| Temps réel | WebSocket / STOMP (`@stomp/rx-stomp` ou `@stomp/stompjs`) |
| Authentification | Azure Entra ID (via backend) + JWT en cookie **HttpOnly** |
| Autorisation | RBAC — guards Angular par rôle |
| Build / Déploiement | Angular CLI, Docker (Nginx), GitLab CI/CD |

Services backend consommés :

| Service | Rôle | URL locale (défaut) |
|---|---|---|
| API Spring Boot | API REST métier + auth | `http://localhost:8080` |
| ScoreEngine (FastAPI) | Évaluation IA des projets | via l'API Spring Boot |
| MinIO | Stockage des fichiers | via l'API Spring Boot |
| WebSocket | Notifications | `ws://localhost:8080/ws` |

---

## Prérequis

- **Node.js** ≥ 20.19 (LTS recommandée)
- **npm** ≥ 10
- **Angular CLI** 20 :
  ```bash
  npm install -g @angular/cli@20
  ```
- Backend EspritTECH démarré (Spring Boot + MySQL + MinIO)

---

## Installation

```bash
# 1. Cloner le dépôt
git clone <url-du-depot-gitlab>/esprittech-frontend.git
cd esprittech-frontend

# 2. Installer les dépendances
npm install
```

---

## Configuration

Les variables d'environnement se trouvent dans `src/environments/` :

```ts
// src/environments/environment.ts  (développement)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  wsUrl: 'ws://localhost:8080/ws',
};
```

```ts
// src/environments/environment.prod.ts  (production)
export const environment = {
  production: true,
  apiUrl: '/api',
  wsUrl: '/ws',
};
```

### Proxy de développement (optionnel, recommandé)

Évite les problèmes CORS et garantit que les cookies HttpOnly sont bien transmis :

```json
// proxy.conf.json
{
  "/api": { "target": "http://localhost:8080", "secure": false, "changeOrigin": true },
  "/ws":  { "target": "http://localhost:8080", "secure": false, "ws": true }
}
```

```bash
ng serve --proxy-config proxy.conf.json
```

---

## Lancement

```bash
# Serveur de développement → http://localhost:4200
npm start
# ou
ng serve
```

L'application se recharge automatiquement à chaque modification.

---

## Structure du projet

```
esprittech-frontend/
├── src/
│   ├── app/
│   │   ├── core/                 # Singletons : services globaux, interceptors, guards
│   │   │   ├── auth/             # AuthService, authGuard, roleGuard
│   │   │   ├── interceptors/     # credentials, gestion d'erreurs HTTP
│   │   │   └── websocket/        # Service STOMP / notifications
│   │   ├── shared/               # Composants, pipes, directives réutilisables
│   │   ├── features/             # Un dossier par axe fonctionnel
│   │   │   ├── sujets/
│   │   │   ├── candidatures/
│   │   │   ├── realisation/
│   │   │   ├── catalogue/
│   │   │   ├── evaluation/
│   │   │   └── industrialisation/
│   │   ├── layout/               # Header, sidebar, templates de page
│   │   ├── app.routes.ts         # Routes (lazy loading par feature)
│   │   └── app.config.ts         # Providers (HttpClient, router, interceptors)
│   ├── assets/
│   ├── environments/
│   └── styles.scss
├── proxy.conf.json
├── angular.json
├── Dockerfile
├── nginx.conf
└── .gitlab-ci.yml
```

> ⚠️ **Règle du projet** : les nouveaux écrans s'intègrent dans les templates/layouts existants — ne pas recréer un template déjà présent.

---

## Authentification & sécurité

1. L'utilisateur se connecte avec son compte **`@esprit.tn`** (Azure Entra ID).
2. Le backend valide l'identité et dépose un **JWT dans un cookie HttpOnly** (`Secure`, `SameSite`).
3. Le frontend **ne stocke jamais le token** (ni `localStorage`, ni `sessionStorage`) → protection contre le vol de token par XSS.
4. Toutes les requêtes partent avec `withCredentials: true` via un interceptor :

```ts
// core/interceptors/credentials.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ withCredentials: true }));
```

5. Les routes sont protégées par des guards RBAC :

```ts
// app.routes.ts (extrait)
{
  path: 'evaluation',
  canActivate: [authGuard, roleGuard],
  data: { roles: ['ENSEIGNANT', 'ADMIN'] },
  loadChildren: () => import('./features/evaluation/evaluation.routes'),
}
```

> Les guards améliorent l'UX ; **l'autorisation réelle est toujours vérifiée côté backend**.

---

## Notifications temps réel

Connexion STOMP au endpoint `/ws`, abonnement aux files personnelles :

```ts
this.stomp.watch('/user/queue/notifications')
  .subscribe(msg => this.notifications.push(JSON.parse(msg.body)));
```

---

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm start` | Serveur de dev (`ng serve`) |
| `npm run build` | Build de production dans `dist/` |
| `npm test` | Tests unitaires |
| `npm run lint` | Analyse statique (si ESLint configuré) |
| `ng generate component features/<axe>/<nom>` | Nouveau composant |

---

## Docker

Build multi-stage (Node → Nginx) :

```dockerfile
# Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
COPY --from=build /app/dist/esprittech-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```nginx
# nginx.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / { try_files $uri $uri/ /index.html; }          # routing Angular
  location /api/ { proxy_pass http://backend:8080/api/; }   # API
  location /ws { proxy_pass http://backend:8080/ws;         # WebSocket
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

```bash
docker build -t esprittech-frontend .
docker run -p 4200:80 esprittech-frontend
```

---

## CI/CD (GitLab)

Pipeline type (`.gitlab-ci.yml`) :

| Stage | Action |
|---|---|
| `install` | `npm ci` (cache `node_modules`) |
| `test` | Tests unitaires |
| `build` | `ng build --configuration production` |
| `docker` | Build + push de l'image vers le registry GitLab |
| `deploy` | Déploiement de l'image (branche `main`) |

---

## Conventions

- **Branches** : `main` (stable), `develop`, `feature/<nom>`, `fix/<nom>`
- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `refactor:`, `docs:`…
- **Composants** : standalone, un dossier par feature, lazy loading
- **Langue** : code en anglais, libellés UI en français

---

## Projet

Réalisé dans le cadre d'un stage à **ESPRIT** — projet *Industrialisation des Projets EspritTECH & RDI*.
