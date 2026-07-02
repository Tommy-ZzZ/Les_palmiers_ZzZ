import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum TypeEmail {
  CONFIRMATION = 'CONFIRMATION',
  RAPPEL_J_MOINS_7 = 'RAPPEL_J_MOINS_7',
  REMERCIEMENT_J_PLUS_2 = 'REMERCIEMENT_J_PLUS_2',
  ANNULATION = 'ANNULATION',
  RELANCE_IMPAYE = 'RELANCE_IMPAYE'
}

export interface EmailTemplateAttributes {
  id: number;
  typeEmail: TypeEmail;
  sujet: string;
  corps: string;
  variablesDynamiques?: string;
  actif: boolean;
  dateModification: Date;
  modifiePar?: number;
}

export interface EmailTemplateCreationAttributes extends Optional<EmailTemplateAttributes, 'id' | 'actif' | 'dateModification'> {}

export class EmailTemplate extends Model<EmailTemplateAttributes, EmailTemplateCreationAttributes> implements EmailTemplateAttributes {
  public id!: number;
  public typeEmail!: TypeEmail;
  public sujet!: string;
  public corps!: string;
  public variablesDynamiques?: string;
  public actif!: boolean;
  public dateModification!: Date;
  public modifiePar?: number;
}

EmailTemplate.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    typeEmail: {
      type: DataTypes.ENUM(...Object.values(TypeEmail)),
      allowNull: false,
      // ✅ SUPPRIMEZ 'unique: true' ici
      field: 'type_email'
    },
    sujet: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    corps: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    variablesDynamiques: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'variables_dynamiques'
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    dateModification: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'date_modification'
    },
    modifiePar: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'modifie_par'
    }
  },
  {
    sequelize,
    tableName: 'modeles_email',
    timestamps: true,
    createdAt: false,
    updatedAt: 'dateModification',
    // ✅ Ajoutez la contrainte UNIQUE ici à la place
    indexes: [
      {
        unique: true,
        fields: ['type_email']
      }
    ]
  }
);

export default EmailTemplate;