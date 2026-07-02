import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum TypeActivite {
  CANYONING = 'CANYONING',
  RANDONNEE = 'RANDONNEE',
  VISITE_DISTILLERIE = 'VISITE_DISTILLERIE',
  AUTRE = 'AUTRE'
}

export interface ActivityAttributes {
  id: number;
  partenaireId?: number;
  nom: string;
  description?: string;
  typeActivite: TypeActivite;
  prixClient: number;
  commissionGite: number;
  actif: boolean;
}

export interface ActivityCreationAttributes extends Optional<ActivityAttributes, 'id' | 'actif'> {}

export class Activity extends Model<ActivityAttributes, ActivityCreationAttributes> implements ActivityAttributes {
  public id!: number;
  public partenaireId?: number;
  public nom!: string;
  public description?: string;
  public typeActivite!: TypeActivite;
  public prixClient!: number;
  public commissionGite!: number;
  public actif!: boolean;
}

Activity.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    partenaireId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'partenaire_id'
    },
    nom: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    typeActivite: {
      type: DataTypes.ENUM(...Object.values(TypeActivite)),
      allowNull: false,
      defaultValue: TypeActivite.AUTRE,
      field: 'type_activite'
    },
    prixClient: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'prix_client'
    },
    commissionGite: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'commission_gite'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'activites',
    timestamps: false
  }
);

export default Activity;