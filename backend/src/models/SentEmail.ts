import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum StatutEmail {
  ENVOYE = 'ENVOYE',
  ECHEC = 'ECHEC',
  EN_ATTENTE = 'EN_ATTENTE'
}

export interface SentEmailAttributes {
  id: number;
  reservationId?: number;
  modeleId?: number;
  destinataire: string;
  sujet: string;
  contenu: string;
  dateEnvoi: Date;
  statut: StatutEmail;
  erreur?: string;
}

export interface SentEmailCreationAttributes extends Optional<SentEmailAttributes, 'id' | 'dateEnvoi'> {}

export class SentEmail extends Model<SentEmailAttributes, SentEmailCreationAttributes> implements SentEmailAttributes {
  public id!: number;
  public reservationId?: number;
  public modeleId?: number;
  public destinataire!: string;
  public sujet!: string;
  public contenu!: string;
  public dateEnvoi!: Date;
  public statut!: StatutEmail;
  public erreur?: string;
}

SentEmail.init(
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
    modeleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'modele_id'
    },
    destinataire: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    sujet: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    contenu: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    dateEnvoi: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'date_envoi'
    },
    statut: {
      type: DataTypes.ENUM(...Object.values(StatutEmail)),
      allowNull: false,
      defaultValue: StatutEmail.EN_ATTENTE
    },
    erreur: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'emails_envoyes',
    timestamps: false
  }
);

export default SentEmail;