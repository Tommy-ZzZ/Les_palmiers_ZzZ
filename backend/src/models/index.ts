// backend/src/models/index.ts
import { sequelize } from '../config/database';
import { DataTypes, Model, Optional } from 'sequelize';

// Import des modèles
import User from './User';
import Room from './Room';
import Equipment from './Equipment';
import RoomEquipment from './RoomEquipment';
import Tariff from './Tariff';
import PromoCode from './PromoCode';
import RoomBlock from './RoomBlock';
import Client from './Client';
import ClientPreference from './ClientPreference';
import Reservation from './Reservation';
import ReservationHistory from './ReservationHistory';
import Cancellation from './Cancellation';
import Payment from './Payment';
import Invoice from './Invoice';
import Bike from './Bike';
import BikeRental from './BikeRental';
import Transfer from './Transfer';
import Partner from './Partner';
import Activity from './Activity';
import ReservationActivity from './ReservationActivity';
import EmailTemplate from './EmailTemplate';
import SentEmail from './SentEmail';
import AuditLog from './AuditLog';

// ⬅️ NOUVEAUX MODÈLES COMMUNICATION
import Message from './Message';
import MessageEmail from './MessageEmail';
import HistoriqueModification from './HistoriqueModification';

// ⬅️ NOUVEAU MODÈLE NOTIFICATION - import de la fonction d'init
import Notification, { initNotification } from './Notification';

// ⬅️ INITIALISER NOTIFICATION AVEC SEQUELIZE
initNotification(sequelize);

// ============================================
// ASSOCIATIONS
// ============================================

// ─── User associations ──────────────────────────────────────────────────────────
User.hasMany(Reservation, { foreignKey: 'creePar', as: 'reservationsCreees' });
User.hasMany(Tariff, { foreignKey: 'modifiePar', as: 'tarifsModifies' });
User.hasMany(RoomBlock, { foreignKey: 'creePar', as: 'blocagesCrees' });
User.hasMany(ReservationHistory, { foreignKey: 'utilisateurId', as: 'historiques' });
User.hasMany(Cancellation, { foreignKey: 'annulePar', as: 'annulationsEffectuees' });
User.hasMany(Payment, { foreignKey: 'enregistrePar', as: 'paiementsEnregistres' });
User.hasMany(Invoice, { foreignKey: 'editePar', as: 'facturesEditees' });
User.hasMany(EmailTemplate, { foreignKey: 'modifiePar', as: 'modelesModifies' });
User.hasMany(AuditLog, { foreignKey: 'utilisateurId', as: 'auditsEffectues' });

// ⬅️ NOUVELLES ASSOCIATIONS MESSAGE
User.hasMany(Message, { foreignKey: 'creePar', as: 'messagesCrees' });
User.hasMany(Message, { foreignKey: 'validePar', as: 'messagesValides' });

// ─── Room associations ─────────────────────────────────────────────────────────
Room.hasMany(Tariff, { foreignKey: 'chambreId', as: 'tarifs' });
Room.hasMany(RoomBlock, { foreignKey: 'chambreId', as: 'blocages' });
Room.hasMany(Reservation, { foreignKey: 'chambreId', as: 'reservations' });
Room.belongsToMany(Equipment, { through: RoomEquipment, foreignKey: 'chambreId', otherKey: 'equipementId', as: 'equipements' });
Room.hasMany(ClientPreference, { foreignKey: 'chambrePrefereeId', as: 'clientsPreferences' });

// ─── Equipment associations ────────────────────────────────────────────────────
Equipment.belongsToMany(Room, { through: RoomEquipment, foreignKey: 'equipementId', otherKey: 'chambreId', as: 'chambres' });

// ─── Tariff associations ──────────────────────────────────────────────────────
Tariff.belongsTo(Room, { foreignKey: 'chambreId', as: 'chambre' });
Tariff.belongsTo(User, { foreignKey: 'modifiePar', as: 'modificateur' });
Tariff.hasMany(Reservation, { foreignKey: 'tarifId', as: 'reservations' });

// ─── PromoCode associations ────────────────────────────────────────────────────
PromoCode.hasMany(Reservation, { foreignKey: 'codePromoId', as: 'reservations' });

// ─── RoomBlock associations ────────────────────────────────────────────────────
RoomBlock.belongsTo(Room, { foreignKey: 'chambreId', as: 'chambre' });
RoomBlock.belongsTo(User, { foreignKey: 'creePar', as: 'createur' });

// ─── Client associations ──────────────────────────────────────────────────────
Client.hasMany(Reservation, { foreignKey: 'clientId', as: 'reservations' });
Client.hasOne(ClientPreference, { foreignKey: 'clientId', as: 'preferences' });

// ─── ClientPreference associations ─────────────────────────────────────────────
ClientPreference.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
ClientPreference.belongsTo(Room, { foreignKey: 'chambrePrefereeId', as: 'chambrePreferee' });

