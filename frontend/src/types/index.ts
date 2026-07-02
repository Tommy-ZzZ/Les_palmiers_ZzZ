// frontend/src/types/index.ts
export type RoleUtilisateur = 'GERANTE' | 'EMPLOYE_ACCUEIL' | 'COMPTABLE' | 'RESPONSABLE_TECHNIQUE';
export type VueChambre = 'JARDIN' | 'PISCINE' | 'MONTAGNE';
export type StatutChambre = 'DISPONIBLE' | 'OCCUPEE' | 'EN_MAINTENANCE' | 'HORS_SERVICE' | 'BLOQUEE';
export type Saison = 'BASSE' | 'MOYENNE' | 'HAUTE';
export type SegmentClient = 'TOURISTE_INDIVIDUEL' | 'COUPLE' | 'FAMILLE' | 'GROUPE' | 'VOYAGEUR_AFFAIRES';
export type OrigineGeo = 'METROPOLE' | 'ILE_MAURICE' | 'MADAGASCAR' | 'EUROPE' | 'AUTRES_DOM_TOM' | 'AUTRE';
export type CanalAcquisition = 'DIRECT' | 'SITE_WEB' | 'BOOKING' | 'AGENCE_LOCALE' | 'BOUCHE_A_OREILLE';
export type StatutClient = 'NOUVEAU' | 'REGULIER' | 'VIP';
export type StatutReservation = 'EN_ATTENTE_ACOMPTE' | 'CONFIRMEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE' | 'NO_SHOW';
export type StatutPaiement = 'ACOMPTE_EN_ATTENTE' | 'ACOMPTE_RECU' | 'SOLDE_PARTIEL' | 'SOLDE_COMPLET';
export type ModePenalite = 'GRATUITE' | 'CINQUANTE_POURCENT' | 'CENT_POURCENT';
export type TypePaiement = 'ACOMPTE' | 'SOLDE' | 'ARRHES';
export type ModePaiement = 'ESPECES' | 'CARTE' | 'VIREMENT' | 'CHEQUE';
export type TypeEmail = 'CONFIRMATION' | 'RAPPEL_J_MOINS_7' | 'REMERCIEMENT_J_PLUS_2' | 'ANNULATION' | 'RELANCE_IMPAYE';
export type TypeVelo = 'VTT' | 'VILLE';
export type EtatMateriel = 'BON' | 'USAGE' | 'EN_REPARATION' | 'HORS_SERVICE';
export type SensTransfert = 'AEROPORT_VERS_GITE' | 'GITE_VERS_AEROPORT';

// ============================================
// COMMUNICATION - Types conformes au CDC §3.6
// ============================================

export type TypeMessage =
  | 'CONFIRMATION'
  | 'RAPPEL_J7'
  | 'REMERCIEMENT_J2'
  | 'ANNULATION'
  | 'RELANCE_PAIEMENT'
  | 'RELANCE_ACOMPTE'
  | 'RELANCE_IMPAYE'
  | 'PROMOTION'
  | 'PERSONNALISE'
  | 'MANUEL';
export type StatutEnvoi = 'ENVOYE' | 'OUVERT' | 'EN_ATTENTE' | 'ECHEC' | 'ANNULE';

export interface ModeleMessage {
  id: number;
  nom: string;
  type: TypeMessage;
  sujet: string;
  corps: string;
  variables: string[];
  dateModification: Date;
  valide: boolean;
  validePar?: number | null;
  creePar?: number | null;
  dateCreation?: Date;
}

export interface MessageEmail {
  id: number;
  type: TypeMessage;
  destinataire: string;
  clientId: number;
  reservationId?: number;
  sujet: string;
  corps: string;
  dateEnvoi: Date;
  statut: StatutEnvoi;
  erreurMessage?: string;
  messageId?: number;
  ouvertLe?: Date;
  modele?: ModeleMessage;
}

