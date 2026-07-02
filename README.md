# Les Palmiers de l'Entre-Deux — Système de gestion de gîte

Application fullstack de gestion de réservations pour le gîte touristique **Les Palmiers de l'Entre-Deux** (La Réunion).

---

## Stack technique

| Couche | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite, React Router v6 |
| Backend | Node.js, Express.js, TypeScript |
| Base de données | PostgreSQL 15+ |
| Authentification | JWT (session 15 min, RG8) |
| Emails | Nodemailer + cron automatique |

---

## Structure du projet

```
les-palmiers/
├── client/          # Frontend React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/   # UI communs + layout
│   │   ├── context/      # AuthContext (JWT + timer session)
│   │   ├── pages/        # Pages par fonctionnalité
│   │   ├── services/     # API axios
│   │   ├── types/        # Types TypeScript
│   │   └── utils/        # Helpers (format, statuts…)
│   └── ...
└── server/          # Backend Express + TypeScript
    ├── migrations/       # SQL initial (schéma + données)
    ├── src/
    │   ├── config/       # Pool PostgreSQL
    │   ├── controllers/  # EPIC 1-8
    │   ├── middleware/   # Auth JWT + Audit
    │   ├── routes/       # Routage API
    │   ├── services/     # Tarif, Email, Audit
    │   └── types/        # Types TypeScript backend
    └── ...
```

---

## Prérequis

- Node.js ≥ 18
- PostgreSQL ≥ 15
- npm ≥ 9

---

## Installation

### 1. Base de données

```bash
createdb les_palmiers
psql les_palmiers < server/migrations/001_init.sql
```

### 2. Backend

```bash
cd server
cp .env.example .env
# Éditer .env avec vos paramètres (DB, JWT_SECRET, SMTP…)
npm install
npm run dev
```

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

L'application sera accessible sur `http://localhost:5173`.

---

## Comptes par défaut

| Login | Mot de passe | Rôle |
|---|---|---|
| `sophie.vandroux` | `Admin2026!` | Gérante (accès total) |
| `jean-hugues.payet` | `Employe2026!` | Employé |
| `chantal.doris` | `Comptable2026!` | Comptable |
| `eric.fontaine` | `Tech2026!` | Technicien |

> ⚠️ Changer tous les mots de passe avant mise en production.

---

## Variables d'environnement (server/.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/les_palmiers
JWT_SECRET=your-secret-key-minimum-32-chars
PORT=3000

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=no-reply@lespalmiers.re
SMTP_PASS=your-smtp-password
EMAIL_FROM=Les Palmiers <no-reply@lespalmiers.re>
```

---

## Règles de gestion implémentées

| Règle | Description |
|---|---|
| **RG1** | Vérification disponibilité chambre avant toute réservation |
| **RG2** | Calcul tarifaire : tarif de base × saison |
| **RG3** | Supplément week-end +20% (vendredi→samedi et samedi→dimanche) |
| **RG4** | Dégressif long séjour : -10% si > 5 nuits (sur tout le séjour) |
| **RG5** | Pénalités d'annulation selon délai avant arrivée |
| **RG6** | Blocage fermeture annuelle 15-30 septembre (toutes chambres) |
| **RG7** | TVA non applicable — art. 293 B du CGI |
| **RG8** | Session utilisateur expirée après 15 min d'inactivité |
| **RG9** | Blocage manuel de chambre (maintenance, etc.) |
| **RG10** | Détection VIP client (≥ 3 séjours ou chiffre d'affaires > 1 000 €) |

### Gestion groupe (≥ 8 personnes)
- Arrhes obligatoires à la réservation
- Type de paiement `ARRHES` distinct dans l'historique

### Mode hors ligne
- Alerte visuelle en cas de coupure réseau
- Fallback localStorage pour les données critiques

---

## API — Endpoints principaux

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/chambres
GET    /api/chambres/disponibilite
GET    /api/chambres/calendrier
POST   /api/chambres/:id/blocages

GET    /api/reservations
POST   /api/reservations
POST   /api/reservations/calculer      ← simulation tarifaire
GET    /api/reservations/arrivees-du-jour
PATCH  /api/reservations/:id/statut
GET    /api/reservations/:id/facture

GET    /api/clients
POST   /api/clients
PUT    /api/clients/:id
GET    /api/clients/:id/export-rgpd

POST   /api/reservations/:id/paiements

GET    /api/admin/dashboard
GET    /api/admin/indicateurs
GET    /api/admin/export-comptabilite
GET    /api/admin/utilisateurs
GET    /api/admin/audit
GET    /api/admin/modeles-email
PUT    /api/admin/modeles-email/:id
```

---

## Données initiales incluses

- **6 chambres** : Vanille, Ylang, Suite Bougainvillée (PMR), Coco, Vétiver, Suite Géranium
- **18 tarifs** : 3 saisons × 6 chambres
- **5 vélos** disponibles à la location
- **3 partenaires** locaux + 5 activités référencées
- **5 modèles email** paramétrables depuis l'interface admin
- **Fermeture annuelle** 15-30 septembre pré-configurée

---

## Build production

```bash
# Backend
cd server && npm run build
node dist/app.js

# Frontend
cd client && npm run build
# Servir dist/ via nginx ou tout serveur HTTP statique
```

---

## Licence

Usage interne — Les Palmiers de l'Entre-Deux, La Réunion.
