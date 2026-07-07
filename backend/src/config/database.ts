// backend/src/config/database.ts
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'les_palmiers_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

/**
 * ============================================================
 * NETTOYAGE GÉNÉRIQUE DES INDEX/CONTRAINTES UNIQUE EN DOUBLE
 * ============================================================
 * Contexte : avec `sequelize.sync({ alter: true })`, Sequelize ne
 * détecte pas toujours l'index UNIQUE déjà existant pour un champ
 * `unique: true` et en recrée un nouveau (nom différent) à chaque
 * redémarrage (nodemon, etc.). Sans nettoyage, les index UNIQUE
 * s'accumulent indéfiniment sur la colonne concernée.
 *
 * Avant cette correction, ce problème était traité 3 fois de façon
 * quasi identique (une fonction pour `reservations.numero`, une pour
 * `notifications.cle_unique`, et une troisième jamais appelée). On
 * centralise tout dans UNE seule fonction générique et idempotente,
 * réutilisable pour n'importe quelle table/colonne.
 *
 * ⚠️ Ne supprime jamais de données : uniquement des index/contraintes.
 * Garde toujours au moins UN index UNIQUE sur la colonne, et en
 * recrée un si aucun n'existe.
 * ============================================================
 */
async function cleanDuplicateUniqueIndex(table: string, column: string): Promise<void> {
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (!tables.includes(table)) {
      console.log(`ℹ️ Table "${table}" n'existe pas encore, skip nettoyage (${table}.${column})...`);
      return;
    }

    // 1) Contraintes UNIQUE portant sur cette colonne (via information_schema)
    const [constraints] = await sequelize.query(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = :table
        AND tc.constraint_type = 'UNIQUE'
        AND kcu.column_name = :column
      ORDER BY tc.constraint_name;
    `, { replacements: { table, column } }) as [any[], unknown];

    // 2) Index UNIQUE "nus" (sans contrainte associée) sur cette colonne
    const [bareIndexes] = await sequelize.query(`
      SELECT i.relname AS indexname
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      LEFT JOIN pg_constraint c ON c.conindid = ix.indexrelid
      WHERE t.relname = :table
        AND a.attname = :column
        AND ix.indisunique = true
        AND c.conname IS NULL
      ORDER BY i.relname;
    `, { replacements: { table, column } }) as [any[], unknown];

    const totalTrouves = constraints.length + bareIndexes.length;

    if (totalTrouves <= 1) {
      if (totalTrouves === 1) {
        console.log(`✅ ${table}.${column} déjà propre (1 index UNIQUE).`);
      } else {
        console.log(`⚠️ ${table}.${column} n'a aucun index UNIQUE, création...`);
        await sequelize.query(
          `CREATE UNIQUE INDEX IF NOT EXISTS "${table}_${column}_key" ON "${table}" ("${column}")`
        );
        console.log(`   ✅ Index UNIQUE créé : ${table}_${column}_key`);
      }
      return;
    }

    console.log(`📊 ${totalTrouves} index/contraintes UNIQUE trouvés sur ${table}.${column} — nettoyage...`);

    // On garde le premier (ordre alphabétique = généralement le plus ancien), on supprime le reste
    const aGarder = constraints[0]?.constraint_name ?? bareIndexes[0]?.indexname;
    let supprimes = 0;

    const constraintsASupprimer = constraints
      .map((r: any) => r.constraint_name)
      .filter((name: string) => name !== aGarder);
    const indexesASupprimer = bareIndexes
      .map((r: any) => r.indexname)
      .filter((name: string) => name !== aGarder);

    for (const constraintName of constraintsASupprimer) {
      try {
        await sequelize.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraintName}"`);
        supprimes++;
        console.log(`   ✅ Contrainte supprimée : ${constraintName}`);
      } catch (err: any) {
        console.log(`   ⚠️ Impossible de supprimer la contrainte ${constraintName}:`, err.message);
      }
    }

    for (const indexName of indexesASupprimer) {
      try {
        await sequelize.query(`DROP INDEX IF EXISTS "${indexName}"`);
        supprimes++;
        console.log(`   ✅ Index supprimé : ${indexName}`);
      } catch (err: any) {
        console.log(`   ⚠️ Impossible de supprimer l'index ${indexName}:`, err.message);
      }
    }

    console.log(`✅ ${table}.${column} : ${supprimes} doublon(s) supprimé(s), "${aGarder}" conservé.`);
  } catch (error) {
    console.error(`⚠️ Erreur nettoyage ${table}.${column}:`, error);
    console.log('ℹ️ Le nettoyage sera réessayé au prochain démarrage.');
  }
}

/**
 * ✅ Met à jour l'énumération des statuts des chambres si nécessaire
 */
