# CAHIER DES CHARGES - PROJET DE STAGE M2

## FICHE D'IDENTIFICATION

| Champ | Valeur |
|-------|--------|
| **Intitulé du projet** | Développement d'un système de gestion des réservations et de la relation client pour un gîte touristique |
| **Client** | Les Palmiers de l'Entre-Deux - Gîte de charme |
| **Adresse** | 12 Rue des Palmiers, 97440 L'Entre-Deux, La Réunion |
| **Contact principal** | Mme Sophie VANDROUX - Propriétaire et gérante |
| **Téléphone** | 0262 12 34 56 |
| **Email** | contact@lespalmiers-reunion.re |
| **Durée du stage** | 3 mois (12 semaines) |
| **Localisation** | L'Entre-Deux, La Réunion |
| **Date de début souhaitée** | Septembre 2026 |

---

## 1. CONTEXTE ET HISTORIQUE

### 1.1 Présentation du client
Les Palmiers de l'Entre-Deux est un gîte touristique de 6 chambres situé dans les Hauts de La Réunion, à proximité des sites de randonnée et des cirques. Établi depuis 2018, le gîte accueille une clientèle variée : touristes métropolitains, randonneurs, familles en vacances et voyageurs d'affaires en déplacement sur l'île. Le gîte dispose d'un restaurant intérieur, d'une piscine, d'un jardin tropical et propose des services annexes (location de vélo, réservation de guides, transfert aéroport).

