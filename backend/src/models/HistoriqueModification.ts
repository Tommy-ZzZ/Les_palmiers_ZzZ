// backend/src/models/HistoriqueModification.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// ─── ATTRIBUTS ───
interface HistoriqueModificationAttributes {
  id: number;
  entite: string;
  idEntite: number;
  action: string;
  ancienneValeur: string;
  nouvelleValeur?: string;
  modifiePar: number;
  dateHeure: Date;
}

interface HistoriqueModificationCreationAttributes
  extends Optional<HistoriqueModificationAttributes, 'id'> {}

// ─── MODÈLE ───
export class HistoriqueModification
  extends Model<
    HistoriqueModificationAttributes,
    HistoriqueModificationCreationAttributes
  >
  implements HistoriqueModificationAttributes
{
  public id!: number;
  public entite!: string;
  public idEntite!: number;
  public action!: string;
  public ancienneValeur!: string;
  public nouvelleValeur?: string;
  public modifiePar!: number;
  public dateHeure!: Date;
}

// ─── INITIALISATION ───
HistoriqueModification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    entite: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    idEntite: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    ancienneValeur: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    nouvelleValeur: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    modifiePar: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'utilisateurs',
        key: 'id',
      },
    },
    dateHeure: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'historique_modifications',
    timestamps: false,
    indexes: [
      { fields: ['entite', 'idEntite'] },
      { fields: ['dateHeure'] },
      { fields: ['action'] },
    ],
  }
);

export default HistoriqueModification;