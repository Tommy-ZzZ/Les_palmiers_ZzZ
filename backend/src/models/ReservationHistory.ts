import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ReservationHistoryAttributes {
  id: number;
  reservationId: number;
  action: string;
  ancienneValeur?: any;
  nouvelleValeur?: any;
  dateAction: Date;
  utilisateurId?: number;
}

export interface ReservationHistoryCreationAttributes extends Optional<ReservationHistoryAttributes, 'id' | 'dateAction'> {}

export class ReservationHistory extends Model<ReservationHistoryAttributes, ReservationHistoryCreationAttributes> implements ReservationHistoryAttributes {
  public id!: number;
  public reservationId!: number;
  public action!: string;
  public ancienneValeur?: any;
  public nouvelleValeur?: any;
  public dateAction!: Date;
  public utilisateurId?: number;
}

ReservationHistory.init(
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
    action: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    ancienneValeur: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'ancienne_valeur'
    },
    nouvelleValeur: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'nouvelle_valeur'
    },
    dateAction: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'date_action'
    },
    utilisateurId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'utilisateur_id'
    }
  },
  {
    sequelize,
    tableName: 'historique_reservations',
    timestamps: false
  }
);

export default ReservationHistory;