### 1.2 Situation actuelle
Actuellement, la gestion des réservations se fait via un tableur partagé entre Mme Vandroux et son employé à temps partiel. Les réservations téléphoniques et par email sont saisies manuellement. Les clients reçoivent une confirmation par email copié-collé depuis un modèle. Le suivi des paiements (acompte, solde) est géré sur un autre fichier. Les demandes spéciales (allergies alimentaires, lit bébé, horaires d'arrivée tardive) sont notées dans un carnet papier.

### 1.3 Problématiques identifiées
- Risque de double-réservation lors de demandes simultanées par téléphone et email
- Perte de temps importante sur la saisie manuelle et la recherche d'informations
- Absence de suivi des clients réguliers et de leur historique de séjour
- Difficulté à gérer les disponibilités en temps réel pour les partenaires (OT, agences locales)
- Manque de visibilité sur le taux d'occupation et les revenus prévisionnels
- Gestion désorganisée des services annexes (location vélo, transferts)

---

## 2. OBJECTIFS DU PROJET

### 2.1 Objectif général
Concevoir et mettre en place un système informatisé permettant de centraliser et d'automatiser la gestion des réservations, du suivi client et des services annexes du gîte, tout en garantissant la fiabilité des données et la traçabilité des opérations.

### 2.2 Objectifs spécifiques
1. Permettre la consultation et la mise à jour des disponibilités en temps réel
2. Automatiser l'enregistrement des réservations avec vérification de cohérence
3. Générer automatiquement les confirmations et rappels clients
4. Établir un suivi des paiements avec alertes sur les impayés
5. Constituer une base de données des clients pour fidélisation
6. Gérer les services annexes et leur planification
7. Produire des indicateurs de performance pour l'aide à la décision

---

## 3. PÉRIMÈTRE FONCTIONNEL DÉTAILLÉ

### 3.1 Module Gestion des Chambres et des Tarifs

#### 3.1.1 Description des chambres
Le système doit permettre de gérer les caractéristiques suivantes pour chaque chambre :
- Numéro et nom de la chambre (ex: "Bougainvillier", "Vanillier")
- Capacité d'accueil (nombre de lits simples, doubles, lits bébé)
- Surface en m²
- Équipements (climatisation, ventilateur, sèche-cheveux, bouilloire, mini-réfrigérateur)
- Vue (jardin, piscine, montagne)
- Accessibilité PMR (oui/non)
- Statut (disponible, en maintenance, hors service)

#### 3.1.2 Gestion des tarifs
- Tarif de base par nuit selon la saison (basse saison, moyenne saison, haute saison)
- Tarif dégressif pour séjour de plus de 5 nuits
- Tarif spécial week-end (vendredi-samedi)
- Tarif petit-déjeuner inclus ou en supplément
- Tarif enfant (-12 ans)
- Tarif lit supplémentaire
- Possibilité d'appliquer des promotions ponctuelles avec code promo

#### 3.1.3 Calendrier de disponibilité
- Visualisation mensuelle et hebdomadaire des occupations
- Blocage manuel de dates pour maintenance ou fermeture
- Indication visuelle des arrivées et départs du jour
- Consultation des réservations futures par chambre

### 3.2 Module Gestion des Réservations

#### 3.2.1 Création d'une réservation
Le processus de réservation doit inclure les étapes suivantes :
1. Vérification des disponibilités selon les dates demandées et le nombre de personnes
2. Sélection de la chambre ou proposition automatique selon les critères
3. Saisie des informations client (civilité, nom, prénom, téléphone, email, adresse)
4. Indication du nombre d'adultes et d'enfants avec âges
5. Enregistrement des demandes spéciales (allergies, régime alimentaire, horaire d'arrivée tardive, lit bébé)
6. Calcul automatique du montant total avec détail (nuitées, petits-déjeuners, taxes)
7. Enregistrement de l'acompte versé (30% minimum) et mode de paiement
8. Génération d'un numéro de réservation unique

#### 3.2.2 Modification et annulation
- Modification des dates avec vérification de disponibilité et recalcul
- Modification du nombre de personnes avec ajustement tarifaire
- Annulation avec enregistrement du motif et calcul des pénalités selon les conditions (gratuite > 7 jours, 50% entre 7 et 2 jours, 100% < 2 jours)
- Historique complet de toutes les modifications (qui, quand, quoi)

#### 3.2.3 Consultation et recherche
- Recherche par nom de client, numéro de réservation, dates
- Filtre par statut (confirmée, en attente d'acompte, annulée, terminée)
- Vue d'ensemble des arrivées et départs du jour
- Vue des réservations à venir sur les 7 prochains jours

### 3.3 Module Gestion des Clients

#### 3.3.1 Fiche client
- Informations d'identité et coordonnées
- Historique complet des séjours (dates, chambres, montants, commentaires)
- Préférences enregistrées (chambre préférée, allergies, régime)
- Nombre de séjours réalisés et montant total dépensé
- Statut (nouveau client, client régulier, client VIP à partir de 3 séjours)

#### 3.3.2 Segment client
- Catégorisation : touriste individuel, couple, famille, groupe, voyageur d'affaires
- Origine géographique : Métropole, Île Maurice, Madagascar, Europe, autres DOM-TOM
- Canal d'acquisition : direct, site web, booking, agence locale, bouche-à-oreille

### 3.4 Module Gestion des Paiements

#### 3.4.1 Suivi des encaissements
- Enregistrement de l'acompte à la réservation
- Enregistrement du solde à l'arrivée ou au départ
- Gestion des paiements en espèces, par carte, par virement, par chèque
- Gestion des arrhes pour les groupes
- Calcul automatique du montant restant dû

#### 3.4.2 Alertes et relances
- Alertes visuelles pour les réservations dont l'acompte n'est pas reçu 48h avant l'arrivée
- Alertes pour les réservations en attente de confirmation depuis plus de 24h
- Liste des impayés à relancer

### 3.5 Module Services Annexes

#### 3.5.1 Location de vélos
- Gestion du parc de vélos (nombre, type VTT/ville, taille, état)
- Réservation de vélos liée à la réservation chambre
- Tarification horaire ou journalière
- État des locations en cours

#### 3.5.2 Transferts aéroport
- Planification des transferts avec horaire de vol
- Gestion du véhicule et du chauffeur
- Tarification selon nombre de personnes et bagages
- Historique des transferts réalisés

#### 3.5.3 Réservation de guides et activités
- Catalogue des partenaires guides et activités (canyoning, randonnée, visite distilleries)
- Prise de réservation pour le compte du client
- Commission perçue par le gîte
- Suivi des réservations externes

### 3.6 Module Communication Client

#### 3.6.1 Messages automatiques
- Email de confirmation de réservation avec détail du séjour et conditions
- Email de rappel 7 jours avant l'arrivée avec informations pratiques
- Email de remerciement 2 jours après le départ avec demande d'avis
- Email d'annulation avec conditions appliquées

#### 3.6.2 Modèles de messages
- Édition des modèles par la gérante
- Variables dynamiques (nom client, dates, numéro de chambre, montant)
- Aperçu avant envoi

### 3.7 Module Tableau de Bord et Indicateurs

#### 3.7.1 Indicateurs opérationnels
- Taux d'occupation par jour, semaine, mois
- Chiffre d'affaires prévisionnel et réalisé
- Nombre de réservations par canal d'acquisition
- Durée moyenne des séjours
- Taux d'annulation

#### 3.7.2 Indicateurs financiers
- Revenu moyen par chambre disponible (RevPAR)
- Revenu moyen par client
- Évolution des recettes par rapport à l'année précédente
- Détail des revenus par service (hébergement, restauration, annexes)

#### 3.7.3 Rapports périodiques
- Rapport journalier des arrivées et départs
- Rapport mensuel d'activité
- Rapport de trésorerie (encaissements prévus et réalisés)
- Export des données pour l'accountant

---

## 4. PÉRIMÈTRE NON-FONCTIONNEL

### 4.1 Utilisateurs du système
- **Gérante** : accès complet à toutes les fonctionnalités, gestion des utilisateurs
- **Employé d'accueil** : gestion des réservations, enregistrement des paiements, consultation des plannings
- **Comptable externe** : accès en lecture aux données financières et exports

### 4.2 Contraintes d'utilisation
- Utilisation sur poste fixe au bureau d'accueil et sur tablette mobile pour les déplacements
- Fonctionnement en mode déconnecté temporaire en cas de coupure internet (saisie différée)
- Interface en français
- Heures d'utilisation principales : 7h-22h, 7 jours sur 7

### 4.3 Exigences de performance
- Temps de réponse < 2 secondes pour la consultation du calendrier
- Gestion simultanée de 3 utilisateurs connectés
- Capacité à stocker l'historique sur 5 ans
- Sauvegarde automatique quotidienne des données

### 4.4 Exigences de sécurité
- Authentification par identifiant et mot de passe
- Déconnexion automatique après 15 minutes d'inactivité
- Traçabilité de toutes les actions (création, modification, suppression)
- Protection des données personnelles des clients (conformité réglementaire applicable)
- Chiffrement des données sensibles (coordonnées bancaires si stockées)

### 4.5 Exigences de fiabilité
- Disponibilité du système 99% du temps hors maintenance
- Procédure de restauration en cas d'incident < 4 heures
- Tests de validation avant mise en production

---

## 5. CONTRAINTES ET EXIGENCES

### 5.1 Contraintes métier
- Le système doit respecter les conditions de annulation du gîte (affichées sur le site web)
- La gestion des chambres doit refléter la réalité physique (6 chambres maximum)
- Les tarifs doivent être modifiables par la gérante sans intervention technique
- Le système doit gérer les fermetures annuelles (congés de la gérante en septembre)

### 5.2 Contraintes réglementaires
- Conformité avec la réglementation sur la protection des données personnelles
- Possibilité d'export des données clients en cas de demande d'accès
- Conservation des données comptables selon les durées légales
- Gestion des mineurs (informations parents pour les enfants)

### 5.3 Contraintes techniques imposées
- Le système doit fonctionner sur le réseau internet existant (fibre optique)
- Pas d'achat de serveur physique supplémentaire
- Compatibilité avec l'imprimante existante (tickets et factures)
- Possibilité d'envoi d'emails via le fournisseur actuel (OVH)

### 5.4 Exigences de documentation
- Manuel d'utilisation pour la gérante et l'employé (avec copies d'écran)
- Guide de démarrage rapide (1 page) à afficher à l'accueil
- Document de procédure de sauvegarde et restauration
- Document de maintenance pour le futur prestataire informatique

---

## 6. PLANNING ET JALONS

### Phase 1 : Analyse et compréhension (Semaines 1-2)
| Jalon | Date | Livrable |
|-------|------|----------|
| J1 - Installation et rencontre client | S1 | Compte-rendu de première rencontre |
| J2 - Analyse des processus actuels | S1 | Document de description des processus existants |
| J3 - Atelier de recueil des besoins | S2 | Spécifications fonctionnelles détaillées validées |
| J4 - Analyse des données existantes | S2 | Inventaire des données à migrer |

### Phase 2 : Conception et modélisation (Semaines 3-4)
| Jalon | Date | Livrable |
|-------|------|----------|
| J5 - Modélisation des données | S3 | Schéma des données et dictionnaire |
| J6 - Conception des interfaces | S3 | Maquettes des écrans principaux |
| J7 - Conception des traitements | S4 | Description des règles de gestion et algorithmes |
| J8 - Validation technique | S4 | Document de conception validé par le client |

### Phase 3 : Réalisation et développement (Semaines 5-8)
| Jalon | Date | Livrable |
|-------|------|----------|
| J9 - Mise en place de l'architecture | S5 | Environnement de développement et base structurée |
| J10 - Développement modules core | S6-S7 | Modules chambres, réservations, clients fonctionnels |
| J11 - Développement modules annexes | S7-S8 | Services, paiements, communications |
| J12 - Tests unitaires et intégration | S8 | Rapport de tests et corrections |

### Phase 4 : Tests et recette (Semaines 9-10)
| Jalon | Date | Livrable |
|-------|------|----------|
| J13 - Tests utilisateurs | S9 | Scénarios de tests et comptes-rendus |
| J14 - Corrections et ajustements | S9-S10 | Version corrigée et optimisée |
| J15 - Migration des données | S10 | Données historiques intégrées et vérifiées |
| J16 - Recette finale client | S10 | Procès-verbal de recette signé |

### Phase 5 : Déploiement et formation (Semaines 11-12)
| Jalon | Date | Livrable |
|-------|------|----------|
| J17 - Déploiement en production | S11 | Système opérationnel et accessible |
| J18 - Formation des utilisateurs | S11 | Session de formation et supports remis |
| J19 - Documentation finale | S12 | Documentation technique et utilisateur complète |
| J20 - Bilan et transfert | S12 | Compte-rendu de fin de projet et recommandations |

---

## 7. LIVRABLES ATTENDUS

### 7.1 Livrables de gestion de projet
- Compte-rendu hebdomadaire d'avancement (10 documents)
- Plan de projet détaillé avec diagramme de Gantt
- Matrice de responsabilités (RACI)
- Procès-verbal de recette signé par le client

### 7.2 Livrables techniques
- Spécifications fonctionnelles détaillées
- Spécifications techniques (architecture, modèle de données)
- Maquettes et charte graphique des interfaces
- Code source complet et commenté
- Scripts de création de la base de données
- Scripts de migration des données existantes
- Jeux de tests et scénarios de validation
- Rapport de tests et couverture

### 7.3 Livrables de mise en production
- Manuel d'installation et de déploiement
- Manuel d'administration (sauvegardes, restauration, ajout d'utilisateurs)
- Manuel utilisateur (gérante et employé)
- Guide de démarrage rapide
- Fiches de procédures (créer une réservation, modifier un tarif, etc.)

### 7.4 Livrables de formation
- Support de formation (présentation et exercices)
- Enregistrement de la session de formation
- Questionnaire d'évaluation des acquis

---

## 8. CRITÈRES D'ACCEPTATION ET VALIDATION

### 8.1 Critères fonctionnels
- Le système permet de créer une réservation en moins de 3 minutes
- La consultation du calendrier de disponibilité s'affiche en moins de 2 secondes
- Aucune double-réservation n'est possible (test avec 2 utilisateurs simultanés)
- Les emails automatiques sont envoyés dans les 5 minutes suivant l'action
- Les calculs tarifaires sont exacts à 1 euro près (validation sur 50 cas de test)
- L'historique des modifications est complet et consultable

### 8.2 Critères techniques
- Le système est accessible 24h/24 depuis le poste d'accueil et la tablette
- La sauvegarde quotidienne s'exécute sans erreur
- La restauration des données est testée et fonctionnelle
- Les temps de réponse restent inférieurs aux seuils définis avec 3 utilisateurs connectés

### 8.3 Critères utilisateurs
- La gérante peut créer une réservation sans aide après la formation
- L'employé peut enregistrer un paiement et éditer une facture
- Le comptable peut exporter les données mensuelles sans assistance
- La documentation est suffisamment claire pour résoudre les cas courants

---

## 9. GESTION DU PROJET

### 9.1 Méthodologie de travail
Le projet sera mené selon une approche incrémentale avec des livraisons régulières toutes les 2 semaines. Chaque période de 2 semaines comprendra :
- Un point de planification en début de période (1 heure)
- Un développement et des tests continus
- Une démonstration des fonctionnalités réalisées en fin de période (1 heure)
- Une rétrospective et planification de la période suivante (30 minutes)

### 9.2 Communication
- Réunion de lancement : semaine 1 (2 heures)
- Points hebdomadaires : chaque vendredi 16h-17h (1 heure)
- Démonstrations intermédiaires : fin semaines 2, 4, 6, 8, 10 (1 heure)
- Réunion de clôture : semaine 12 (2 heures)
- Communication quotidienne par messagerie instantanée pour les questions urgentes

### 9.3 Gestion des changements
Toute demande de modification du périmètre doit être formalisée par écrit et analysée selon les critères suivants :
- Impact sur le planning
- Impact sur les livrables existants
- Nécessité métier (critique, importante, souhaitable)
- La décision d'intégration ou non est prise conjointement par le client et le stagiaire

---

## 10. CONTACTS ET INTERLOCUTEURS

### 10.1 Côté Client
| Rôle | Nom | Téléphone | Email | Disponibilité |
|------|-----|-----------|-------|---------------|
| **Commanditaire / Gérante** | Mme Sophie VANDROUX | 0262 12 34 56 | contact@lespalmiers-reunion.re | Lundi-Samedi 8h-12h et 14h-18h |
| **Utilisateur principal** | M. Jean-Hugues PAYET | 0692 45 67 89 | jhpayet@email.re | Mercredi-Dimanche 7h-11h et 15h-21h |
| **Comptable** | Mme Chantal DORIS | 0262 98 76 54 | compta.doris@email.re | Sur rendez-vous |
| **Responsable technique** | M. Eric FONTAINE | 0692 11 22 33 | eric.fontaine@tech-reunion.re | Lundi-Vendredi 9h-17h |

### 10.2 Côté École
| Rôle | Nom | Téléphone | Email |
|------|-----|-----------|-------|
| **Tuteur enseignant** | [À compléter] | [À compléter] | [À compléter] |
| **Responsable de formation** | [À compléter] | [À compléter] | [À compléter] |

### 10.3 Côté Stagiaire
| Rôle | Nom | Téléphone | Email |
|------|-----|-----------|-------|
| **Stagiaire M2** | [À compléter] | [À compléter] | [À compléter] |

---

## 11. ANNEXES

### Annexe 1 : Documents fournis par le client
- Tableur actuel des réservations (extrait 2025-2026)
- Modèle d'email de confirmation actuel
- Conditions de vente et d'annulation du gîte
- Plan des chambres et descriptifs
- Tarifs 2026 par saison

### Annexe 2 : Glossaire métier
- **Disponibilité** : Période où une chambre est libre et peut être réservée
- **Acompte** : Somme versée à la réservation pour garantir la location (30% du montant total)
- **No-show** : Client qui ne se présente pas sans avoir annulé
- **Overbooking** : Situation où le nombre de réservations dépasse la capacité réelle
- **RevPAR** : Revenu par chambre disponible (indicateur de performance)
- **PMR** : Personne à Mobilité Réduite

### Annexe 3 : Règles de gestion prioritaires
- RG1 : Une chambre ne peut avoir deux réservations actives sur la même période
- RG2 : Le tarif appliqué est celui en vigueur au moment de la réservation
- RG3 : L'acompte doit être perçu sous 48h pour confirmer la réservation
- RG4 : Les enfants de moins de 2 ans sont hébergés gratuitement (sans lit)
- RG5 : Les annulations gratuites sont acceptées jusqu'à 7 jours avant l'arrivée
- RG6 : Les emails automatiques utilisent les modèles validés par la gérante
- RG7 : Toute modification de tarif est historisée avec date et auteur

### Annexe 4 : Planning type du gîte
- Ouverture : 7h00 (petit-déjeuner)
- Accueil réservations : 8h00-12h00 et 14h00-19h00
- Dépôt bagages possible : à partir de 11h00
- Chambres disponibles : 15h00
- Départ des chambres : 11h00 maximum
- Fermeture annuelle : 15 septembre - 30 septembre

---

**Document validé et approuvé par les parties :**

| | Nom | Signature | Date |
|---|-----|-----------|------|
| **Client** | Mme Sophie VANDROUX | | |
| **Stagiaire** | | | |
| **Tuteur école** | | | |

*Document confidentiel - Propriété de Les Palmiers de l'Entre-Deux*
