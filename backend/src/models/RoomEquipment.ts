import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface RoomEquipmentAttributes {
  chambreId: number;
  equipementId: number;
}

export interface RoomEquipmentCreationAttributes extends Optional<RoomEquipmentAttributes, never> {}

export class RoomEquipment extends Model<RoomEquipmentAttributes, RoomEquipmentCreationAttributes> implements RoomEquipmentAttributes {
  public chambreId!: number;
  public equipementId!: number;
}

RoomEquipment.init(
  {
    chambreId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'chambre_id'
    },
    equipementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'equipement_id'
    }
  },
  {
    sequelize,
    tableName: 'chambre_equipements',
    timestamps: false
  }
);

export default RoomEquipment;