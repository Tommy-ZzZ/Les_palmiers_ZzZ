// backend/src/models/Tariff.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// ✅ CORRECTION : Utiliser les mêmes valeurs que l'enum PostgreSQL
export enum Saison {
  BASSE = 'BASSE',
  MOYENNE = 'MOYENNE',
  HAUTE = 'HAUTE'
}

export interface TariffAttributes {
  id: number;
  chambreId: number;
  saison: Saison;
  prixBase: number;
  prixPetitDejeuner: number;
  prixLitSupplementaire: number;
  prixEnfant: number;
  coeffWeekend: number;
  coeffDegressif5Nuits: number;
  dateApplication: Date;
  dateFin?: Date;
  modifiePar?: number;
  created_at: Date;
}

export interface TariffCreationAttributes extends Optional<TariffAttributes, 'id' | 'created_at'> {}

export class Tariff extends Model<TariffAttributes, TariffCreationAttributes> implements TariffAttributes {
  public id!: number;
  public chambreId!: number;
  public saison!: Saison;
  public prixBase!: number;
  public prixPetitDejeuner!: number;
  public prixLitSupplementaire!: number;
  public prixEnfant!: number;
  public coeffWeekend!: number;
  public coeffDegressif5Nuits!: number;
  public dateApplication!: Date;
  public dateFin?: Date;
  public modifiePar?: number;
  public created_at!: Date;
}

Tariff.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    chambreId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'chambre_id'
    },
    saison: {
      type: DataTypes.ENUM(...Object.values(Saison)),
      allowNull: false
    },
    prixBase: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'prix_base'
    },
    prixPetitDejeuner: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'prix_petit_dejeuner'
    },
    prixLitSupplementaire: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'prix_lit_supplementaire'
    },
    prixEnfant: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'prix_enfant'
    },
    coeffWeekend: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 1.0,
      field: 'coeff_weekend'
    },
    coeffDegressif5Nuits: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 1.0,
      field: 'coeff_degressif_5nuits'
    },
    dateApplication: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'date_application'
    },
    dateFin: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_fin'
    },
    modifiePar: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'modifie_par'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  },
  {
    sequelize,
    tableName: 'tarifs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);

export default Tariff;