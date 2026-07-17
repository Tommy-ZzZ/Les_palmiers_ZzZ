// backend/src/models/Bike.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum TypeVelo {
  VTT = 'VTT',
  VILLE = 'VILLE',
  ELECTRIQUE = 'ELECTRIQUE'  // ✅ AJOUT
}

export enum EtatMateriel {
  BON = 'BON',
  USAGE = 'USAGE',
  EN_REPARATION = 'EN_REPARATION',
  HORS_SERVICE = 'HORS_SERVICE'
}

export interface BikeAttributes {
  id: number;
  numero: string;              // ✅ AJOUT - numéro d'identification
  type: TypeVelo;
  taille?: string;
  etat: EtatMateriel;
  prix: number;                // ✅ AJOUT - prix par jour
  numeroSerie?: string;
  disponible: boolean;         // ✅ AJOUT - disponibilité
  created_at: Date;
  updated_at?: Date;
}

export interface BikeCreationAttributes extends Optional<BikeAttributes, 'id' | 'numero' | 'prix' | 'disponible' | 'created_at' | 'updated_at'> {}

export class Bike extends Model<BikeAttributes, BikeCreationAttributes> implements BikeAttributes {
  public id!: number;
  public numero!: string;
  public type!: TypeVelo;
  public taille?: string;
  public etat!: EtatMateriel;
  public prix!: number;
  public numeroSerie?: string;
  public disponible!: boolean;
  public created_at!: Date;
  public updated_at?: Date;
}

Bike.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    numero: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      defaultValue: () => `V${String(Math.floor(1000 + Math.random() * 9000))}`
    },
    type: {
      type: DataTypes.ENUM(...Object.values(TypeVelo)),
      allowNull: false,
      defaultValue: TypeVelo.VILLE
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
    prix: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 15,
      validate: {
        min: 0
      }
    },
    numeroSerie: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      field: 'numero_serie'
    },
    disponible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    tableName: 'velos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default Bike;