async function updateRoomStatusEnum(): Promise<void> {
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (!tables.includes('chambres')) {
      console.log('ℹ️ Table chambres n\'existe pas encore, création ultérieure...');
      return;
    }

    const enumResult = await sequelize.query(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_chambres_statut') as exists;`
    );
    const enumExists = (enumResult[0] as any[])[0]?.exists || false;

    if (!enumExists) {
      console.log('ℹ️ L\'énumération enum_chambres_statut n\'existe pas encore.');
      return;
    }

    const valuesResult = await sequelize.query(
      `SELECT enum_range(NULL::enum_chambres_statut) as values;`
    );
    const currentValues: string[] = (valuesResult[0] as any[])[0]?.values || [];
    console.log('📊 Valeurs actuelles de l\'énumération:', currentValues);

    const targetValues = ['DISPONIBLE', 'OCCUPEE', 'EN_MAINTENANCE', 'HORS_SERVICE', 'BLOQUEE'];
    const missingValues = targetValues.filter(v => !currentValues.includes(v));

    if (missingValues.length === 0) {
      console.log('✅ L\'énumération est déjà à jour.');
      return;
    }

    console.log(`⚠️ Valeurs manquantes: ${missingValues.join(', ')}`);
    console.log('🔄 Migration automatique de l\'énumération en cours...');

    await sequelize.transaction(async (t) => {
      await sequelize.query(`
        CREATE TYPE enum_chambres_statut_new AS ENUM ('DISPONIBLE', 'OCCUPEE', 'EN_MAINTENANCE', 'HORS_SERVICE', 'BLOQUEE');
      `, { transaction: t });

      await sequelize.query(`
        ALTER TABLE chambres ALTER COLUMN statut TYPE enum_chambres_statut_new USING statut::text::enum_chambres_statut_new;
      `, { transaction: t });

      await sequelize.query(`
        DROP TYPE enum_chambres_statut;
      `, { transaction: t });

      await sequelize.query(`
        ALTER TYPE enum_chambres_statut_new RENAME TO enum_chambres_statut;
      `, { transaction: t });
    });

    console.log('✅ Migration automatique de l\'énumération terminée avec succès.');
  } catch (error) {
    console.error('⚠️ Erreur lors de la mise à jour de l\'énumération:', error);
    console.log('ℹ️ La migration sera effectuée lors de la prochaine synchronisation.');
  }
}

/**
 * Liste centralisée des couples (table, colonne) unique à surveiller.
 * Ajoutez ici toute nouvelle colonne `unique: true` posant le même
 * problème, au lieu de dupliquer une fonction de nettoyage.
 */
const COLONNES_UNIQUES_A_SURVEILLER: Array<{ table: string; column: string }> = [
  { table: 'reservations', column: 'numero' },
  { table: 'notifications', column: 'cle_unique' }
];

async function nettoyerTousLesDoublons(): Promise<void> {
  // ⚠️ Opération DDL potentiellement destructrice pour le schéma :
  // on ne l'exécute jamais automatiquement en production.
  if (process.env.NODE_ENV === 'production') {
    console.log('ℹ️ Nettoyage des index désactivé en production (utilisez une vraie migration).');
    return;
  }
  for (const { table, column } of COLONNES_UNIQUES_A_SURVEILLER) {
    await cleanDuplicateUniqueIndex(table, column);
  }
}

export const initDatabase = async (force: boolean = false) => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie avec succès.');

    // ✅ Nettoyage AVANT sync : on repart d'un état propre
    await nettoyerTousLesDoublons();

    // ✅ Mise à jour de l'énumération des statuts de chambres si besoin
    await updateRoomStatusEnum();

    // ✅ Import des modèles pour garantir l'ordre de déclaration des associations
    await import('../models');

    const options: any = {};

    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Mode production : aucune modification automatique des tables');
      options.force = false;
      options.alter = false;
    } else if (force) {
      console.log('🔄 Mode reset : suppression et recréation des tables');
      options.force = true;
    } else {
      console.log('🔧 Mode développement : modification des tables si nécessaire');
      options.alter = true;
    }

    await sequelize.sync({ ...options, logging: false });

    console.log('✅ Toutes les tables ont été synchronisées avec succès.');

    // ✅ Nettoyage APRÈS sync : `alter: true` peut avoir recréé un doublon,
    // on le supprime immédiatement plutôt que d'attendre le prochain boot.
    await nettoyerTousLesDoublons();

    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log(`📊 Tables existantes (${tables.length}) :`);
    tables.forEach(table => console.log(`   - ${table}`));

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation :', error);
    throw error;
  }
};

export { sequelize };