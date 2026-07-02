import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum SensTransfert {
  AEROPORT_VERS_GITE = 'AEROPORT_VERS_GITE',
  GITE_VERS_AEROPORT = 'GITE_VERS_AEROPORT'
}

export enum StatutTransfert {
  PLANIFIE = 'PLANIFIE',
  REALISE = 'REALISE',
  ANNULE = 'ANNULE'
}

export interface TransferAttributes {
  id: number;
  reservationId?: number;
  dateHeure: Date;
  sens: SensTransfert;
  numeroVol?: string;
  nbPersonnes: number;
  nbBagages: number;
  montant: number;
  statut: StatutTransfert;
  notes?: string;
}

export interface TransferCreationAttributes extends Optional<TransferAttributes, 'id'> {}

export class Transfer extends Model<TransferAttributes, TransferCreationAttributes> implements TransferAttributes {
  public id!: number;
  public reservationId?: number;
  public dateHeure!: Date;
  public sens!: SensTransfert;
  public numeroVol?: string;
  public nbPersonnes!: number;
  public nbBagages!: number;
  public montant!: number;
  public statut!: StatutTransfert;
  public notes?: string;
}

Transfer.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'reservation_id'
    },
    dateHeure: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'date_heure'
    },
    sens: {
      type: DataTypes.ENUM(...Object.values(SensTransfert)),
      allowNull: false
    },
    numeroVol: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'numero_vol'
    },
    nbPersonnes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'nb_personnes'
    },
    nbBagages: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'nb_bagages'
    },
    montant: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    statut: {
      type: DataTypes.ENUM(...Object.values(StatutTransfert)),
      allowNull: false,
      defaultValue: StatutTransfert.PLANIFIE
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'transferts',
    timestamps: false
  }
);

export default Transfer;