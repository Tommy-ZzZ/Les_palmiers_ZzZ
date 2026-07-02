import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface RoomBlockAttributes {
  id: number;
  chambreId: number;
  dateDebut: Date;
  dateFin: Date;
  motif: string;
  creePar?: number;
  dateCreation: Date;
}

export interface RoomBlockCreationAttributes extends Optional<RoomBlockAttributes, 'id' | 'dateCreation'> {}

export class RoomBlock extends Model<RoomBlockAttributes, RoomBlockCreationAttributes> implements RoomBlockAttributes {
  public id!: number;
  public chambreId!: number;
  public dateDebut!: Date;
  public dateFin!: Date;
  public motif!: string;
  public creePar?: number;
  public dateCreation!: Date;
}

RoomBlock.init(
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
    motif: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    creePar: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'cree_par'
    },
    dateCreation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'date_creation'
    }
  },
  {
    sequelize,
    tableName: 'blocages_dates_chambre',
    timestamps: false
  }
);

export default RoomBlock;