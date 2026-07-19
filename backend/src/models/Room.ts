// backend/src/models/Room.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum VueChambre {
  JARDIN = 'JARDIN',
  PISCINE = 'PISCINE',
  MONTAGNE = 'MONTAGNE'
}

// ✅ TOUS les statuts incluant OCCUPEE et BLOQUEE
export enum StatutChambre {
  DISPONIBLE = 'DISPONIBLE',
  OCCUPEE = 'OCCUPEE',
  EN_MAINTENANCE = 'EN_MAINTENANCE',
  HORS_SERVICE = 'HORS_SERVICE',
  BLOQUEE = 'BLOQUEE'
}

export interface RoomAttributes {
  id: number;
  numero: string;
  nom: string;
  capaciteAdultes: number;
  capaciteEnfants: number;
  nbLitsSimples: number;
  nbLitsDoubles: number;
  nbLitsBebe: number;
  surfaceM2?: number;
  vue: VueChambre;
  accessiblePmr: boolean;
  statut: StatutChambre;
  description?: string;
  // ✅ AJOUT — image de la chambre stockée directement en base (Sequelize),
  // sous forme de data URI base64 (ex: "data:image/png;base64,...").
  // Aucune dépendance à un service de fichiers/CDN externe n'est nécessaire :
  // l'admin upload une image depuis son poste, elle est encodée côté
  // frontend puis envoyée telle quelle dans le payload JSON.
  image?: string;
  climatisation: boolean;
  ventilateur: boolean;
  secheCheveux: boolean;
  bouilloire: boolean;
  miniRefrigerateur: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RoomCreationAttributes extends Optional<RoomAttributes, 'id' | 'image' | 'climatisation' | 'ventilateur' | 'secheCheveux' | 'bouilloire' | 'miniRefrigerateur' | 'created_at' | 'updated_at'> {}

export class Room extends Model<RoomAttributes, RoomCreationAttributes> implements RoomAttributes {
  public id!: number;
  public numero!: string;
  public nom!: string;
  public capaciteAdultes!: number;
  public capaciteEnfants!: number;
  public nbLitsSimples!: number;
  public nbLitsDoubles!: number;
  public nbLitsBebe!: number;
  public surfaceM2?: number;
  public vue!: VueChambre;
  public accessiblePmr!: boolean;
  public statut!: StatutChambre;
  public description?: string;
  public image?: string;
  public climatisation!: boolean;
  public ventilateur!: boolean;
  public secheCheveux!: boolean;
  public bouilloire!: boolean;
  public miniRefrigerateur!: boolean;
  public created_at!: Date;
  public updated_at!: Date;
}

Room.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    numero: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    capaciteAdultes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      field: 'capacite_adultes'
    },
    capaciteEnfants: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'capacite_enfants'
    },
    nbLitsSimples: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'nb_lits_simples'
    },
    nbLitsDoubles: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'nb_lits_doubles'
    },
    nbLitsBebe: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'nb_lits_bebe'
    },
    surfaceM2: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'surface_m2'
    },
    vue: {
      type: DataTypes.ENUM(...Object.values(VueChambre)),
      allowNull: false,
      defaultValue: VueChambre.JARDIN
    },
    accessiblePmr: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'accessible_pmr'
    },
    statut: {
      type: DataTypes.ENUM(...Object.values(StatutChambre)),
      allowNull: false,
      defaultValue: StatutChambre.DISPONIBLE
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // ✅ AJOUT — colonne image (TEXT, illimité côté Postgres) pour stocker
    // le base64 de la photo de la chambre. Sur Postgres, TEXT n'a pas de
    // variante de taille (contrairement à MySQL où TEXT('long') donnerait
    // LONGTEXT) : un simple TEXT est déjà sans limite de longueur.
    //
    // Avec `sequelize.sync({ alter: true })` (mode développement dans
    // database.ts), cette colonne est créée automatiquement au prochain
    // redémarrage du serveur — aucune migration manuelle à lancer en dev.
    //
    // ⚠️ En production, `alter` est désactivé volontairement (voir
    // database.ts) : il faudra alors une vraie migration SQL, par exemple :
    //   ALTER TABLE chambres ADD COLUMN image TEXT NULL;
    //
    // Pensez aussi à augmenter la limite du body-parser côté Express,
    // sinon l'upload d'image base64 sera rejeté :
    //   app.use(express.json({ limit: '10mb' }));
    image: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    climatisation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    ventilateur: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    secheCheveux: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    bouilloire: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    miniRefrigerateur: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    tableName: 'chambres',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default Room;