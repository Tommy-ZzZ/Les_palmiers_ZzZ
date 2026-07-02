import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum ModePenalite {
  GRATUITE = 'GRATUITE',
  CINQUANTE_POURCENT = 'CINQUANTE_POURCENT',
  CENT_POURCENT = 'CENT_POURCENT'
}

export interface CancellationAttributes {
  id: number;
  reservationId: number;
  dateAnnulation: Date;
  motif: string;
  penaliteAppliquee: number;
  modePenalite: ModePenalite;
  annulePar?: number;
}

export interface CancellationCreationAttributes extends Optional<CancellationAttributes, 'id' | 'dateAnnulation'> {}

export class Cancellation extends Model<CancellationAttributes, CancellationCreationAttributes> implements CancellationAttributes {
  public id!: number;
  public reservationId!: number;
  public dateAnnulation!: Date;
  public motif!: string;
  public penaliteAppliquee!: number;
  public modePenalite!: ModePenalite;
  public annulePar?: number;
}

Cancellation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'reservation_id'
    },
    dateAnnulation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'date_annulation'
    },
    motif: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    penaliteAppliquee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'penalite_appliquee'
    },
    modePenalite: {
      type: DataTypes.ENUM(...Object.values(ModePenalite)),
      allowNull: false,
      defaultValue: ModePenalite.GRATUITE,
      field: 'mode_penalite'
    },
    annulePar: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'annule_par'
    }
  },
  {
    sequelize,
    tableName: 'annulations',
    timestamps: false
  }
);

export default Cancellation;
