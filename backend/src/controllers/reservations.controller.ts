// backend/src/controllers/reservations.controller.ts
import { Request, Response } from 'express';
import { Op, Sequelize } from 'sequelize';
import {
  Reservation,
  Client,
  Room,
  Tariff,
  PromoCode,
  Payment,
  Cancellation,
  ReservationHistory,
  User
} from '../models';
import { sequelize } from '../config/database';
import { StatutChambre } from '../models/Room';
import { StatutReservation, StatutPaiement } from '../models/Reservation';
import { ModePenalite } from '../models/Cancellation';
import { TarifService } from '../services/tarif.service';
import { AuditService } from '../services/audit.service';
import { EmailService } from '../services/email.service';
import { WebSocketManager } from '../websocket/server';

// ✅ RG3 (CDC Annexe 3) : l'acompte demandé au client doit être d'au moins 30%
// du montant total. La gérante peut choisir un taux plus élevé (ex : 50% pour
// les groupes) mais jamais en dessous de ce plancher.
const TAUX_ACOMPTE_MIN = 30;

export class ReservationsController {
  private tarifService = new TarifService();
  private auditService = new AuditService();
  private emailService = new EmailService();

  private async synchroniserStatutChambre(chambreId: number) {
    const chambre = await Room.findByPk(chambreId);
    if (!chambre) return;

    if (
      chambre.statut === StatutChambre.EN_MAINTENANCE ||
      chambre.statut === StatutChambre.HORS_SERVICE ||
      chambre.statut === StatutChambre.BLOQUEE
    ) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reservationActive = await Reservation.count({
      where: {
        chambreId,
        statut: { [Op.in]: ['CONFIRMEE', 'EN_ATTENTE_ACOMPTE'] },
        dateArrivee: { [Op.lte]: today },
        dateDepart: { [Op.gt]: today }
      }
    });

    const nouveauStatut = reservationActive > 0 ? StatutChambre.OCCUPEE : StatutChambre.DISPONIBLE;
    if (chambre.statut !== nouveauStatut) {
      await chambre.update({ statut: nouveauStatut });
    }
  }

