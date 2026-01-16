# SPEC.md — MVP App RSE (Module 1) + Admin + Code d’accès + Suivi (Supabase)

## 0. Vision
Application web de micro-formation (Module 1 RSE pour PME africaines).  
Public cible : dirigeants / managers de PME Ivoirien  
Objectif : permettre de suivre un module, répondre à un quiz, et enregistrer les résultats afin que l’admin suive l’activité par **code d’accès partagé** (client/prospect).

MVP : pas de compte apprenant, pas de mot de passe apprenant.  
Seul l’admin se connecte.

## 1. Choix techniques (recommandés)

### Frontend
- Framework : Next.js (App Router) + TypeScript
- UI : Tailwind CSS
- Animations : Framer Motion (transitions d’écrans + micro-animations)
- Accès module : **code à partager** (QR code optionnel, non prioritaire)

### Backend / Data
- Supabase
- Auth : Supabase Auth (email + password) pour admin uniquement

## 2. Rôles
- Un seul rôle : Admin
## 3. Fonctionnalités MVP

### 3.1 Parcours apprenant (sans compte)
L’utilisateur ne se connecte pas.  
Pour accéder au module, il doit saisir :
- un **code d’accès** (fourni par l’admin)
- un **nom** (pour différencier les participants)

Accès possible via :
- saisie manuelle du code (mécanisme principal)

À la fin :
- l’utilisateur voit son score
- l’utilisateur peut laisser un message que l’admin recoit dans un groupe whatssape creer a lavance (CTA)

### 3.2 Contenu + Quiz
- MVP : implémenter uniquement le **Module 1 – Niveau Débutant**
- Modules 2 (Intermédiaire) et 3 (Avancé) prévus plus tard

Module 1 :
- contenu pédagogique court (définitions clés / principes RSE)
- quiz ~5 questions QCM
- feedback par question (bonne/mauvaise réponse + explication courte)
- score final

Enregistrer :
- nom participant
- code d’accès utilisé
- réponses
- score
- temps / progression

---

### 3.3 Admin
- Connexion admin : `/admin/login`
- Dashboard : `/admin/dashboard`
- Dashboard simple, avec des etapes et truc expliquer pour que un vieux pas informatique comprenne,

Fonctionnalités admin :
- Créer un module actif (Module 1 – Débutant)
- Générer un **code d’accès à partager**
- Paramétrer :
  - code actif / inactif
  - durée limitée ou illimitée
- Voir les résultats par code :
  - liste des participants
  - scores
  - dates
- Statistiques simples :
  - nombre de participants
  - score moyen

QR code :
- Génération possible à partir du code (optionnelle)
- Non bloquante pour le MVP

## 4. UX / Animation (mobile-first, app-like)

### 4.1 Parcours en écrans
Le parcours utilisateur est structuré en écrans successifs :
- Onboarding
- Quiz (1 question = 1 écran)
- Résultat
- CTA WhatsApp

Navigation :
- transitions slide left/right
- barre de progression visible
- micro-animations “haptics-like”

### 4.2 Animations utiles
- transitions entre étapes
- feedback réponse :
  - shake si faux
  - pulse / scale si vrai
- score final animé (compte progressif)
- cartes qui apparaissent au scroll

### 4.3 Performance
- animations Framer Motion maîtrisées
- éviter les images lourdes
- limiter les re-renders
- lazy load des écrans si nécessaire

## 5. UI
- Style sobre, moderne, professionnel
- Mobile-first
- Accessibilité de base respectée
- Onboarding clair :
  - titre module
  - durée estimée (20–30 min)
  - bouton “Commencer”

## 6. Contenu
- Contenu stocké en JSON dans le repo
- Pas d’éditeur admin pour le MVP

Exemple :
- `src/content/module1.json`

## 7. Règles
- Pas de compte apprenant
- Un seul admin
- Module 1 uniquement
- QR code non prioritaire
- Objectif : simplicité et fluidité

## 8. Notes
- Palette couleurs sobre
- Modules 2 et 3 hors scope MVP

et aussi le module 1 sera fait en dure



les Clé de mon Supabase 
anon public : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqYWR3dWFvYnh6amRranVpb3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMjA3MDQsImV4cCI6MjA2NDU5NjcwNH0._IeaCn4Wo-VnLdKhagBCpc9qKr5031Hlgma1unVkhSI

service_role secret: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqYWR3dWFvYnh6amRranVpb3RwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTAyMDcwNCwiZXhwIjoyMDY0NTk2NzA0fQ.3XPzovmx4Les9AE-lYffSW-XgdcU1hikRirQvl_ASL8

URL: https://ajadwuaobxzjdkjuiotp.supabase.co
