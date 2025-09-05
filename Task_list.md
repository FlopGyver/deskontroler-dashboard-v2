# 📋 DeskKontroler v2 - TODO List

## 📊 Récapitulatif Global


//////////////////////
Pour prochaine session
//////////////////////

- imprmante en attente alors que non connecté ==> se baser sur mqtt moonraker online|offline Ender3V3/moonraker/status
- Revoir affichage globale de printerview controle et vue d'ensemble. Temp Ok.
- 
//////////////////////

| Catégorie | Tâche | Durée | Priorité | Impact | État |
|-----------|-------|-------|----------|--------|------|
| **UX/Esthétique** | Carrousel tuile media HomeView | 2h | Haute | Visuel | ❌ |
| **UX/Esthétique** | Phrases hydratation multiples | 1h | Haute | UX | ❌ |
| **Fonctionnalité** | Page impression 3D dédiée | 4h | Moyenne | Fonctionnel | ❌ |
| **Fonctionnalité** | Page contrôle PC applications | 6h | Basse | Nouveau | ❌ |
| **Déploiement** | Configuration Docker production | 2h | Basse | Ops | ❌ |

**Total estimé : 15 heures** | **Projet actuel : 93% terminé**

---

## 🚀 Phase 1 : Améliorations Esthétiques Prioritaires (3h)
>
> **Objectif** : Finaliser l'expérience utilisateur de base

### 🎨 Carrousel Tuile Media (2h)

**Fichier** : `src/views/HomeView.vue`

- Récupérer historique artworks des dernières pistes YouTube Music
- Implémenter rotation automatique toutes les 5 secondes
- Ajouter transition smooth entre artworks
- Gérer fallback si pas d'historique artwork

### 💧 Phrases Hydratation Multiples (1h)

**Fichier** : `src/services/contentService.ts`

- Créer array de 6-8 phrases hydratation variées
- Remplacer phrase unique actuelle
- Implémenter sélection aléatoire
- Tester rotation dans section info HomeView

---

## ⚙️ Phase 2 : Fonctionnalités Étendues (10h)
>
> **Objectif** : Ajouter nouvelles capacités système

### 🖨️ Page Impression 3D Dédiée (4h)

**Nouveaux fichiers** : `src/views/PrinterView.vue`

#### Structure et Navigation (1h)

- Créer route `/printer` dans router
- Ajouter navigation depuis navbar (si impression active)
- Design layout avec sidebar moderne

#### Sections Interface (3h)

- **Vue d'ensemble** : État, progression, temps restant
- **Graphiques températures** : Bed + extruder temps réel
- **Infos fichier** : Couches actuelles/totales, hauteur, filament
- **Contrôles** : Pause, stop, ajuster températures (via HA)
- **Historique** : Dernières impressions terminées

### 🖥️ Page Contrôle PC Applications (6h)

**Nouveaux fichiers** : `src/views/PCControlView.vue`

#### Interface Frontend (3h)

- Créer route `/pc` dans router
- Grille d'applications avec icônes
- **Apps directes** : Discord, Teams, Outlook, WhatsApp
- **Raccourcis Chrome** : Twitch, YouTube, ChatGPT, YGG
- États visuels (disponible/lancement/erreur)

#### Backend Python (3h)

**Fichier** : `deskontroler_bridge.py`

- Nouveaux endpoints `/pc/launch/<app_name>`
- Mapping commandes par application
- Gestion lancement sécurisé subprocess
- Détection applications installées
- Retour statut succès/erreur

---

## 🐳 Phase 3 : Déploiement Production (2h)
>
> **Objectif** : Containerisation et automatisation

### Configuration Docker (2h)

**Nouveaux fichiers** : `docker-compose.yml`, `Dockerfile`, `.dockerignore`

#### Services Container

- **Frontend Vue.js** : Build optimisé + nginx
- **Reverse Proxy** : nginx avec SSL optionnel
- **Volumes** : Persistance configuration + logs
- **Networks** : Isolation services + exposition ports
- **Health Checks** : Monitoring services
- **Auto-restart** : Politiques redémarrage

---

## 📅 Planning Recommandé

### 🎯 Sprint 1 - Finitions UX (1 jour)

- ✅ **Matin** : Carrousel tuile media (2h)
- ✅ **Après-midi** : Phrases hydratation (1h)
- **Livrable** : Système 95% terminé, UX finalisée

### 🎯 Sprint 2 - Nouvelles Fonctionnalités (1-2 jours)

- ✅ **Jour 1** : Page impression 3D (4h)
- ✅ **Jour 2** : Page contrôle PC (6h)
- **Livrable** : Système 98% terminé, toutes fonctionnalités

### 🎯 Sprint 3 - Production (optionnel)

- ✅ **Matin** : Configuration Docker (2h)
- **Livrable** : Système 100% production-ready

---

## 💡 Notes d'Implémentation

### Réutilisation Existante

- **Services** : Tous les services backend sont déjà opérationnels
- **Composants** : Réutiliser navbar, sidebar, modals existants
- **Styles** : Cohérence avec design system actuel
- **APIs** : Home Assistant et Bridge Python déjà configurés

### Points d'Attention

- **Page impression** : Utiliser entités HA existantes (`homeAssistantService.ts`)
- **Page contrôle PC** : Étendre endpoints bridge Python existant
- **Docker** : Préserver configuration `.env.local` existante
- **Performance** : Éviter polling excessif nouvelles pages

### Tests Recommandés

- **Carrousel** : Vérifier transitions smooth et fallbacks
- **Hydratation** : Tester rotation phrases sur plusieurs cycles
- **Impression** : Valider données temps réel pendant impression active
- **Contrôle PC** : Tester lancement apps sur PC cible
- **Docker** : Valider build et démarrage tous services

---

## 🏁 État Cible Final

À l'issue de ces développements :

- **Interface** : 100% complète avec 6 pages (Home, Media, Meteo, Timer, Phone, Printer, PC)
- **Fonctionnalités** : 100% système bureau complet
- **UX** : 100% expérience utilisateur finalisée
- **Production** : 100% déployable via Docker
- **Maintenance** : 100% documenté et supporté

**Système DeskKontroler v2 finalisé à 100% !** 🎉
