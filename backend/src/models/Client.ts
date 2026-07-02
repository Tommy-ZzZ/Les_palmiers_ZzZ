// E:\Projets\les-palmiers\backend\src\models\Client.ts

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum StatutClient {
  NOUVEAU = 'NOUVEAU',
  REGULIER = 'REGULIER',
  VIP = 'VIP'
}

export enum SegmentClient {
  TOURISTE_INDIVIDUEL = 'TOURISTE_INDIVIDUEL',
  COUPLE = 'COUPLE',
  FAMILLE = 'FAMILLE',
  GROUPE = 'GROUPE',
  VOYAGEUR_AFFAIRES = 'VOYAGEUR_AFFAIRES'
}

export enum OrigineGeo {
  METROPOLE = 'METROPOLE',
  ILE_MAURICE = 'ILE_MAURICE',
  MADAGASCAR = 'MADAGASCAR',
  EUROPE = 'EUROPE',
  AUTRES_DOM_TOM = 'AUTRES_DOM_TOM',
  AUTRE = 'AUTRE'
}

export enum CanalAcquisition {
  DIRECT = 'DIRECT',
  SITE_WEB = 'SITE_WEB',
  BOOKING = 'BOOKING',
  AGENCE_LOCALE = 'AGENCE_LOCALE',
  BOUCHE_A_OREILLE = 'BOUCHE_A_OREILLE'
}

export interface ClientAttributes {
  id: number;
  civilite?: string;
  nom: string;
  prenom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  pays: string;
  segment: SegmentClient;
  origineGeo: OrigineGeo;
  canalAcquisition: CanalAcquisition;
  statut: StatutClient;
  estGroupe: boolean;
  nbSejoursRealises: number;
  montantTotalPaye: number;
  dateCreation: Date;
  updated_at: Date;
  allergies?: string;
  regimeAlimentaire?: string;
  chambrePreferee?: string;
  commentairesPrives?: string;
}

export interface ClientCreationAttributes extends Optional<ClientAttributes, 'id' | 'pays' | 'segment' | 'origineGeo' | 'canalAcquisition' | 'statut' | 'estGroupe' | 'nbSejoursRealises' | 'montantTotalPaye' | 'dateCreation' | 'updated_at'> {}

export class Client extends Model<ClientAttributes, ClientCreationAttributes> implements ClientAttributes {
  public id!: number;
  public civilite?: string;
  public nom!: string;
  public prenom!: string;
  public telephone?: string;
  public email?: string;
  public adresse?: string;
  public codePostal?: string;
  public ville?: string;
  public pays!: string;
  public segment!: SegmentClient;
  public origineGeo!: OrigineGeo;
  public canalAcquisition!: CanalAcquisition;
  public statut!: StatutClient;
  public estGroupe!: boolean;
  public nbSejoursRealises!: number;
  public montantTotalPaye!: number;
  public dateCreation!: Date;
  public updated_at!: Date;
  public allergies?: string;
  public regimeAlimentaire?: string;
  public chambrePreferee?: string;
  public commentairesPrives?: string;
}

Client.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    civilite: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    prenom: {
      type: DataTypes.STRING(100),
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
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    codePostal: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'code_postal'
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    pays: {
      type: DataTypes.STRING(100),
      defaultValue: 'France'
    },
    segment: {
      type: DataTypes.ENUM(...Object.values(SegmentClient)),
      defaultValue: SegmentClient.TOURISTE_INDIVIDUEL
    },
    origineGeo: {
      type: DataTypes.ENUM(...Object.values(OrigineGeo)),
      defaultValue: OrigineGeo.METROPOLE,
      field: 'origine_geo'
    },
    canalAcquisition: {
      type: DataTypes.ENUM(...Object.values(CanalAcquisition)),
      defaultValue: CanalAcquisition.DIRECT,
      field: 'canal_acquisition'
    },
    statut: {
      type: DataTypes.ENUM(...Object.values(StatutClient)),
      defaultValue: StatutClient.NOUVEAU
    },
    estGroupe: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'est_groupe'
    },
    nbSejoursRealises: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'nb_sejours_realises'
    },
    montantTotalPaye: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'montant_total_paye'
    },
    dateCreation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'date_creation'
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    },
    allergies: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    regimeAlimentaire: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'regime_alimentaire'
    },
    chambrePreferee: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'chambre_preferee'
    },
    commentairesPrives: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'commentaires_prives'
    }
  },
  {
    sequelize,
    tableName: 'clients',
    timestamps: true,
    createdAt: 'dateCreation',
    updatedAt: 'updated_at'
  }
);

export default Client;