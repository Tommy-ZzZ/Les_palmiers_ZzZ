// backend/src/models/MessageEmail.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// ─── ATTRIBUTS ───
interface MessageEmailAttributes {
  id: number;
  type: string;
  destinataire: string;
  clientId: number;
  reservationId?: number;
  sujet: string;
  corps: string;
  dateEnvoi: Date;
  statut: string;
  erreurMessage?: string;
  messageId?: number;
  ouvertLe?: Date;
}

interface MessageEmailCreationAttributes extends Optional<MessageEmailAttributes, 'id'> {}

// ─── MODÈLE ───
export class MessageEmail extends Model<MessageEmailAttributes, MessageEmailCreationAttributes> {
  declare id: number;
  declare type: string;
  declare destinataire: string;
  declare clientId: number;
  declare reservationId?: number;
  declare sujet: string;
  declare corps: string;
  declare dateEnvoi: Date;
  declare statut: string;
  declare erreurMessage?: string;
  declare messageId?: number;
  declare ouvertLe?: Date;
}

// ─── INITIALISATION ───
MessageEmail.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('CONFIRMATION', 'RAPPEL_J7', 'REMERCIEMENT_J2', 'ANNULATION', 'RELANCE_PAIEMENT', 'MANUEL'),
      allowNull: false,
    },
    destinataire: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: { msg: 'Email invalide' },
      },
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clients',
        key: 'id',
      },
    },
    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'reservations',
        key: 'id',
      },
    },
    sujet: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    corps: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    dateEnvoi: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    statut: {
      type: DataTypes.ENUM('ENVOYE', 'OUVERT', 'EN_ATTENTE', 'ECHEC'),
      allowNull: false,
      defaultValue: 'EN_ATTENTE',
    },
    erreurMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    messageId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id',
      },
    },
    ouvertLe: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'messages_emails',
    timestamps: false,
    indexes: [
      { fields: ['clientId'] },
      { fields: ['reservationId'] },
      { fields: ['statut'] },
      { fields: ['dateEnvoi'] },
    ],
  }
);

export default MessageEmail;