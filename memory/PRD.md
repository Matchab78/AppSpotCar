# Street.OS - Car Spotting App PRD

## Vision
Street.OS est une application mobile de carspotting permettant aux passionnés automobiles de photographier, identifier et partager des voitures repérées dans la rue, avec un système de gamification basé sur la rareté.

## Fonctionnalités Implémentées

### 1. Authentification
- Inscription/Connexion email + mot de passe (JWT)
- Connexion Google OAuth (Emergent Auth)
- Session persistante (7 jours)
- Logout

### 2. Capture & Identification
- Prise de photo via caméra ou galerie
- Reconnaissance IA automatique (GPT-4o vision) : marque, modèle, année, rareté
- Édition manuelle des infos (fallback)
- Géolocalisation automatique du spot

### 3. Système de Points
| Tier | Points | Exemples |
|------|--------|----------|
| Common | 5 | BMW 3 Series, Audi A3, VW Golf |
| Sport | 15 | BMW M3, Audi S3, Mercedes AMG C43 |
| Performance | 30 | Audi R8, BMW M5 CS, Nissan GT-R |
| Supercar | 50 | Porsche 911 GT3, Corvette Z06 |
| Hypercar | 100 | Ferrari, Lamborghini, McLaren |
| Ultra Rare | 200 | Bugatti, Pagani, Koenigsegg |

### 4. Badges
- **Count**: First Spot (1), Spotter (10), Collector (50), Photographer (100), Legend (500)
- **Ranking**: Top 10, Top 3, Champion #1
- **Categories**: Supercar Hunter, German Expert, Italian Stallion

### 5. Social Feed
- Feed de tous les spots récents
- Likes (toggle)
- Commentaires
- Vue détaillée de chaque spot

### 6. Classement
- Leaderboard temps réel
- Podium top 3 visuel
- Rang personnel affiché

### 7. Profil
- Stats (points, spots, badges)
- Galerie de mes spots
- Affichage des badges
- Rank personnel

## Stack Technique
- **Frontend**: Expo SDK 54 + React Native + expo-router
- **Backend**: FastAPI + Python
- **Database**: MongoDB
- **IA**: OpenAI GPT-4o (via Emergent LLM Key)
- **Auth**: JWT + Emergent Google OAuth
- **Géolocalisation**: expo-location

## Admin Panel
- **Email admin** : mathischab78@gmail.com (flag `is_admin: true` en BDD)
- **Fonctionnalités** :
  - Dashboard stats globales (utilisateurs, spots, commentaires, likes, bannis, distribution rareté)
  - Gestion utilisateurs : voir, bannir/débannir, supprimer (cascade: spots + commentaires + sessions)
  - Gestion spots : voir, supprimer (retire les points au user)
  - Gestion commentaires : supprimer
  - Gestion badges : ajouter/retirer manuellement
- **Accès** : Onglet "Admin" visible uniquement pour les utilisateurs admin
- **Sécurité** : Tous les endpoints `/api/admin/*` protégés par middleware `require_admin`
- Protection : impossible de ban/supprimer un autre admin

## Accès base de données
Voir le fichier `GUIDE_MONGODB.md` à la racine du projet pour les instructions complètes (MongoDB Compass + mongosh).

## Design
- Dark mode exclusif
- Thème "Street.OS" HUD/Neon
- Couleurs: Zinc backgrounds (#09090B) + Red primary (#EF4444) + Gold accent (#EAB308)
