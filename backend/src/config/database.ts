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
 * ✅ NETTOYAGE COMPLET DES INDEX EN DOUBLE
 * Supprime tous les index en double sur la colonne 'numero'
 * et recrée un seul index UNIQUE
 * ⚠️ NE SUPPRIME AUCUNE DONNÉE
 */
async function cleanAllDuplicateIndexes() {
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (!tables.includes('reservations')) {
      console.log('ℹ️ Table reservations n\'existe pas encore, skip nettoyage...');
      return;
    }

    console.log('🧹 Nettoyage complet des index sur reservations...');

    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE tablename = 'reservations' 
      AND indexname LIKE 'reservations_numero_key%'
    `);
    
    const indexCount = parseInt(countResult[0]?.count || '0');
    
    if (indexCount <= 1) {
      console.log(`✅ Déjà propre (${indexCount} index sur 'numero')`);
      return;
    }

    console.log(`📊 ${indexCount} index trouvés sur la colonne 'numero' - Nettoyage en cours...`);

    const [indexes] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'reservations' 
      AND indexname LIKE 'reservations_numero_key%'
      ORDER BY indexname
    `);

    let deleted = 0;
    let errors = 0;
    
    for (const row of indexes) {
      const indexName = row.indexname;
      try {
        await sequelize.query(`DROP INDEX IF EXISTS "${indexName}"`);
        deleted++;
        console.log(`   ✅ Index supprimé: ${indexName}`);
      } catch (err: any) {
        if (err.message?.includes('requis par contrainte') || err.code === '2BP01') {
          try {
            await sequelize.query(`ALTER TABLE reservations DROP CONSTRAINT IF EXISTS "${indexName}"`);
            console.log(`   ✅ Contrainte supprimée: ${indexName}`);
            
            await sequelize.query(`DROP INDEX IF EXISTS "${indexName}"`);
            deleted++;
            console.log(`   ✅ Index supprimé: ${indexName}`);
          } catch (constraintErr) {
            console.log(`   ⚠️ Impossible de supprimer ${indexName}:`, constraintErr);
            errors++;
          }
        } else {
          console.log(`   ⚠️ Impossible de supprimer ${indexName}:`, err.message);
          errors++;
        }
      }
    }

    if (deleted > 0) {
      try {
        await sequelize.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS reservations_numero_key ON reservations (numero)
        `);
        console.log(`   ✅ Nouvel index UNIQUE créé: reservations_numero_key`);
      } catch (err) {
        console.log(`   ⚠️ L'index existe déjà ou erreur:`, err);
      }
    }

    const [finalCount] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE tablename = 'reservations' 
      AND indexname LIKE 'reservations_numero_key%'
    `);
    
    const finalIndexCount = parseInt(finalCount[0]?.count || '0');
    
    if (finalIndexCount === 1) {
      console.log(`✅ Nettoyage terminé avec succès !`);
      console.log(`   📊 ${deleted} index supprimés, 1 conservé`);
      if (errors > 0) {
        console.log(`   ⚠️ ${errors} erreurs ignorées`);
      }
    } else if (finalIndexCount === 0) {
      console.log(`⚠️ Aucun index trouvé, création d'un nouvel index...`);
      await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS reservations_numero_key ON reservations (numero)
      `);
      console.log(`✅ Index recréé avec succès`);
    } else {
      console.log(`⚠️ ${finalIndexCount} index restants - nettoyage partiel`);
    }

  } catch (error) {
    console.error('⚠️ Erreur lors du nettoyage complet des index:', error);
    console.log('ℹ️ Le nettoyage sera réessayé au prochain démarrage.');
  }
}

/**
 * ✅ Nettoie automatiquement les index en double sur la table reservations
 */
async function cleanDuplicateIndexes() {
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (!tables.includes('reservations')) {
      console.log('ℹ️ Table reservations n\'existe pas encore, skip nettoyage index...');
      return;
    }

    console.log('🔍 Vérification des index en double sur reservations...');

    const indexes = await sequelize.getQueryInterface().showIndex('reservations');
    
    const numeroIndexes = indexes.filter(idx => 
      idx.fields && idx.fields.some(f => f.attribute === 'numero')
    );

    if (numeroIndexes.length <= 1) {
      console.log(`✅ Aucun index en double trouvé (${numeroIndexes.length} index sur 'numero').`);
      return;
    }

    const uniqueIndexes = numeroIndexes.filter(idx => idx.unique === true);
    const nonUniqueIndexes = numeroIndexes.filter(idx => idx.unique !== true);

    console.log(`📊 ${numeroIndexes.length} index trouvés sur la colonne 'numero'`);
    console.log(`   - ${uniqueIndexes.length} index UNIQUE (avec contrainte) - CONSERVÉS`);
    console.log(`   - ${nonUniqueIndexes.length} index non-UNIQUE - À SUPPRIMER`);

    if (nonUniqueIndexes.length === 0) {
      console.log('✅ Aucun index en double à supprimer.');
      return;
    }

    let droppedCount = 0;
    for (const idx of nonUniqueIndexes) {
      try {
        await sequelize.getQueryInterface().removeIndex('reservations', idx.name);
        droppedCount++;
        console.log(`   ✅ Index supprimé : ${idx.name}`);
      } catch (err: any) {
        if (err.code === '2BP01' || err.message?.includes('requis par contrainte')) {
          console.log(`   ⚠️ Index ${idx.name} lié à une contrainte, ignoré.`);
        } else {
          console.warn(`   ⚠️ Impossible de supprimer ${idx.name}:`, err.message);
        }
      }
    }

    console.log(`✅ Nettoyage terminé : ${droppedCount} index supprimés, ${uniqueIndexes.length} index UNIQUE conservés.`);

  } catch (error) {
    console.error('⚠️ Erreur lors du nettoyage des index:', error);
    console.log('ℹ️ Le nettoyage sera réessayé au prochain démarrage.');
  }
}

/**
 * ✅ NOUVEAU : Nettoie les contraintes UNIQUE en double sur notifications.cle_unique
 * Sequelize (via alter: true) peut recréer une contrainte UNIQUE en double
 * à chaque redémarrage à chaud (nodemon) s'il ne détecte pas correctement
 * celle déjà existante. Cette fonction garde une seule contrainte.
 * ⚠️ NE SUPPRIME AUCUNE DONNÉE
 */
async function cleanDuplicateNotificationConstraints() {
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (!tables.includes('notifications')) {
      console.log('ℹ️ Table notifications n\'existe pas encore, skip nettoyage...');
      return;
    }

    // Récupérer toutes les contraintes UNIQUE sur la colonne cle_unique
    const [constraints] = await sequelize.query(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'notifications'
        AND tc.constraint_type = 'UNIQUE'
        AND kcu.column_name = 'cle_unique'
      ORDER BY tc.constraint_name;
    `);

    if (constraints.length <= 1) {
      console.log(`✅ Déjà propre (${constraints.length} contrainte UNIQUE sur 'cle_unique')`);
      return;
    }

    console.log(`📊 ${constraints.length} contraintes UNIQUE trouvées sur 'cle_unique' - Nettoyage en cours...`);

    // On garde la première (ordre alphabétique), on supprime les autres
    const toKeep = constraints[0].constraint_name;
    const toDrop = constraints.slice(1);

    let deleted = 0;
    for (const row of toDrop) {
      try {
        await sequelize.query(`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`);
        deleted++;
        console.log(`   ✅ Contrainte supprimée: ${row.constraint_name}`);
      } catch (err: any) {
        console.log(`   ⚠️ Impossible de supprimer ${row.constraint_name}:`, err.message);
      }
    }

    console.log(`✅ Nettoyage terminé : ${deleted} contrainte(s) supprimée(s), "${toKeep}" conservée.`);

  } catch (error) {
    console.error('⚠️ Erreur lors du nettoyage des contraintes notifications:', error);
    console.log('ℹ️ Le nettoyage sera réessayé au prochain démarrage.');
  }
}

