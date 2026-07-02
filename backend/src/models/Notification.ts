// backend/src/models/Notification.ts
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export type TypeNotification =
  | 'ACOMPTE_MANQUANT'
  | 'CONFIRMATION_ATTENTE'
  | 'IMPAYE'
  | 'ARRIVEE_JOUR'
  | 'CHECKIN_RETARDE';

export type GraviteNotification = 'info' | 'success' | 'warning' | 'error';

interface NotificationAttributes {
  id: number;
  type: TypeNotification;
  titre: string;
  message: string;
  gravite: GraviteNotification;
  lu: boolean;
  reservationId: number | null;
  clientId: number | null;
  cleUnique: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type NotificationCreationAttributes = Optional<
  NotificationAttributes,
  'id' | 'lu' | 'reservationId' | 'clientId' | 'createdAt' | 'updatedAt'
>;

class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  public id!: number;
  public type!: TypeNotification;
  public titre!: string;
  public message!: string;
  public gravite!: GraviteNotification;
  public lu!: boolean;
  public reservationId!: number | null;
  public clientId!: number | null;
  public cleUnique!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// ✅ Fonction d'initialisation différée
export function initNotification(sequelize: Sequelize): typeof Notification {
  Notification.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      type: {
        type: DataTypes.ENUM(
          'ACOMPTE_MANQUANT',
          'CONFIRMATION_ATTENTE',
          'IMPAYE',
          'ARRIVEE_JOUR',
          'CHECKIN_RETARDE'
        ),
        allowNull: false,
      },
      titre: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      message: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      gravite: {
        type: DataTypes.ENUM('info', 'success', 'warning', 'error'),
        allowNull: false,
        defaultValue: 'info',
      },
      lu: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      reservationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      clientId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      cleUnique: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
    },
    {
      sequelize,
      tableName: 'notifications',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Notification;
}


export default Notification;