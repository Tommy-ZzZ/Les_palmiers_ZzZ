// backend/src/models/Reservation.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum StatutReservation {
  EN_ATTENTE_ACOMPTE = 'EN_ATTENTE_ACOMPTE',
  CONFIRMEE = 'CONFIRMEE',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE',
  NO_SHOW = 'NO_SHOW'
}

export enum StatutPaiement {
  ACOMPTE_EN_ATTENTE = 'ACOMPTE_EN_ATTENTE',
  ACOMPTE_RECU = 'ACOMPTE_RECU',
  SOLDE_PARTIEL = 'SOLDE_PARTIEL',
  SOLDE_COMPLET = 'SOLDE_COMPLET'
}

export interface ReservationAttributes {
  id: number;
  numero: string;
  clientId: number;
  chambreId: number;
  tarifId?: number;
  codePromoId?: number;
  dateCreation: Date;
  dateArrivee: Date;
  dateDepart: Date;
  nbAdultes: number;
  nbEnfants: number;
  agesEnfants?: string;
  demandesSpeciales?: string;
  horaireArriveeTardive?: string;
  litBebe: boolean;
  petitDejeunerInclus: boolean;
  montantTotal: number;
  montantAcompte: number;
  montantSolde: number;
  montantPenalite: number;
  statut: StatutReservation;
  statutPaiement: StatutPaiement;
  creePar?: number;
  dateModification?: Date;
  notesInternes?: string;
  motifAnnulation?: string;
  nbVelos?: number;
  groupe?: boolean;
  canalAcquisition?: string;
  typeAcompte: number;
  // ✅ CHAMP VIRTUEL - OPTIONNEL (non stocké en base)
  montantRestantDu?: number;
}

export interface ReservationCreationAttributes extends Optional<ReservationAttributes, 'id' | 'numero' | 'dateCreation' | 'montantPenalite' | 'dateModification' | 'typeAcompte'> {}

export class Reservation extends Model<ReservationAttributes, ReservationCreationAttributes> implements ReservationAttributes {
  public id!: number;
  public numero!: string;
  public clientId!: number;
  public chambreId!: number;
  public tarifId?: number;
  public codePromoId?: number;
  public dateCreation!: Date;
  public dateArrivee!: Date;
  public dateDepart!: Date;
  public nbAdultes!: number;
  public nbEnfants!: number;
  public agesEnfants?: string;
  public demandesSpeciales?: string;
  public horaireArriveeTardive?: string;
  public litBebe!: boolean;
  public petitDejeunerInclus!: boolean;
  public montantTotal!: number;
  public montantAcompte!: number;
  public montantSolde!: number;
  public montantPenalite!: number;
  public statut!: StatutReservation;
  public statutPaiement!: StatutPaiement;
  public creePar?: number;
  public dateModification?: Date;
  public notesInternes?: string;
  public motifAnnulation?: string;
  public nbVelos?: number;
  public groupe?: boolean;
  public canalAcquisition?: string;
  public typeAcompte!: number;
  public montantRestantDu?: number;

  // ✅ Getter pour la valeur virtuelle
  public getMontantRestantDu(): number {
    const total = Number(this.montantTotal) || 0;
    const acompte = Number(this.montantAcompte) || 0;
    return Math.round((total - acompte) * 100) / 100;
  }
}

Reservation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    numero: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'client_id'
    },
    chambreId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'chambre_id'
    },
    tarifId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'tarif_id'
    },
    codePromoId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'code_promo_id'
    },
    dateCreation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'date_creation'
    },
    dateArrivee: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'date_arrivee'
    },
    dateDepart: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'date_depart'
    },
    nbAdultes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'nb_adultes'
    },
    nbEnfants: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'nb_enfants'
    },
    agesEnfants: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'ages_enfants'
    },
    demandesSpeciales: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'demandes_speciales'
    },
    horaireArriveeTardive: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'horaire_arrivee_tardive'
    },
    litBebe: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'lit_bebe'
    },
    petitDejeunerInclus: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'petit_dejeuner_inclus'
    },
    montantTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'montant_total'
    },
    montantAcompte: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'montant_acompte'
    },
    montantSolde: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'montant_solde'
    },
    montantPenalite: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'montant_penalite'
    },
    statut: {
      type: DataTypes.ENUM(...Object.values(StatutReservation)),
      allowNull: false,
      defaultValue: StatutReservation.EN_ATTENTE_ACOMPTE
    },
    statutPaiement: {
      type: DataTypes.ENUM(...Object.values(StatutPaiement)),
      allowNull: false,
      defaultValue: StatutPaiement.ACOMPTE_EN_ATTENTE,
      field: 'statut_paiement'
    },
    creePar: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'cree_par'
    },
    dateModification: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'date_modification'
    },
    notesInternes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'notes_internes'
    },
    motifAnnulation: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'motif_annulation'
    },
    nbVelos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'nb_velos'
    },
    groupe: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'groupe'
    },
    canalAcquisition: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'canal_acquisition'
    },
    typeAcompte: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      field: 'type_acompte',
      comment: 'Pourcentage d\'acompte choisi par le client (30, 50, 100)'
    }
  },
  {
    sequelize,
    tableName: 'reservations',
    timestamps: true,
    createdAt: 'dateCreation',
    updatedAt: false
  }
);

export default Reservation;