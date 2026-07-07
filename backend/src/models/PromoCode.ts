// backend/src/models/PromoCode.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface PromoCodeAttributes {
  id: number;
  code: string;
  description?: string;
  tauxReduction: number;
  reductionFixe?: number;
  dateDebut: Date;
  dateFin: Date;
  actif: boolean;
  nbUtilisationsMax?: number;
  nbUtilisations: number;
  created_at: Date;
}

export interface PromoCodeCreationAttributes extends Optional<PromoCodeAttributes, 'id' | 'description' | 'reductionFixe' | 'actif' | 'nbUtilisations' | 'created_at'> {}

export class PromoCode extends Model<PromoCodeAttributes, PromoCodeCreationAttributes> implements PromoCodeAttributes {
  public id!: number;
  public code!: string;
  public description?: string;
  public tauxReduction!: number;
  public reductionFixe?: number;
  public dateDebut!: Date;
  public dateFin!: Date;
  public actif!: boolean;
  public nbUtilisationsMax?: number;
  public nbUtilisations!: number;
  public created_at!: Date;
}

PromoCode.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    tauxReduction: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      field: 'taux_reduction'
    },
    reductionFixe: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'reduction_fixe'
    },
    dateDebut: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'date_debut'
    },
    dateFin: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'date_fin'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    nbUtilisationsMax: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'nb_utilisations_max'
    },
    nbUtilisations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'nb_utilisations'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  },
  {
    sequelize,
    tableName: 'codes_promo',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);

export default PromoCode;