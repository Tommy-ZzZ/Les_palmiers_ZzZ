import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum TypeTarificationVelo {
  HORAIRE = 'HORAIRE',
  JOURNALIERE = 'JOURNALIERE'
}

export enum StatutLocation {
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  ANNULEE = 'ANNULEE'
}

export interface BikeRentalAttributes {
  id: number;
  reservationId?: number;
  veloId: number;
  dateDebut: Date;
  dateFin: Date;
  typeTarification: TypeTarificationVelo;
  montant: number;
  statut: StatutLocation;
}

export interface BikeRentalCreationAttributes extends Optional<BikeRentalAttributes, 'id'> {}

export class BikeRental extends Model<BikeRentalAttributes, BikeRentalCreationAttributes> implements BikeRentalAttributes {
  public id!: number;
  public reservationId?: number;
  public veloId!: number;
  public dateDebut!: Date;
  public dateFin!: Date;
  public typeTarification!: TypeTarificationVelo;
  public montant!: number;
  public statut!: StatutLocation;
}

BikeRental.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'reservation_id'
    },
    veloId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'velo_id'
    },
    dateDebut: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'date_debut'
    },
    dateFin: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'date_fin'
    },
    typeTarification: {
      type: DataTypes.ENUM(...Object.values(TypeTarificationVelo)),
      allowNull: false,
      defaultValue: TypeTarificationVelo.JOURNALIERE,
      field: 'type_tarification'
    },
    montant: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    statut: {
      type: DataTypes.ENUM(...Object.values(StatutLocation)),
      allowNull: false,
      defaultValue: StatutLocation.EN_COURS
    }
  },
  {
    sequelize,
    tableName: 'locations_velo',
    timestamps: false
  }
);

export default BikeRental;