import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum TypeVelo {
  VTT = 'VTT',
  VILLE = 'VILLE'
}

export enum EtatMateriel {
  BON = 'BON',
  USAGE = 'USAGE',
  EN_REPARATION = 'EN_REPARATION',
  HORS_SERVICE = 'HORS_SERVICE'
}

export interface BikeAttributes {
  id: number;
  type: TypeVelo;
  taille?: string;
  etat: EtatMateriel;
  numeroSerie?: string;
  created_at: Date;
}

export interface BikeCreationAttributes extends Optional<BikeAttributes, 'id' | 'created_at'> {}

export class Bike extends Model<BikeAttributes, BikeCreationAttributes> implements BikeAttributes {
  public id!: number;
  public type!: TypeVelo;
  public taille?: string;
  public etat!: EtatMateriel;
  public numeroSerie?: string;
  public created_at!: Date;
}

Bike.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM(...Object.values(TypeVelo)),
      allowNull: false
    },
    taille: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    etat: {
      type: DataTypes.ENUM(...Object.values(EtatMateriel)),
      allowNull: false,
      defaultValue: EtatMateriel.BON
    },
    numeroSerie: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      field: 'numero_serie'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  },
  {
    sequelize,
    tableName: 'velos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);

export default Bike;