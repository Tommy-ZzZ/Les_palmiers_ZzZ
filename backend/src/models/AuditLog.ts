import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface AuditLogAttributes {
  id: number;
  utilisateurId?: number;
  action: string;
  entite: string;
  entiteId?: number;
  ancienneValeur?: any;
  nouvelleValeur?: any;
  dateAction: Date;
  adresseIp?: string;
}

export interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'dateAction'> {}

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public id!: number;
  public utilisateurId?: number;
  public action!: string;
  public entite!: string;
  public entiteId?: number;
  public ancienneValeur?: any;
  public nouvelleValeur?: any;
  public dateAction!: Date;
  public adresseIp?: string;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    utilisateurId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'utilisateur_id'
    },
    action: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    entite: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    entiteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'entite_id'
    },
    ancienneValeur: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'ancienne_valeur'
    },
    nouvelleValeur: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'nouvelle_valeur'
    },
    dateAction: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'date_action'
    },
    adresseIp: {
      type: DataTypes.INET,
      allowNull: true,
      field: 'adresse_ip'
    }
  },
  {
    sequelize,
    tableName: 'journal_audit',
    timestamps: false
  }
);

export default AuditLog;