  getAll = async (req: Request, res: Response) => {
    try {
      const { statut, dateDebut, dateFin, search } = req.query;

      const where: any = {};

      if (statut) {
        where.statut = statut;
      }

      if (dateDebut && dateFin) {
        where.dateArrivee = { [Op.gte]: dateDebut };
        where.dateDepart = { [Op.lte]: dateFin };
      }

      if (search) {
        where[Op.or] = [
          { numero: { [Op.iLike]: `%${search}%` } },
          { '$client.nom$': { [Op.iLike]: `%${search}%` } },
          { '$client.prenom$': { [Op.iLike]: `%${search}%` } }
        ];
      }

      const reservations = await Reservation.findAll({
        where,
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' },
          { model: Payment, as: 'paiements' }
        ],
        order: [['dateArrivee', 'ASC']]
      });

      const formattedData = reservations.map(r => ({
        id: r.id,
        numero: r.numero,
        numeroReservation: r.numero,
        dateArrivee: r.dateArrivee,
        dateDepart: r.dateDepart,
        nbAdultes: r.nbAdultes,
        nbEnfants: r.nbEnfants || 0,
        nbNuits: r.nbNuits || 1,
        statut: r.statut,
        petitDejeunerInclus: r.petitDejeunerInclus || false,
        montantTotal: r.montantTotal,
        montantAcompte: r.montantAcompte || 0,
        montantSolde: r.montantSolde || 0,
        montantRestantDu: r.montantRestantDu || 0,
        typeAcompte: r.typeAcompte || 30,
        demandeSpeciale: r.demandesSpeciales,
        heureArriveePrevisionnelle: r.horaireArriveeTardive,
        litBebe: r.litBebe || false,
        arriveeTardive: !!r.horaireArriveeTardive,
        dateCreation: r.createdAt,
        motifAnnulation: r.motifAnnulation,
        client_prenom: r.client?.prenom || '',
        client_nom: r.client?.nom || '',
        client_email: r.client?.email || '',
        client_telephone: r.client?.telephone || '',
        chambre_nom: r.chambre?.nom || '',
        chambre_numero: r.chambre?.numero || '',
        chambre_id: r.chambreId,
        client_id: r.clientId,
        statut_paiement: r.statutPaiement || 'EN_ATTENTE',
        groupe: r.groupe || false,
        services: [],
        paiements: r.paiements || []
      }));

      return res.status(200).json({
        success: true,
        data: formattedData
      });

    } catch (error) {
      console.error('❌ Erreur getAll:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des réservations'
      });
    }
  };

  getArriveesJour = async (req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const reservations = await Reservation.findAll({
        where: {
          dateArrivee: today,
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        },
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ],
        order: [['horaireArriveeTardive', 'ASC']]
      });

      const formattedData = reservations.map(r => ({
        id: r.id,
        client_prenom: r.client?.prenom || '',
        client_nom: r.client?.nom || '',
        chambre_nom: r.chambre?.nom || '',
        nbNuits: r.nbNuits || 1,
        statut: r.statut
      }));

      return res.status(200).json({
        success: true,
        data: formattedData
      });

    } catch (error) {
      console.error('❌ Erreur getArriveesJour:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des arrivées'
      });
    }
  };

  getDepartsJour = async (req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const reservations = await Reservation.findAll({
        where: {
          dateDepart: today,
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        },
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      return res.status(200).json({
        success: true,
        data: reservations
      });

    } catch (error) {
      console.error('❌ Erreur getDepartsJour:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des départs'
      });
    }
  };

  getProchains7Jours = async (req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

      const reservations = await Reservation.findAll({
        where: {
          dateArrivee: { [Op.between]: [today, sevenDaysLater] },
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        },
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ],
        order: [['dateArrivee', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: reservations
      });

    } catch (error) {
      console.error('❌ Erreur getProchains7Jours:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération'
      });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const reservation = await Reservation.findByPk(id, {
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' },
          { model: Payment, as: 'paiements' },
          { model: Cancellation, as: 'annulation' },
          {
            model: ReservationHistory,
            as: 'historiques',
            limit: 10,
            order: [['dateAction', 'DESC']]
          }
        ]
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Réservation non trouvée'
        });
      }

      const formattedData = {
        id: reservation.id,
        numero: reservation.numero,
        numeroReservation: reservation.numero,
        dateArrivee: reservation.dateArrivee,
        dateDepart: reservation.dateDepart,
        nbAdultes: reservation.nbAdultes,
        nbEnfants: reservation.nbEnfants || 0,
        nbNuits: reservation.nbNuits || 1,
        statut: reservation.statut,
        petitDejeunerInclus: reservation.petitDejeunerInclus || false,
        montantTotal: reservation.montantTotal,
        montantAcompte: reservation.montantAcompte || 0,
        montantSolde: reservation.montantSolde || 0,
        montantRestantDu: reservation.montantRestantDu || 0,
        typeAcompte: reservation.typeAcompte || 30,
        demandeSpeciale: reservation.demandesSpeciales,
        heureArriveePrevisionnelle: reservation.horaireArriveeTardive,
        litBebe: reservation.litBebe || false,
        arriveeTardive: !!reservation.horaireArriveeTardive,
        dateCreation: reservation.createdAt,
        motifAnnulation: reservation.motifAnnulation,
        client: reservation.client,
        chambre: reservation.chambre,
        paiements: reservation.paiements || [],
        services: [],
        annulation: reservation.annulation,
        historiques: reservation.historiques || []
      };

      return res.status(200).json({
        success: true,
        data: formattedData
      });

    } catch (error) {
      console.error('❌ Erreur getById:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération'
      });
    }
  };

  /**
   * ✅ CORRECTION — la simulation utilisait resultat.totalTTC en oubliant la
   * taxe de séjour (resultat.montantTotal = totalTTC + taxeSejour), et
   * dupliquait toute la logique de code promo (avec des risques d'incohérence
   * avec create()). On délègue maintenant entièrement le code promo à
   * TarifService.calculerTarif(), qui utilise les vrais champs du modèle
   * PromoCode et vérifie aussi nbUtilisationsMax (jamais vérifié avant !).
   */
  calculer = async (req: Request, res: Response) => {
    try {
      console.log('📥 calculer - Body reçu:', req.body);

      const {
        chambreId, dateArrivee, dateDepart, nbAdultes, nbEnfants,
        petitDejeuner, nbVelos, litBebe, codePromo,
        chambre_id, date_arrivee, date_depart, nb_adultes, nb_enfants,
        petit_dejeuner, nb_velos, lit_bebe, code_promo
      } = req.body;

      const finalChambreId = chambreId || chambre_id;
      const finalDateArrivee = dateArrivee || date_arrivee;
      const finalDateDepart = dateDepart || date_depart;
      const finalNbAdultes = parseInt(nbAdultes || nb_adultes || 1);
      const finalNbEnfants = parseInt(nbEnfants || nb_enfants || 0);
      const finalPetitDejeuner = petitDejeuner !== undefined ? petitDejeuner : (petit_dejeuner || false);
      const finalNbVelos = parseInt(nbVelos || nb_velos || 0);
      const finalLitBebe = litBebe !== undefined ? litBebe : (lit_bebe || false);
      const finalCodePromo = codePromo || code_promo || null;

      if (!finalChambreId || !finalDateArrivee || !finalDateDepart) {
        return res.status(400).json({
          success: false,
          message: 'chambreId, dateArrivee et dateDepart sont requis'
        });
      }

      const chambre = await Room.findByPk(finalChambreId);
      if (!chambre) {
        return res.status(404).json({
          success: false,
          message: 'Chambre non trouvée'
        });
      }

      // ✅ Le code promo est validé et appliqué DANS TarifService (appliquerUsage=false
      // car ceci n'est qu'une simulation : on ne consomme jamais le quota d'usages ici).
      let resultat;
      try {
        resultat = await this.tarifService.calculerTarif(
          finalChambreId,
          finalDateArrivee,
          finalDateDepart,
          finalNbAdultes,
          finalNbEnfants,
          finalPetitDejeuner,
          finalCodePromo,
          false
        );
      } catch (e) {
        return res.status(400).json({ success: false, message: (e as Error).message });
      }

      const nbNuits = resultat.detail?.nbNuits || 1;
      const supplementVelos = finalNbVelos * 10 * nbNuits;
      const supplementLitBebe = 0;

      // ✅ CORRECTION — resultat.montantTotal inclut la taxe de séjour,
      // contrairement à resultat.totalTTC utilisé auparavant (qui l'omettait).
      const totalFinal = resultat.montantTotal + supplementVelos + supplementLitBebe;
      const reductionPromo = resultat.codePromoApplique?.reduction || 0;

      return res.status(200).json({
        success: true,
        data: {
          total: Math.round(totalFinal * 100) / 100,
          totalTTC: Math.round(resultat.totalTTC * 100) / 100,
          totalHT: Math.round(resultat.totalHT * 100) / 100,
          montantTVA: Math.round(resultat.montantTVA * 100) / 100,
          taxeSejour: Math.round(resultat.taxeSejour * 100) / 100,
          supplementVelos: Math.round(supplementVelos * 100) / 100,
          supplementLitBebe: Math.round(supplementLitBebe * 100) / 100,
          reductionPromo: Math.round(reductionPromo * 100) / 100,
          promoApplied: resultat.codePromoApplique,
          detail: {
            ...resultat.detail,
            prixNuitFinal: Math.round((resultat.detail?.prixNuitFinal || 0) * 100) / 100,
            prixMoyenNuit: Math.round((resultat.detail?.prixMoyenNuit || 0) * 100) / 100,
            prixBaseParNuit: Math.round((resultat.detail?.prixBaseParNuit || 0) * 100) / 100,
            sousTotalHebergement: Math.round((resultat.detail?.sousTotalHebergement || 0) * 100) / 100,
            prixPetitDejeunerHT: Math.round((resultat.detail?.prixPetitDejeunerHT || 0) * 100) / 100,
            prixEnfantsHT: Math.round((resultat.detail?.prixEnfantsHT || 0) * 100) / 100,
            prixLitsSuppHT: Math.round((resultat.detail?.prixLitsSuppHT || 0) * 100) / 100,
            nbNuits,
            saison: resultat.detail?.saison || 'MOYENNE',
            detailNuits: resultat.detail?.detailNuits || []
          },
          reservation: {
            chambreId: finalChambreId,
            chambreNom: chambre.nom,
            dateArrivee: finalDateArrivee,
            dateDepart: finalDateDepart,
            nbAdultes: finalNbAdultes,
            nbEnfants: finalNbEnfants,
            nbNuits,
            petitDejeuner: finalPetitDejeuner,
            nbVelos: finalNbVelos,
            litBebe: finalLitBebe
          },
          // ✅ Purement indicatif : le vrai acompte minimum (RG3, ≥30%) est
          // recalculé et imposé à la création dans create().
          acompte: Math.round(totalFinal * (TAUX_ACOMPTE_MIN / 100) * 100) / 100,
          solde: Math.round(totalFinal * (1 - TAUX_ACOMPTE_MIN / 100) * 100) / 100
        }
      });

    } catch (error) {
      console.error('❌ Erreur calculer:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du calcul: ' + (error as Error).message
      });
    }
  };

  /**
   * ✅ CORRECTIONS MAJEURES apportées à create() :
   *
   * 1) RG1 (§Annexe 3, US-07 "vérification simultanée") : la vérification de
   *    disponibilité et la création de la réservation se faisaient sans
   *    transaction ni verrou, exposant à une double-réservation en cas de
   *    requêtes concurrentes sur la même chambre/période. Tout est désormais
   *    encapsulé dans une transaction Sequelize avec verrouillage de ligne.
   *
   * 2) RG3 (acompte ≥ 30%) : `typeAcompte` pouvait être fourni à n'importe
   *    quelle valeur entre 0 et 100 (`Math.min(Math.max(finalTypeAcompte||30,0),100)`),
   *    permettant un acompte de 0% ou 10%. On impose maintenant un minimum de
   *    30% (TAUX_ACOMPTE_MIN), avec rejet explicite sinon.
   *
   * 3) BUG CRITIQUE : la réservation était créée directement avec
   *    `statutPaiement = ACOMPTE_RECU` (voire `statut = CONFIRMEE` si
   *    typeAcompte >= 100) alors qu'AUCUN paiement n'a encore été enregistré
   *    dans la table Payment à ce stade ! Cela cassait complètement les
   *    alertes §3.4.2 (UC_AlerteAcompte / UC_Impayes dans paiements.controller),
   *    qui ne voyaient jamais ces réservations comme "en attente". Désormais,
   *    toute nouvelle réservation démarre systématiquement à
   *    EN_ATTENTE_ACOMPTE / ACOMPTE_EN_ATTENTE ; c'est
   *    paiements.controller.updateReservationPaymentStatus() qui la fera
   *    passer à CONFIRMEE / ACOMPTE_RECU quand un vrai paiement sera enregistré.
   *
   * 4) Taxe de séjour oubliée du montantTotal stocké (resultat.totalTTC au
   *    lieu de resultat.montantTotal) — corrigé.
   *
   * 5) Code promo : logique dupliquée et jamais bornée par nbUtilisationsMax,
   *    désormais centralisée dans TarifService (appliquerUsage=true ici
   *    puisque la réservation est réellement créée).
   */
  create = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
      console.log('📥 Création réservation - Body:', req.body);

      const {
        clientId, chambreId, dateArrivee, dateDepart, nbAdultes, nbEnfants,
        agesEnfants, demandesSpeciales, horaireArriveeTardive, litBebe,
        petitDejeunerInclus, codePromo, canalAcquisition, commentaire,
        groupe, nbVelos, typeAcompte,
        client_id, chambre_id, date_arrivee, date_depart, nb_adultes, nb_enfants,
        ages_enfants, demandes_speciales, horaire_arrivee_tardive, lit_bebe,
        petit_dejeuner_inclus, code_promo, canal_acquisition, nb_velos,
        type_acompte
      } = req.body;

      const finalClientId = clientId || client_id;
      const finalChambreId = chambreId || chambre_id;
      const finalDateArrivee = dateArrivee || date_arrivee;
      const finalDateDepart = dateDepart || date_depart;
      const finalNbAdultes = parseInt(nbAdultes || nb_adultes || 1);
      const finalNbEnfants = parseInt(nbEnfants || nb_enfants || 0);
      const finalAgesEnfants = agesEnfants || ages_enfants || '';
      const finalDemandesSpeciales = demandesSpeciales || demandes_speciales || '';
      const finalHoraireArriveeTardive = horaireArriveeTardive || horaire_arrivee_tardive;
      const finalLitBebe = litBebe !== undefined ? litBebe : (lit_bebe || false);
      const finalPetitDejeunerInclus = petitDejeunerInclus !== undefined ? petitDejeunerInclus : (petit_dejeuner_inclus || false);
      const finalCodePromo = codePromo || code_promo || null;
      const finalCanalAcquisition = canalAcquisition || canal_acquisition || 'DIRECT';
      const finalCommentaire = commentaire || '';
      const finalGroupe = groupe || false;
      const finalNbVelos = parseInt(nbVelos || nb_velos || 0);
      const finalTypeAcompte = parseInt(typeAcompte || type_acompte || TAUX_ACOMPTE_MIN);

      const userId = (req as any).user?.id;

      if (!finalClientId || !finalChambreId || !finalDateArrivee || !finalDateDepart) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'clientId, chambreId, dateArrivee et dateDepart sont requis'
        });
      }

      // ✅ RG3 — refus explicite d'un acompte en dessous du minimum légal du gîte
      if (finalTypeAcompte < TAUX_ACOMPTE_MIN || finalTypeAcompte > 100) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Le taux d'acompte doit être compris entre ${TAUX_ACOMPTE_MIN}% et 100% (RG3)`
        });
      }

      const chambre = await Room.findByPk(finalChambreId, { transaction: t });
      if (!chambre) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Chambre non trouvée'
        });
      }

      const client = await Client.findByPk(finalClientId, { transaction: t });
      if (!client) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: 'Client non trouvé'
        });
      }

      // ✅ RG1 — vérification de disponibilité + verrou de ligne dans la MÊME
      // transaction que la création, pour empêcher deux requêtes concurrentes
      // de réserver la même chambre sur des dates chevauchantes (US-07 §8.1).
      const existingReservation = await Reservation.findOne({
        where: {
          chambreId: finalChambreId,
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] },
          [Op.or]: [
            {
              dateArrivee: { [Op.lt]: finalDateDepart },
              dateDepart: { [Op.gt]: finalDateArrivee }
            }
          ]
        },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (existingReservation) {
        await t.rollback();
        return res.status(409).json({
          success: false,
          message: 'Cette chambre n\'est pas disponible sur cette période'
        });
      }

      // ✅ Code promo entièrement géré par TarifService (validation +
      // nbUtilisationsMax + incrémentation réelle car appliquerUsage=true)
      let resultat;
      try {
        resultat = await this.tarifService.calculerTarif(
          finalChambreId,
          finalDateArrivee,
          finalDateDepart,
          finalNbAdultes,
          finalNbEnfants,
          finalPetitDejeunerInclus,
          finalCodePromo,
          true
        );
      } catch (e) {
        await t.rollback();
        return res.status(400).json({ success: false, message: (e as Error).message });
      }

      const nbNuits = resultat.detail?.nbNuits || 1;
      const supplementVelos = finalNbVelos * 10 * nbNuits;
      // ✅ CORRECTION — resultat.montantTotal (et non resultat.totalTTC) pour
      // inclure la taxe de séjour dans le montant réellement dû.
      const montantTotal = resultat.montantTotal + supplementVelos;

      const codePromoId = resultat.codePromoApplique?.id;
      const reductionPromo = resultat.codePromoApplique?.reduction || 0;

      const pourcentageAcompte = finalTypeAcompte;
      const montantAcompte = montantTotal * (pourcentageAcompte / 100);
      const montantSolde = montantTotal - montantAcompte;

      // ✅ CORRECTION CRITIQUE (RG3) — une réservation ne peut être CONFIRMEE
      // / avoir un statutPaiement ACOMPTE_RECU que lorsqu'un paiement réel a
      // été enregistré (voir paiements.controller.updateReservationPaymentStatus).
      // À la création, aucun paiement n'existe encore : la réservation démarre
      // TOUJOURS en attente, quel que soit le taux d'acompte demandé.
      const statutInitial = StatutReservation.EN_ATTENTE_ACOMPTE;
      const statutPaiementInitial = StatutPaiement.ACOMPTE_EN_ATTENTE;

      const year = new Date().getFullYear();
      const count = (await Reservation.count({ transaction: t })) + 1;
      const numero = `RES-${year}-${String(count).padStart(4, '0')}`;

      const reservation = await Reservation.create(
        {
          numero,
          clientId: finalClientId,
          chambreId: finalChambreId,
          dateArrivee: finalDateArrivee,
          dateDepart: finalDateDepart,
          nbAdultes: finalNbAdultes,
          nbEnfants: finalNbEnfants,
          agesEnfants: finalAgesEnfants || undefined,
          demandesSpeciales: finalDemandesSpeciales || undefined,
          horaireArriveeTardive: finalHoraireArriveeTardive || undefined,
          litBebe: finalLitBebe,
          petitDejeunerInclus: finalPetitDejeunerInclus,
          montantTotal: Math.round(montantTotal * 100) / 100,
          montantAcompte: Math.round(montantAcompte * 100) / 100,
          montantSolde: Math.round(montantSolde * 100) / 100,
          montantPenalite: 0,
          statut: statutInitial,
          statutPaiement: statutPaiementInitial,
          creePar: userId,
          notesInternes: finalCommentaire || undefined,
          codePromoId: codePromoId,
          nbVelos: finalNbVelos,
          groupe: finalGroupe,
          canalAcquisition: finalCanalAcquisition,
          // ✅ Le taux d'acompte choisi (30% par défaut, ou plus, ex. 50% pour
          // un groupe) est conservé pour être réutilisé tel quel lors d'une
          // modification ultérieure (voir correction dans update()).
          typeAcompte: pourcentageAcompte
        },
        { transaction: t }
      );

      await reservation.reload({ transaction: t });

      await ReservationHistory.create(
        {
          reservationId: reservation.id,
          action: 'CREATE',
          nouvelleValeur: {
            statut: statutInitial,
            montantTotal,
            typeAcompte: pourcentageAcompte,
            montantAcompte: Math.round(montantAcompte * 100) / 100
          },
          utilisateurId: userId
        },
        { transaction: t }
      );

      await t.commit();

      // ── Effets de bord après commit (chambre, WebSocket, email) ─────
      await this.synchroniserStatutChambre(finalChambreId);

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        const reservationWithClient = await Reservation.findByPk(reservation.id, {
          include: [
            { model: Client, as: 'client' },
            { model: Room, as: 'chambre' }
          ]
        });
        wsManager.emitReservationCreated(reservationWithClient || reservation);

        wsManager.broadcastToAll({
          type: 'REFRESH_CHAMBRES',
          data: { reason: 'reservation_created', timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
      }

      try {
        await this.emailService.envoyerConfirmation(reservation.id);
      } catch (emailError) {
        console.warn('⚠️ Email non envoyé:', emailError);
      }

      return res.status(201).json({
        success: true,
        message: 'Réservation créée avec succès',
        data: {
          reservation: {
            id: reservation.id,
            numero: reservation.numero,
            dateArrivee: reservation.dateArrivee,
            dateDepart: reservation.dateDepart,
            nbAdultes: reservation.nbAdultes,
            nbEnfants: reservation.nbEnfants,
            nbNuits: reservation.nbNuits || 1,
            statut: reservation.statut,
            montantTotal: reservation.montantTotal,
            montantAcompte: reservation.montantAcompte,
            montantSolde: reservation.montantSolde,
            montantRestantDu: reservation.montantRestantDu || 0,
            typeAcompte: reservation.typeAcompte,
            client_prenom: client.prenom,
            client_nom: client.nom,
            client_email: client.email,
            client_telephone: client.telephone,
            chambre_nom: chambre.nom,
            chambre_numero: chambre.numero
          },
          montantAcompte: Math.round(montantAcompte * 100) / 100,
          montantRestant: Math.round((montantTotal - montantAcompte) * 100) / 100,
          reductionPromo: Math.round(reductionPromo * 100) / 100,
          supplementVelos: Math.round(supplementVelos * 100) / 100,
          pourcentageAcompte: pourcentageAcompte
        }
      });

    } catch (error) {
      await t.rollback();
      console.error('❌ Erreur create:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création: ' + (error as Error).message
      });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = (req as any).user?.id;

      const {
        dateArrivee, dateDepart, nbAdultes, nbEnfants, agesEnfants,
        demandesSpeciales, horaireArriveeTardive, litBebe,
        petitDejeunerInclus, commentaire, groupe, nbVelos, statut
      } = req.body;

      const reservation = await Reservation.findByPk(id, {
        include: [{ model: Client, as: 'client' }, { model: Room, as: 'chambre' }]
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Réservation non trouvée'
        });
      }

      if (reservation.statut === 'ANNULEE' || reservation.statut === 'NO_SHOW') {
        return res.status(400).json({
          success: false,
          message: 'Cette réservation ne peut pas être modifiée'
        });
      }

      const ancienneValeur = reservation.toJSON();

      if (dateArrivee && dateDepart) {
        const conflict = await Reservation.findOne({
          where: {
            chambreId: reservation.chambreId,
            id: { [Op.ne]: id },
            statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] },
            [Op.or]: [
              { dateArrivee: { [Op.lt]: dateDepart }, dateDepart: { [Op.gt]: dateArrivee } }
            ]
          }
        });

        if (conflict) {
          return res.status(409).json({
            success: false,
            message: 'Cette chambre n\'est pas disponible sur cette période'
          });
        }

        const resultat = await this.tarifService.calculerTarif(
          reservation.chambreId,
          dateArrivee,
          dateDepart,
          nbAdultes || reservation.nbAdultes,
          nbEnfants || reservation.nbEnfants,
          petitDejeunerInclus !== undefined ? petitDejeunerInclus : reservation.petitDejeunerInclus
        );

        const nbNuits = resultat.detail?.nbNuits || 1;
        const nbVelosFinal = nbVelos !== undefined ? nbVelos : (reservation.nbVelos || 0);
        const supplementVelos = nbVelosFinal * 10 * nbNuits;
        // ✅ CORRECTION — resultat.montantTotal inclut la taxe de séjour
        // (au lieu de resultat.totalTTC qui l'omettait).
        const montantTotal = resultat.montantTotal + supplementVelos;

        // ✅ CORRECTION — on réutilise le taux d'acompte D'ORIGINE de la
        // réservation (reservation.typeAcompte, ex. 50% pour un groupe) au
        // lieu de recalculer avec un 30% figé en dur, ce qui écrasait le
        // choix initial de l'employé à chaque modification de dates.
        const tauxAcompte = reservation.typeAcompte || TAUX_ACOMPTE_MIN;

        reservation.montantTotal = Math.round(montantTotal * 100) / 100;
        reservation.montantAcompte = Math.round(montantTotal * (tauxAcompte / 100) * 100) / 100;
        reservation.montantSolde = Math.round((montantTotal - reservation.montantAcompte) * 100) / 100;
        reservation.dateArrivee = dateArrivee;
        reservation.dateDepart = dateDepart;
      }

      if (nbAdultes !== undefined && nbAdultes > 0) reservation.nbAdultes = nbAdultes;
      if (nbEnfants !== undefined && nbEnfants >= 0) reservation.nbEnfants = nbEnfants;
      if (agesEnfants !== undefined && agesEnfants !== '') reservation.agesEnfants = agesEnfants;
      if (demandesSpeciales !== undefined) reservation.demandesSpeciales = demandesSpeciales;
      if (horaireArriveeTardive !== undefined) reservation.horaireArriveeTardive = horaireArriveeTardive;
      if (litBebe !== undefined) reservation.litBebe = litBebe;
      if (petitDejeunerInclus !== undefined) reservation.petitDejeunerInclus = petitDejeunerInclus;
      if (commentaire !== undefined) reservation.notesInternes = commentaire;
      if (groupe !== undefined) reservation.groupe = groupe;
      if (nbVelos !== undefined && nbVelos >= 0) reservation.nbVelos = nbVelos;
      if (statut) reservation.statut = statut as StatutReservation;

      reservation.dateModification = new Date();
      await reservation.save();

      await ReservationHistory.create({
        reservationId: reservation.id,
        action: 'UPDATE',
        ancienneValeur,
        nouvelleValeur: reservation.toJSON(),
        utilisateurId: userId
      });

      await this.synchroniserStatutChambre(reservation.chambreId);

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        const oldChambreId = ancienneValeur.chambreId;
        const updatedReservation = await Reservation.findByPk(id, {
          include: [
            { model: Client, as: 'client' },
            { model: Room, as: 'chambre' }
          ]
        });
        wsManager.emitReservationUpdated(updatedReservation || reservation, oldChambreId);
      }

      return res.status(200).json({
        success: true,
        message: 'Réservation mise à jour avec succès',
        data: reservation
      });

    } catch (error) {
      console.error('❌ Erreur update:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour: ' + (error as Error).message
      });
    }
  };

  cancel = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { motif } = req.body;
      const userId = (req as any).user?.id;

      const reservation = await Reservation.findByPk(id, {
        include: [{ model: Payment, as: 'paiements' }]
      });

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Réservation non trouvée'
        });
      }

      if (reservation.statut === 'ANNULEE') {
        return res.status(400).json({
          success: false,
          message: 'Cette réservation est déjà annulée'
        });
      }

      const today = new Date();
      const arrivee = new Date(reservation.dateArrivee);
      const joursAvantArrivee = Math.ceil((arrivee.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let penalite = 0;
      let modePenalite: ModePenalite = ModePenalite.GRATUITE;

      if (joursAvantArrivee > 7) {
        penalite = 0;
        modePenalite = ModePenalite.GRATUITE;
      } else if (joursAvantArrivee >= 2 && joursAvantArrivee <= 7) {
        penalite = reservation.montantTotal * 0.5;
        modePenalite = ModePenalite.CINQUANTE_POURCENT;
      } else if (joursAvantArrivee < 2 && joursAvantArrivee >= 0) {
        penalite = reservation.montantTotal;
        modePenalite = ModePenalite.CENT_POURCENT;
      } else {
        penalite = reservation.montantTotal;
        modePenalite = ModePenalite.CENT_POURCENT;
      }

      await reservation.update({
        statut: StatutReservation.ANNULEE,
        montantPenalite: Math.round(penalite * 100) / 100,
        dateModification: new Date(),
        motifAnnulation: motif || 'Annulation par le client'
      });

      await Cancellation.create({
        reservationId: reservation.id,
        motif: motif || 'Annulation par le client',
        penaliteAppliquee: Math.round(penalite * 100) / 100,
        modePenalite,
        annulePar: userId
      });

      await ReservationHistory.create({
        reservationId: reservation.id,
        action: 'CANCEL',
        ancienneValeur: { statut: reservation.statut },
        nouvelleValeur: { statut: StatutReservation.ANNULEE, penalite: Math.round(penalite * 100) / 100 },
        utilisateurId: userId
      });

      await this.synchroniserStatutChambre(reservation.chambreId);

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        const cancelledReservation = await Reservation.findByPk(id, {
          include: [
            { model: Client, as: 'client' },
            { model: Room, as: 'chambre' }
          ]
        });
        wsManager.emitReservationCancelled(cancelledReservation || reservation);
      }

      return res.status(200).json({
        success: true,
        message: 'Réservation annulée avec succès',
        data: {
          reservation,
          penalite: Math.round(penalite * 100) / 100,
          modePenalite,
          joursAvantArrivee
        }
      });

    } catch (error) {
      console.error('❌ Erreur cancel:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'annulation: ' + (error as Error).message
      });
    }
  };

  supprimer = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = (req as any).user?.id;

      const reservation = await Reservation.findByPk(id);

      if (!reservation) {
        return res.status(404).json({
          success: false,
          message: 'Réservation non trouvée'
        });
      }

      const statutsAutorises = ['ANNULEE', 'TERMINEE', 'NO_SHOW'];
      if (!statutsAutorises.includes(reservation.statut)) {
        return res.status(400).json({
          success: false,
          message: `Impossible de supprimer une réservation avec le statut "${reservation.statut}". Seules les réservations annulées, terminées ou no-show peuvent être supprimées définitivement.`
        });
      }

      const chambreId = reservation.chambreId;
      const reservationData = reservation.toJSON();

      await Payment.destroy({ where: { reservationId: id } });
      await Cancellation.destroy({ where: { reservationId: id } });
      await ReservationHistory.destroy({ where: { reservationId: id } });

      await reservation.destroy();
      await this.synchroniserStatutChambre(chambreId);

      const wsManager = (req as any).wsManager as WebSocketManager;
      if (wsManager) {
        wsManager.emitReservationDeleted(reservationData);
      }

      return res.status(200).json({
        success: true,
        message: 'Réservation supprimée définitivement avec succès',
        data: {
          id: id,
          numero: reservationData.numero,
          statut: reservationData.statut
        }
      });

    } catch (error) {
      console.error('❌ Erreur supprimer:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression: ' + (error as Error).message
      });
    }
  };

  getStatsOccupation = async (req: Request, res: Response) => {
    try {
      const { mois, annee } = req.query;
      const month = parseInt(mois as string) || new Date().getMonth() + 1;
      const year = parseInt(annee as string) || new Date().getFullYear();

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const totalChambres = await Room.count();

      const reservations = await Reservation.findAll({
        where: {
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] },
          dateArrivee: { [Op.lte]: endDate },
          dateDepart: { [Op.gte]: startDate }
        }
      });

      const joursDansMois = endDate.getDate();
      const nuitées = reservations.reduce((total, r) => {
        const arrivee = new Date(r.dateArrivee);
        const depart = new Date(r.dateDepart);
        const nbNuits = Math.ceil((depart.getTime() - arrivee.getTime()) / (1000 * 60 * 60 * 24));
        return total + nbNuits;
      }, 0);

      const tauxOccupation = totalChambres > 0 ? (nuitées / (totalChambres * joursDansMois)) * 100 : 0;
      const totalChiffreAffaires = reservations.reduce((total, r) => total + r.montantTotal, 0);

      return res.status(200).json({
        success: true,
        data: {
          mois: month,
          annee: year,
          totalChambres,
          joursDansMois,
          nuitées,
          tauxOccupation: Math.round(tauxOccupation * 100) / 100,
          chiffreAffaires: Math.round(totalChiffreAffaires * 100) / 100,
          nombreReservations: reservations.length
        }
      });

    } catch (error) {
      console.error('❌ Erreur getStatsOccupation:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du calcul des statistiques'
      });
    }
  };

  getTauxOccupation = async (req: Request, res: Response) => {
    try {
      const { dateDebut, dateFin } = req.query;

      let startDate = dateDebut ? new Date(dateDebut as string) : new Date();
      let endDate = dateFin ? new Date(dateFin as string) : new Date();

      if (!dateDebut) {
        startDate.setDate(1);
      }

      if (!dateFin) {
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
      }

      const totalChambres = await Room.count();

      const reservations = await Reservation.findAll({
        where: {
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] },
          dateArrivee: { [Op.lte]: endDate },
          dateDepart: { [Op.gte]: startDate }
        }
      });

      const totalJours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const nuitées = reservations.reduce((total, r) => {
        const arrivee = new Date(r.dateArrivee);
        const depart = new Date(r.dateDepart);
        const nbNuits = Math.ceil((depart.getTime() - arrivee.getTime()) / (1000 * 60 * 60 * 24));
        return total + nbNuits;
      }, 0);

      const tauxOccupation = (totalChambres * totalJours) > 0 ? (nuitées / (totalChambres * totalJours)) * 100 : 0;

      return res.status(200).json({
        success: true,
        data: {
          dateDebut: startDate,
          dateFin: endDate,
          totalChambres,
          totalJours,
          nuitées,
          tauxOccupation: Math.round(tauxOccupation * 100) / 100
        }
      });

    } catch (error) {
      console.error('❌ Erreur getTauxOccupation:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du calcul du taux d\'occupation'
      });
    }
  };
}