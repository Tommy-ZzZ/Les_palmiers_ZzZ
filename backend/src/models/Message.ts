// backend/src/models/Message.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// ─── ATTRIBUTS ───
interface MessageAttributes {
  id: number;
  nom: string;
  type: string;
  sujet: string;
  corps: string;
  variables: string[];
  dateModification: Date;
  valide: boolean;
  validePar?: number;
  creePar?: number;
  dateCreation?: Date;
}

interface MessageCreationAttributes extends Optional<MessageAttributes, 'id'> {}

// ─── MODÈLE ───
export class Message extends Model<MessageAttributes, MessageCreationAttributes> {
  declare id: number;
  declare nom: string;
  declare type: string;
  declare sujet: string;
  declare corps: string;
  declare variables: string[];
  declare dateModification: Date;
  declare valide: boolean;
  declare validePar?: number;
  declare creePar?: number;
  declare dateCreation: Date;
}

// ─── INITIALISATION ───
Message.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Le nom du modèle est requis' },
        len: { args: [2, 100], msg: 'Le nom doit contenir entre 2 et 100 caractères' },
      },
    },
    type: {
      // ✅ CORRECTION : ajout de 'MANUEL', utilisé par défaut lors de la création
      // d'un nouveau modèle depuis la page Communication (handleCreateModele).
      // Sans cette valeur, Postgres rejetait l'insertion (enum invalide) et
      // le bouton "Créer un modèle" échouait systématiquement.
      type: DataTypes.ENUM('CONFIRMATION', 'RAPPEL_J7', 'REMERCIEMENT_J2', 'ANNULATION', 'RELANCE_PAIEMENT', 'MANUEL'),
      allowNull: false,
    },
    sujet: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Le sujet est requis' },
      },
    },
    corps: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Le corps du message est requis' },
      },
    },
    variables: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    dateModification: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    valide: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    validePar: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'utilisateurs',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    creePar: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'utilisateurs',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    dateCreation: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'messages',
    timestamps: false,
    indexes: [
      { fields: ['type'] },
      { fields: ['valide'] },
      { fields: ['dateModification'] },
    ],
  }
);

export default Message;