// ─── Reservation associations ──────────────────────────────────────────────────
Reservation.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Reservation.belongsTo(Room, { foreignKey: 'chambreId', as: 'chambre' });
Reservation.belongsTo(Tariff, { foreignKey: 'tarifId', as: 'tarif' });
Reservation.belongsTo(PromoCode, { foreignKey: 'codePromoId', as: 'codePromo' });
Reservation.belongsTo(User, { foreignKey: 'creePar', as: 'createur' });
Reservation.hasMany(ReservationHistory, { foreignKey: 'reservationId', as: 'historiques' });
Reservation.hasOne(Cancellation, { foreignKey: 'reservationId', as: 'annulation' });
Reservation.hasMany(Payment, { foreignKey: 'reservationId', as: 'paiements' });
Reservation.hasOne(Invoice, { foreignKey: 'reservationId', as: 'facture' });
Reservation.hasMany(BikeRental, { foreignKey: 'reservationId', as: 'locationsVelo' });
Reservation.hasMany(Transfer, { foreignKey: 'reservationId', as: 'transferts' });
Reservation.hasMany(ReservationActivity, { foreignKey: 'reservationId', as: 'activites' });
Reservation.hasMany(SentEmail, { foreignKey: 'reservationId', as: 'emails' });

// ─── ReservationHistory associations ──────────────────────────────────────────
ReservationHistory.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
ReservationHistory.belongsTo(User, { foreignKey: 'utilisateurId', as: 'utilisateur' });

// ─── Cancellation associations ─────────────────────────────────────────────────
Cancellation.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
Cancellation.belongsTo(User, { foreignKey: 'annulePar', as: 'utilisateurAnnuleur' });

// ─── Payment associations ──────────────────────────────────────────────────────
Payment.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
Payment.belongsTo(User, { foreignKey: 'enregistrePar', as: 'utilisateurEnregistreur' });

// ─── Invoice associations ──────────────────────────────────────────────────────
Invoice.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
Invoice.belongsTo(User, { foreignKey: 'editePar', as: 'utilisateurEditeur' });

// ─── Bike associations ─────────────────────────────────────────────────────────
Bike.hasMany(BikeRental, { foreignKey: 'veloId', as: 'locations' });

// ─── BikeRental associations ──────────────────────────────────────────────────
BikeRental.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
BikeRental.belongsTo(Bike, { foreignKey: 'veloId', as: 'velo' });

// ─── Transfer associations ─────────────────────────────────────────────────────
Transfer.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });

// ─── Partner associations ──────────────────────────────────────────────────────
Partner.hasMany(Activity, { foreignKey: 'partenaireId', as: 'activites' });

// ─── Activity associations ─────────────────────────────────────────────────────
Activity.belongsTo(Partner, { foreignKey: 'partenaireId', as: 'partenaire' });
Activity.hasMany(ReservationActivity, { foreignKey: 'activiteId', as: 'reservations' });

// ─── ReservationActivity associations ──────────────────────────────────────────
ReservationActivity.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
ReservationActivity.belongsTo(Activity, { foreignKey: 'activiteId', as: 'activite' });

// ─── EmailTemplate associations ────────────────────────────────────────────────
EmailTemplate.belongsTo(User, { foreignKey: 'modifiePar', as: 'modificateur' });
EmailTemplate.hasMany(SentEmail, { foreignKey: 'modeleId', as: 'emailsEnvoyes' });

// ─── SentEmail associations ────────────────────────────────────────────────────
SentEmail.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });
SentEmail.belongsTo(EmailTemplate, { foreignKey: 'modeleId', as: 'modele' });

// ─── AuditLog associations ─────────────────────────────────────────────────────
AuditLog.belongsTo(User, { foreignKey: 'utilisateurId', as: 'utilisateur' });

// ⬅️ NOUVELLES ASSOCIATIONS MESSAGE & MESSAGE_EMAIL

// ─── Message associations ──────────────────────────────────────────────────────
Message.belongsTo(User, { foreignKey: 'creePar', as: 'creeParUtilisateur' });
Message.belongsTo(User, { foreignKey: 'validePar', as: 'valideParUtilisateur' });
Message.hasMany(MessageEmail, { foreignKey: 'messageId', as: 'emails' });

// ─── MessageEmail associations ─────────────────────────────────────────────────
MessageEmail.belongsTo(Message, { foreignKey: 'messageId', as: 'modele' });
MessageEmail.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
MessageEmail.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });

// ─── HistoriqueModification associations ──────────────────────────────────────
HistoriqueModification.belongsTo(User, { foreignKey: 'modifiePar', as: 'modificateur' });

// ⬅️ ASSOCIATIONS NOTIFICATION

// ─── Notification associations ──────────────────────────────────────────────────
Notification.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Notification.belongsTo(Reservation, { foreignKey: 'reservationId', as: 'reservation' });

// ─── Client has many notifications ─────────────────────────────────────────────
Client.hasMany(Notification, { foreignKey: 'clientId', as: 'notifications' });

// ─── Reservation has many notifications ────────────────────────────────────────
Reservation.hasMany(Notification, { foreignKey: 'reservationId', as: 'notifications' });

// ─── User has many notifications ──────────────────────────────────────────────
User.hasMany(Notification, { foreignKey: 'clientId', as: 'notificationsClient' });
User.hasMany(Notification, { foreignKey: 'reservationId', as: 'notificationsReservation' });

// ✅ VÉRIFICATION : S'assurer que les associations sont bien définies avant d'exporter

export {
  sequelize,
  User,
  Room,
  Equipment,
  RoomEquipment,
  Tariff,
  PromoCode,
  RoomBlock,
  Client,
  ClientPreference,
  Reservation,
  ReservationHistory,
  Cancellation,
  Payment,
  Invoice,
  Bike,
  BikeRental,
  Transfer,
  Partner,
  Activity,
  ReservationActivity,
  EmailTemplate,
  SentEmail,
  AuditLog,
  Message,
  MessageEmail,
  HistoriqueModification,
  Notification
};