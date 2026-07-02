import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum RoleUtilisateur {
  GERANTE = 'GERANTE',
  EMPLOYE_ACCUEIL = 'EMPLOYE_ACCUEIL',
  COMPTABLE = 'COMPTABLE',
  RESPONSABLE_TECHNIQUE = 'RESPONSABLE_TECHNIQUE'
}

export interface UserAttributes {
  id: number;
  login: string;
  motDePasseHash: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: RoleUtilisateur;
  actif: boolean;
  derniereConnexion?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'actif' | 'created_at' | 'updated_at'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public login!: string;
  public motDePasseHash!: string;
  public nom!: string;
  public prenom!: string;
  public email!: string;
  public telephone?: string;
  public role!: RoleUtilisateur;
  public actif!: boolean;
  public derniereConnexion?: Date;
  public created_at!: Date;
  public updated_at!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    login: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    motDePasseHash: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'mot_de_passe_hash'
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM(...Object.values(RoleUtilisateur)),
      allowNull: false
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    derniereConnexion: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'derniere_connexion'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    tableName: 'utilisateurs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default User;