export interface CommunicationStats {
  totalEnvoyes: number;
  enAttente: number;
  echecs: number;
  ouverts: number;
  tauxOuverture: number;
  parType: Record<TypeMessage, number>;
}

export interface ContactClient {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  nbSejours: number;
  dernierContact: Date;
  statut: StatutClient;
  montantTotal: number;
  canalAcquisition: CanalAcquisition;
  segment: SegmentClient;
  preferences?: {
    chambrePreferee?: string;
    allergies?: string[];
    regimeAlimentaire?: string;
  };
}

// ============================================
// INTERFACES EXISTANTES
// ============================================

export interface Utilisateur {
  id: number;
  login: string;
  nom: string;
  prenom: string;
  email: string;
  role: RoleUtilisateur;
  actif: boolean;
  derniere_connexion?: Date;
}

export type User = Utilisateur;

export interface Chambre {
  id: number;
  numero: string;
  nom: string;
  capacite_adultes: number;
  capacite_enfants: number;
  nb_lits_simples: number;
  nb_lits_doubles: number;
  nb_lits_bebe: number;
  surface_m2?: number;
  vue: VueChambre;
  accessible_pmr: boolean;
  statut: StatutChambre;
  description?: string;
  equipements?: string[];
  tarifs?: Tarif[];
}

export interface Tarif {
  id: number;
  chambre_id: number;
  saison: Saison;
  prix_base: number;
  prix_petit_dejeuner: number;
  prix_lit_supplementaire: number;
  prix_enfant: number;
  coeff_weekend: number;
  coeff_degressif_5nuits: number;
  date_application: Date;
  date_fin?: Date;
}

export interface Client {
  id: number;
  civilite?: string;
  nom: string;
  prenom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  pays: string;
  segment: SegmentClient;
  origine_geo: OrigineGeo;
  canal_acquisition: CanalAcquisition;
  statut: StatutClient;
  est_groupe: boolean;
  nb_sejours_realises: number;
  montant_total_paye: number;
  date_creation: Date;
}

export interface Reservation {
  id: number;
  numero: string;
  client_id: number;
  chambre_id: number;
  tarif_id?: number;
  code_promo_id?: number;
  date_creation: Date;
  date_arrivee: Date;
  date_depart: Date;
  nb_adultes: number;
  nb_enfants: number;
  ages_enfants?: string;
  demandes_speciales?: string;
  horaire_arrivee_tardive?: string;
  lit_bebe: boolean;
  petit_dejeuner_inclus: boolean;
  montant_total: number;
  montant_acompte: number;
  montant_solde: number;
  montant_penalite: number;
  statut: StatutReservation;
  statut_paiement: StatutPaiement;
  cree_par?: number;
  notes_internes?: string;
  client?: Client;
  chambre?: Chambre;
}

export interface Paiement {
  id: number;
  reservation_id: number;
  montant: number;
  date_paiement: Date;
  type_paiement: TypePaiement;
  mode_paiement: ModePaiement;
  reference?: string;
  enregistre_par?: number;
  notes?: string;
}

export interface CalculTarifOptions {
  chambreId: number;
  dateArrivee: Date;
  dateDepart: Date;
  nbAdultes: number;
  nbEnfants: number;
  agesEnfants?: number[];
  petitDejeunerInclus: boolean;
  litSupplementaire?: boolean;
  codePromo?: string;
}

export interface ResultatCalculTarif {
  nbNuits: number;
  prixBaseTotal: number;
  prixPetitDejeunerTotal: number;
  prixLitSupplementaire: number;
  prixEnfants: number;
  reductionWeekend: number;
  reductionDegressif: number;
  reductionCodePromo: number;
  montantTotal: number;
  montantAcompte: number;
  detail: string[];
  tarif: Tarif;
  saison: Saison;
}

export interface JwtPayload {
  id: number;
  login: string;
  role: RoleUtilisateur;
  nom: string;
  prenom: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
