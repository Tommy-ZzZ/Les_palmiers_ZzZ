import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface EquipmentAttributes {
  id: number;
  libelle: string;
}

export interface EquipmentCreationAttributes extends Optional<EquipmentAttributes, 'id'> {}

export class Equipment extends Model<EquipmentAttributes, EquipmentCreationAttributes> implements EquipmentAttributes {
  public id!: number;
  public libelle!: string;
}

Equipment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    libelle: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    }
  },
  {
    sequelize,
    tableName: 'equipements',
    timestamps: false
  }
);

export default Equipment;