/**
 * ✅ Met à jour l'énumération des statuts des chambres automatiquement
 */
async function updateRoomStatusEnum() {
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    if (!tables.includes('chambres')) {
      console.log('ℹ️ Table chambres n\'existe pas encore, création ultérieure...');
      return;
    }

    const enumResult = await sequelize.query(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_chambres_statut') as exists;`
    );
    
    const enumExists = enumResult[0][0]?.exists || false;
    
    if (!enumExists) {
      console.log('ℹ️ L\'énumération enum_chambres_statut n\'existe pas encore.');
      return;
    }

    const valuesResult = await sequelize.query(
      `SELECT enum_range(NULL::enum_chambres_statut) as values;`
    );
    
    const currentValues = valuesResult[0][0]?.values || [];
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

export const initDatabase = async (force: boolean = false) => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie avec succès.');

    // ✅ NETTOYAGE COMPLET DES INDEX EN DOUBLE (supprime TOUS les index en double)
    await cleanAllDuplicateIndexes();

    // ✅ NETTOYAGE DES CONTRAINTES UNIQUE EN DOUBLE SUR notifications.cle_unique
    await cleanDuplicateNotificationConstraints();

    // ✅ Mettre à jour l'énumération des chambres
    await updateRoomStatusEnum();

    // ✅ Import des modèles pour garantir l'ordre
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