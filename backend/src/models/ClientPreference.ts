import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ClientPreferenceAttributes {
  id: number;
  clientId: number;
  chambrePrefereeId?: number;
  allergies?: string;
  regimeAlimentaire?: string;
  autresPreferences?: string;
  updated_at: Date;
}

export interface ClientPreferenceCreationAttributes extends Optional<ClientPreferenceAttributes, 'id' | 'updated_at'> {}

export class ClientPreference extends Model<ClientPreferenceAttributes, ClientPreferenceCreationAttributes> implements ClientPreferenceAttributes {
  public id!: number;
  public clientId!: number;
  public chambrePrefereeId?: number;
  public allergies?: string;
  public regimeAlimentaire?: string;
  public autresPreferences?: string;
  public updated_at!: Date;
}

ClientPreference.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'client_id'
    },
    chambrePrefereeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'chambre_preferee_id'
    },
    allergies: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    regimeAlimentaire: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'regime_alimentaire'
    },
    autresPreferences: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'autres_preferences'
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    tableName: 'preferences_client',
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at'
  }
);

export default ClientPreference;