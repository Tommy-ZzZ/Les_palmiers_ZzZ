import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface PartnerAttributes {
  id: number;
  nom: string;
  telephone?: string;
  email?: string;
  tauxCommissionDefaut: number;
  actif: boolean;
  created_at: Date;
}

export interface PartnerCreationAttributes extends Optional<PartnerAttributes, 'id' | 'tauxCommissionDefaut' | 'actif' | 'created_at'> {}

export class Partner extends Model<PartnerAttributes, PartnerCreationAttributes> implements PartnerAttributes {
  public id!: number;
  public nom!: string;
  public telephone?: string;
  public email?: string;
  public tauxCommissionDefaut!: number;
  public actif!: boolean;
  public created_at!: Date;
}

Partner.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nom: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    tauxCommissionDefaut: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'taux_commission_defaut'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  },
  {
    sequelize,
    tableName: 'partenaires',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  }
);

export default Partner;