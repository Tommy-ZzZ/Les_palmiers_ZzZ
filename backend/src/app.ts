// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import dotenv from 'dotenv';
import http from 'http';

// ✅ Import des routes
import codesPromoRoutes from './routes/codesPromo.routes';
import authRoutes from './routes/auth.routes';
import chambresRoutes from './routes/chambres.routes';
import reservationsRoutes from './routes/reservations.routes';
import { clientsRouter } from './routes/clients.routes';
import paiementsRoutes from './routes/paiements.routes';
import adminRoutes from './routes/admin.routes';
import servicesAnnexesRoutes from './routes/services-annexes.routes';
import communicationRoutes from './routes/communication.routes';
import notificationRoutes from './routes/notification.routes';

// ✅ Import des services
import {
  envoyerRappelsJMoins7,
  envoyerRemerciementsJPlus2,
  marquerImpayes
} from './services/email.service';

// ✅ Import des modèles
import './models';

// ✅ Import de la base de données
import { initDatabase, sequelize } from './config/database';

// ✅ Import du WebSocket
import { WebSocketManager } from './websocket/server';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ========================
// SÉCURITÉ & MIDDLEWARE
// ========================

// ✅ Helmet pour la sécurité
app.use(helmet());

// ✅ CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// ✅ Logging
app.use(morgan('combined'));

// ✅ Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes' },
});
app.use('/api/', limiter);

// ✅ Rate limiting spécifique pour login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Trop de tentatives de connexion' },
});

// ========================
// INITIALISATION WEBSOCKET
// ========================

const wsManager = WebSocketManager.getInstance(server);

// ✅ Middleware pour injecter wsManager dans les controllers
app.use((req, res, next) => {
  (req as any).wsManager = wsManager;
  next();
});

// ========================
// ROUTES
// ========================

// ✅ Routes d'authentification (avec rate limiting spécifique)
app.use('/api/auth', loginLimiter, authRoutes);

// ✅ Routes principales
app.use('/api/chambres', chambresRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/clients', clientsRouter);
app.use('/api/paiements', paiementsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/services-annexes', servicesAnnexesRoutes);
app.use('/api/codes-promo', codesPromoRoutes);
app.use('/api/codes-promo', codesPromoRoutes);

// ✅ Routes communication (§3.6)
app.use('/api/communication', communicationRoutes);

// ✅ Routes notifications (§3.4.2)
app.use('/api/notifications', notificationRoutes);

// ========================
// ROUTES PUBLIQUES
// ========================

// ✅ Health check
app.get('/api/health', (_, res) => {
  res.json({
    success: true,
    message: '🌴 Les Palmiers API — opérationnelle',
    timestamp: new Date(),
    version: '1.0.0',
    wsClients: wsManager.getConnectedClients()
  });
});

// ✅ Route racine
app.get('/', (_, res) => {
  res.json({
    success: true,
    message: '🌴 Bienvenue sur l\'API Les Palmiers de l\'Entre-Deux',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      chambres: '/api/chambres',
      reservations: '/api/reservations',
      clients: '/api/clients',
      paiements: '/api/paiements',
      admin: '/api/admin',
      services: '/api/services-annexes',
      communication: '/api/communication',
      notifications: '/api/notifications'
    },
    websocket: {
      url: `ws://localhost:${PORT}/ws`,
      clients: wsManager.getConnectedClients()
    }
  });
});

// ========================
// GESTION DES ERREURS
// ========================

// ✅ 404 - Route non trouvée
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// ✅ Error handler global
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur'
  });
});

// ========================
// CRON JOBS (Planification)
// ========================

// ✅ J-7 : rappel envoyé tous les jours à 09h00
cron.schedule('0 9 * * *', async () => {
  console.log('[CRON] Envoi rappels J-7...');
  try {
    await envoyerRappelsJMoins7();
    console.log('[CRON] Rappels J-7 envoyés avec succès');
  } catch (error) {
    console.error('[CRON] Erreur envoi rappels J-7:', error);
  }
});

// ✅ J+2 : remerciements envoyés tous les jours à 10h00
cron.schedule('0 10 * * *', async () => {
  console.log('[CRON] Envoi remerciements J+2...');
  try {
    await envoyerRemerciementsJPlus2();
    console.log('[CRON] Remerciements J+2 envoyés avec succès');
  } catch (error) {
    console.error('[CRON] Erreur envoi remerciements J+2:', error);
  }
});

// ✅ Impayés : vérification toutes les heures
cron.schedule('0 * * * *', async () => {
  console.log('[CRON] Marquage impayés...');
  try {
    await marquerImpayes();
    console.log('[CRON] Marquage impayés terminé');
  } catch (error) {
    console.error('[CRON] Erreur marquage impayés:', error);
  }
});

// ========================
// DÉMARRAGE DU SERVEUR
// ========================

const startServer = async () => {
  try {
    console.log('🌴 Initialisation de l\'API Les Palmiers...\n');

    // ✅ Synchronisation de la base de données
    const forceSync = process.env.SYNC_FORCE === 'true';
    await initDatabase(forceSync);

    // ✅ Démarrage du serveur
    server.listen(PORT, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🌴 Les Palmiers API démarrée avec succès !`);
      console.log(`${'='.repeat(60)}`);
      console.log(`   📍 URL        : http://localhost:${PORT}`);
      console.log(`   🔌 WebSocket  : ws://localhost:${PORT}/ws`);
      console.log(`   🌍 Environnement : ${process.env.NODE_ENV || 'development'}`);
      console.log(`   🔗 CORS origin  : ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
      console.log(`   📊 Base de données : ${process.env.DB_NAME || 'les_palmiers_db'}`);
      console.log(`   ✅ Statut     : Opérationnelle`);
      console.log(`${'='.repeat(60)}\n`);

      // ✅ Affichage des routes principales
      console.log('📋 Routes principales :');
      console.log(`   ${'─'.repeat(50)}`);
      console.log('   🔐 AUTH        → /api/auth');
      console.log('   🏠 CHAMBRES    → /api/chambres');
      console.log('   📅 RÉSERVATIONS → /api/reservations');
      console.log('   👤 CLIENTS     → /api/clients');
      console.log('   💰 PAIEMENTS   → /api/paiements');
      console.log('   📊 ADMIN       → /api/admin');
      console.log('   🚲 SERVICES    → /api/services-annexes');
      console.log('   📧 COMMUNICATION → /api/communication');
      console.log('   🔔 NOTIFICATIONS → /api/notifications');
      console.log('   ❤️ HEALTH      → /api/health');
      console.log(`   ${'─'.repeat(50)}\n`);

      console.log(`🔌 Clients WebSocket connectés: ${wsManager.getConnectedClients()}`);
      console.log('💡 Serveur en cours d\'exécution\n');
    });

  } catch (error) {
    console.error('❌ Erreur fatale lors du démarrage :', error);
    process.exit(1);
  }
};

// ========================
// GESTION DE L'ARRÊT PROPRE
// ========================

process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  try {
    await sequelize.close();
    console.log('✅ Connexion à la base de données fermée');
    console.log('👋 Au revoir !\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture :', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Arrêt du serveur (SIGTERM)...');
  try {
    await sequelize.close();
    console.log('✅ Connexion à la base de données fermée');
    console.log('👋 Au revoir !\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture :', error);
    process.exit(1);
  }
});

// ========================
// LANCEMENT
// ========================

startServer();

export { app, server, wsManager };