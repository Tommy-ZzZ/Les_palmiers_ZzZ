import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum StatutReservationActivity {
  EN_ATTENTE_ACOMPTE = 'EN_ATTENTE_ACOMPTE',
  CONFIRMEE = 'CONFIRMEE',
  ANNULEE = 'ANNULEE',
  TERMINEE = 'TERMINEE'
}

export interface ReservationActivityAttributes {
  id: number;
  reservationId: number;
  activiteId: number;
  dateActivite: Date;
  nbParticipants: number;
  montantPaye: number;
  commissionPercue: number;
  statut: StatutReservationActivity;
}

export interface ReservationActivityCreationAttributes extends Optional<ReservationActivityAttributes, 'id' | 'commissionPercue' | 'statut'> {}

export class ReservationActivity extends Model<ReservationActivityAttributes, ReservationActivityCreationAttributes> implements ReservationActivityAttributes {
  public id!: number;
  public reservationId!: number;
  public activiteId!: number;
  public dateActivite!: Date;
  public nbParticipants!: number;
  public montantPaye!: number;
  public commissionPercue!: number;
  public statut!: StatutReservationActivity;
}

ReservationActivity.init(
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
    activiteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'activite_id'
    },
    dateActivite: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'date_activite'
    },
    nbParticipants: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'nb_participants'
    },
    montantPaye: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'montant_paye'
    },
    commissionPercue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'commission_percue'
    },
    statut: {
      type: DataTypes.ENUM(...Object.values(StatutReservationActivity)),
      allowNull: false,
      defaultValue: StatutReservationActivity.CONFIRMEE
    }
  },
  {
    sequelize,
    tableName: 'reservations_activites',
    timestamps: false
  }
);

export default ReservationActivity;