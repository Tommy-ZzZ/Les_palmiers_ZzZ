import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface InvoiceAttributes {
  id: number;
  numero: string;
  reservationId: number;
  dateEmission: Date;
  montantHt: number;
  tauxTva: number;
  montantTva: number;
  montantTtc: number;
  mentionTva: string;
  editePar?: number;
  created_at: Date;
}

export interface InvoiceCreationAttributes extends Optional<InvoiceAttributes, 'id' | 'tauxTva' | 'montantTva' | 'mentionTva' | 'created_at'> {}

export class Invoice extends Model<InvoiceAttributes, InvoiceCreationAttributes> implements InvoiceAttributes {
  public id!: number;
  public numero!: string;
  public reservationId!: number;
  public dateEmission!: Date;
  public montantHt!: number;
  public tauxTva!: number;
  public montantTva!: number;
  public montantTtc!: number;
  public mentionTva!: string;
  public editePar?: number;
  public created_at!: Date;
}

Invoice.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    numero: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true
    },
    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'reservation_id'
    },
    dateEmission: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
      field: 'date_emission'
    },
    montantHt: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'montant_ht'
    },
    tauxTva: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'taux_tva'
    },
    montantTva: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'montant_tva'
    },
    montantTtc: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'montant_ttc'
    },
    mentionTva: {
      type: DataTypes.TEXT,
      defaultValue: 'TVA non applicable - art. 293 B du CGI',
      field: 'mention_tva'
    },
    editePar: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'edite_par'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  },
  {
    sequelize,
    tableName: 'factures',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);

export default Invoice;