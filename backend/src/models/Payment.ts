import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum TypePaiement {
  ACOMPTE = 'ACOMPTE',
  SOLDE = 'SOLDE',
  ARRHES = 'ARRHES'
}

export enum ModePaiement {
  ESPECES = 'ESPECES',
  CARTE = 'CARTE',
  VIREMENT = 'VIREMENT',
  CHEQUE = 'CHEQUE'
}

export interface PaymentAttributes {
  id: number;
  reservationId: number;
  montant: number;
  datePaiement: Date;
  typePaiement: TypePaiement;
  modePaiement: ModePaiement;
  reference?: string;
  enregistrePar?: number;
  notes?: string;
}

export interface PaymentCreationAttributes extends Optional<PaymentAttributes, 'id' | 'datePaiement'> {}

export class Payment extends Model<PaymentAttributes, PaymentCreationAttributes> implements PaymentAttributes {
  public id!: number;
  public reservationId!: number;
  public montant!: number;
  public datePaiement!: Date;
  public typePaiement!: TypePaiement;
  public modePaiement!: ModePaiement;
  public reference?: string;
  public enregistrePar?: number;
  public notes?: string;
}

Payment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'reservation_id'
    },
    montant: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01
      }
    },
    datePaiement: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'date_paiement'
    },
    typePaiement: {
      type: DataTypes.ENUM(...Object.values(TypePaiement)),
      allowNull: false,
      field: 'type_paiement'
    },
    modePaiement: {
      type: DataTypes.ENUM(...Object.values(ModePaiement)),
      allowNull: false,
      field: 'mode_paiement'
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    enregistrePar: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'enregistre_par'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'paiements',
    timestamps: false
  }
);

export default Payment;