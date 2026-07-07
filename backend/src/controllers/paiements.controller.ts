// backend/src/controllers/paiements.controller.ts
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { Payment, Reservation, Invoice, Client, Room } from '../models';
import { StatutReservation, StatutPaiement } from '../models/Reservation';
import { WebSocketManager } from '../websocket/server';
import { EmailService } from '../services/email.service';
import { TarifService } from '../services/tarif.service';

export type StatutPaiementFrontend = 'EN_ATTENTE' | 'PARTIEL' | 'COMPLET' | 'IMPREVU';

export function mapStatutPaiement(statut: StatutPaiement | string | null | undefined): StatutPaiementFrontend {
  switch (statut) {
    case StatutPaiement.SOLDE_COMPLET:
      return 'COMPLET';
    case StatutPaiement.ACOMPTE_RECU:
    case StatutPaiement.SOLDE_PARTIEL:
      return 'PARTIEL';
    case StatutPaiement.ACOMPTE_EN_ATTENTE:
      return 'EN_ATTENTE';
    default:
      return 'EN_ATTENTE';
  }
}

// ✅ AJOUT — Types d'alerte paiement, alignés sur le diagramme de classes (classe Alerte)
// et sur les cas d'utilisation UC_AlerteAcompte / UC_AlerteAttente / UC_Impayes (§3.4.2).
type TypeAlertePaiement = 'ACOMPTE_NON_RECU' | 'ATTENTE_LONGUE' | 'IMPAYE';
type NiveauAlerte = 'INFO' | 'WARNING' | 'CRITICAL';

interface AlertePaiementCalculee {
  type: TypeAlertePaiement;
  niveau: NiveauAlerte;
  message: string;
}

// ✅ RG3 (CDC Annexe 3) : taux d'acompte minimum par défaut si la réservation
// ne définit pas explicitement son propre tauxAcompteRequis.
const TAUX_ACOMPTE_MIN_DEFAUT = 0.3;

export class PaiementsController {
  private emailService = new EmailService();
  private tarifService = new TarifService();

  /**
   * Synchroniser le statut d'une chambre (RG1 — cohérence disponibilité)
   */
  private async synchroniserStatutChambre(chambreId: number): Promise<void> {
    try {
      const chambre = await Room.findByPk(chambreId);
      if (!chambre) return;

      if (
        chambre.statut === 'EN_MAINTENANCE' ||
        chambre.statut === 'HORS_SERVICE' ||
        chambre.statut === 'BLOQUEE'
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

      const nouveauStatut = reservationActive > 0 ? 'OCCUPEE' : 'DISPONIBLE';
      if (chambre.statut !== nouveauStatut) {
        await chambre.update({ statut: nouveauStatut });
        console.log(`🔄 [sync] Chambre ${chambreId}: ${chambre.statut} → ${nouveauStatut}`);
      }
    } catch (error) {
      console.error('❌ Erreur synchroniserStatutChambre:', error);
    }
  }

  /**
   * ✅ AJOUT — Classification d'une réservation en alerte de paiement (§3.4.2)
   * Sépare clairement :
   *  - ACOMPTE_NON_RECU (CRITICAL)  : aucun acompte reçu, arrivée à ≤ 2 jours (UC_AlerteAcompte, RG3)
   *  - ATTENTE_LONGUE   (WARNING)   : réservation créée depuis > 24h sans acompte (UC_AlerteAttente)
   *  - IMPAYE           (WARNING/CRITICAL) : solde restant dû sur une réservation confirmée
   * Retourne l'alerte la plus urgente pour la réservation, ou null si tout est en ordre.
   */
  private classifierAlertePaiement(reservation: any): AlertePaiementCalculee | null {
    const now = new Date();
    const dateArrivee = new Date(reservation.dateArrivee);
    const joursAvantArrivee = Math.ceil((dateArrivee.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dateCreation = reservation.createdAt ? new Date(reservation.createdAt) : now;
    const heuresDepuisCreation = (now.getTime() - dateCreation.getTime()) / (1000 * 60 * 60);

    const nomClient = `${reservation.client?.prenom || ''} ${reservation.client?.nom || ''}`.trim();

    // 1) Acompte jamais reçu et arrivée imminente (≤ 2 jours) → CRITIQUE (RG3 / UC_AlerteAcompte)
    if (
      reservation.statut === StatutReservation.EN_ATTENTE_ACOMPTE &&
      joursAvantArrivee <= 2 &&
      joursAvantArrivee >= 0
    ) {
      return {
        type: 'ACOMPTE_NON_RECU',
        niveau: 'CRITICAL',
        message: `Acompte non reçu pour ${nomClient} — arrivée dans ${joursAvantArrivee} jour${joursAvantArrivee > 1 ? 's' : ''} (RG3)`
      };
    }

    // 2) Réservation en attente d'acompte depuis plus de 24h → ATTENTION (UC_AlerteAttente)
    if (reservation.statut === StatutReservation.EN_ATTENTE_ACOMPTE && heuresDepuisCreation > 24) {
      return {
        type: 'ATTENTE_LONGUE',
        niveau: 'WARNING',
        message: `Réservation ${reservation.numero} en attente d'acompte depuis plus de 24h (${nomClient})`
      };
    }

    // 3) Solde restant dû sur une réservation déjà confirmée → IMPAYÉ (UC_Impayes)
    const montantRestantDu = Number(reservation.montantRestantDu ?? 0);
    if (montantRestantDu > 0 && reservation.statut === StatutReservation.CONFIRMEE) {
      const montantTotal = Number(reservation.montantTotal) || 1;
      const niveau: NiveauAlerte = montantRestantDu > montantTotal * 0.5 ? 'CRITICAL' : 'WARNING';
      return {
        type: 'IMPAYE',
        niveau,
        message: `Solde restant dû pour ${nomClient} : ${montantRestantDu.toFixed(2)}€`
      };
    }

    return null;
  }

  private async updateReservationPaymentStatus(reservationId: number, transaction: any) {
    const paiements = await Payment.findAll({
      where: { reservationId },
      transaction
    });
    const totalPaye = paiements.reduce((sum, p) => sum + Number(p.montant), 0);

    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Client, as: 'client' }],
      transaction
    });
    if (!reservation) return null;

    const montantTotal = Number(reservation.montantTotal) || 0;
    const montantAcompteRequis = Number(reservation.montantAcompte) || 0;
    const montantRestantDu = Math.max(0, Math.round((montantTotal - totalPaye) * 100) / 100);

    let statutPaiement: StatutPaiement = StatutPaiement.ACOMPTE_EN_ATTENTE;
    if (totalPaye >= montantTotal && montantTotal > 0) {
      statutPaiement = StatutPaiement.SOLDE_COMPLET;
    } else if (totalPaye >= montantAcompteRequis && montantAcompteRequis > 0) {
      statutPaiement = StatutPaiement.ACOMPTE_RECU;
    } else if (totalPaye > 0) {
      statutPaiement = StatutPaiement.SOLDE_PARTIEL;
    }

    const etaitEnAttente = reservation.statut === StatutReservation.EN_ATTENTE_ACOMPTE;

    await reservation.update(
      {
        statutPaiement,
        montantSolde: Math.max(0, Math.round((montantTotal - montantAcompteRequis) * 100) / 100),
        // ✅ RG3 : la réservation passe CONFIRMEE dès que l'acompte (ou plus) est reçu,
        // pas seulement quand le solde est à 100%.
        statut:
          etaitEnAttente && totalPaye >= montantAcompteRequis && montantAcompteRequis > 0
            ? StatutReservation.CONFIRMEE
            : reservation.statut
      },
      { transaction }
    );

    if (etaitEnAttente && reservation.statut === StatutReservation.CONFIRMEE) {
      await this.synchroniserStatutChambre(reservation.chambreId);

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'RESERVATION_CONFIRMED',
        data: {
          reservationId: reservation.id,
          chambreId: reservation.chambreId,
          clientNom: reservation.client?.nom || '',
          clientPrenom: reservation.client?.prenom || ''
        },
        timestamp: new Date().toISOString()
      });

      console.log(`✅ [Paiement] Réservation ${reservation.numero} confirmée (acompte reçu — RG3)`);
    }

    console.log(
      `💰 [Paiement] Réservation ${reservation.numero}: ${totalPaye}€ / ${montantTotal}€ — statut: ${statutPaiement}`
    );

    return { reservation, totalPaye, montantRestantDu, statutPaiement };
  }

  // ============================================================
  // LISTES
  // ============================================================

  async getAll(req: Request, res: Response) {
    try {
      const paiements = await Payment.findAll({
        include: [
          {
            model: Reservation,
            as: 'reservation',
            include: [
              { model: Client, as: 'client' },
              { model: Room, as: 'chambre' }
            ]
          }
        ],
        order: [['datePaiement', 'DESC']]
      });

      return res.status(200).json({ success: true, data: paiements });
    } catch (error) {
      console.error('❌ Erreur getAll paiements:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des paiements' });
    }
  }

  /**
   * ✅ CORRECTION — getImpayes ne se limitait qu'aux réservations proches de l'arrivée
   * (≤ 2 jours) avec ACOMPTE_EN_ATTENTE ou SOLDE_PARTIEL, ce qui ratait le cas
   * "réservation en attente d'acompte depuis > 24h" mais dont l'arrivée est encore
   * lointaine (UC_AlerteAttente, §3.4.2). On élargit la requête puis on classe
   * chaque réservation avec classifierAlertePaiement() pour exposer un niveau
   * d'urgence explicite au frontend (au lieu de le recalculer côté client).
   */
  async getImpayes(req: Request, res: Response) {
    try {
      const reservations = await Reservation.findAll({
        where: {
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW', 'TERMINEE'] },
          [Op.or]: [
            { statutPaiement: { [Op.in]: ['ACOMPTE_EN_ATTENTE', 'SOLDE_PARTIEL'] } },
            { statut: StatutReservation.EN_ATTENTE_ACOMPTE }
          ]
        },
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' },
          { model: Payment, as: 'paiements' }
        ]
      });

      const data = reservations
        .map(r => {
          const alerte = this.classifierAlertePaiement(r);
          return {
            ...r.toJSON(),
            statutPaiementFrontend: mapStatutPaiement(r.statutPaiement),
            alerte
          };
        })
        // On ne retient que les réservations qui déclenchent réellement une alerte,
        // pour ne pas polluer la liste "impayés" avec des dossiers sans urgence.
        .filter(r => r.alerte !== null);

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('❌ Erreur getImpayes:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des impayés' });
    }
  }

  async getTresorerie(req: Request, res: Response) {
    try {
      const { mois, annee } = req.query;
      const month = parseInt(mois as string) || new Date().getMonth() + 1;
      const year = parseInt(annee as string) || new Date().getFullYear();

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const paiements = await Payment.findAll({
        where: { datePaiement: { [Op.between]: [startDate, endDate] } }
      });

      const encaissementsRealises = paiements.reduce((sum, p) => sum + Number(p.montant), 0);

      const reservations = await Reservation.findAll({
        where: {
          dateArrivee: { [Op.between]: [startDate, endDate] },
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        }
      });

      const encaissementsPrevis = reservations.reduce((sum, r) => {
        const paiementsRecus = paiements
          .filter(p => p.reservationId === r.id)
          .reduce((s, p) => s + Number(p.montant), 0);
        return sum + (Number(r.montantTotal) - paiementsRecus);
      }, 0);

      return res.status(200).json({
        success: true,
        data: {
          mois: month,
          annee: year,
          encaissementsRealises: Math.round(encaissementsRealises * 100) / 100,
          encaissementsPrevis: Math.round(encaissementsPrevis * 100) / 100,
          total: Math.round((encaissementsRealises + encaissementsPrevis) * 100) / 100,
          nombrePaiements: paiements.length,
          nombreReservations: reservations.length
        }
      });
    } catch (error) {
      console.error('❌ Erreur getTresorerie:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de la récupération de la trésorerie' });
    }
  }

  async getByReservation(req: Request, res: Response) {
    try {
      const { reservationId } = req.params;

      const paiements = await Payment.findAll({
        where: { reservationId },
        order: [['datePaiement', 'DESC']]
      });

      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      return res.status(200).json({
        success: true,
        data: {
          reservation,
          paiements,
          totalPaye: Math.round(paiements.reduce((sum, p) => sum + Number(p.montant), 0) * 100) / 100
        }
      });
    } catch (error) {
      console.error('❌ Erreur getByReservation:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des paiements' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const paiement = await Payment.findByPk(id, {
        include: [
          {
            model: Reservation,
            as: 'reservation',
            include: [
              { model: Client, as: 'client' },
              { model: Room, as: 'chambre' }
            ]
          }
        ]
      });

      if (!paiement) {
        return res.status(404).json({ success: false, message: 'Paiement non trouvé' });
      }

      return res.status(200).json({ success: true, data: paiement });
    } catch (error) {
      console.error('❌ Erreur getById:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de la récupération' });
    }
  }

  // ============================================================
  // CRÉATION D'UN PAIEMENT (méthode UNIQUE — corrige le doublon)
  // ============================================================

  async create(req: Request, res: Response) {
    const t = await sequelize.transaction();
    try {
      const {
        reservationId,
        montant,
        modePaiement,
        typePaiement,
        reference,
        notes,
        datePaiement,
        numeroCheque,
        banqueEmettrice,
        typeCarte,
        numeroCarteMasque,
        referenceVirement
      } = req.body;
      const userId = (req as any).user?.id;

      // ── Validations métier ──────────────────────────────────
      const montantNum = Number(montant);
      if (!reservationId || !montantNum || montantNum <= 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'reservationId et un montant strictement positif sont requis'
        });
      }
      if (!['ESPECES', 'CARTE', 'VIREMENT', 'CHEQUE'].includes(modePaiement)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Mode de paiement invalide' });
      }
      if (modePaiement === 'CHEQUE' && (!numeroCheque || !banqueEmettrice)) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Numéro de chèque et banque émettrice requis' });
      }
      if (modePaiement === 'VIREMENT' && !referenceVirement) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Référence de virement requise' });
      }

      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ],
        transaction: t
      });

      if (!reservation) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
      }

      if (reservation.statut === 'ANNULEE' || reservation.statut === 'NO_SHOW') {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Impossible d\'enregistrer un paiement sur une réservation annulée ou no-show'
        });
      }

      const paiementsExistants = await Payment.findAll({
        where: { reservationId },
        transaction: t
      });
      const totalPaye = paiementsExistants.reduce((sum, p) => sum + Number(p.montant), 0);

      const montantTotal = Number(reservation.montantTotal) || 0;

      // ════════════════════════════════════════════════════════
      // ✅ AJOUT — RG3 (CDC Annexe 3) : l'acompte doit représenter au
      // moins le taux minimum (30% par défaut, ou reservation.tauxAcompteRequis
      // si la réservation en définit un) du montant total du séjour.
      // On ne vérifie ce seuil que pour le tout premier versement de type
      // ACOMPTE (les versements de type SOLDE ou ARRHES ne sont pas concernés).
      // ════════════════════════════════════════════════════════
      const estPremierAcompte =
        (typePaiement || 'SOLDE') === 'ACOMPTE' &&
        !paiementsExistants.some(p => p.typePaiement === 'ACOMPTE');

      if (estPremierAcompte) {
        const tauxAcompteRequis =
          Number((reservation as any).tauxAcompteRequis) > 0
            ? Number((reservation as any).tauxAcompteRequis)
            : TAUX_ACOMPTE_MIN_DEFAUT;
        const acompteMinimum = Math.round(montantTotal * tauxAcompteRequis * 100) / 100;

        if (montantNum < acompteMinimum) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: `L'acompte doit représenter au moins ${(tauxAcompteRequis * 100).toFixed(
              0
            )}% du montant total, soit ${acompteMinimum.toFixed(2)}€ minimum (RG3)`
          });
        }
      }

      if (Math.round((totalPaye + montantNum) * 100) / 100 > montantTotal) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Le montant total des paiements (${(totalPaye + montantNum).toFixed(2)}€) dépasserait le montant dû (${montantTotal.toFixed(2)}€)`
        });
      }

      const paiementData: any = {
        reservationId,
        montant: montantNum,
        modePaiement,
        typePaiement: typePaiement || 'SOLDE',
        reference: reference || undefined,
        notes: notes || undefined,
        enregistrePar: userId,
        datePaiement: datePaiement ? new Date(datePaiement) : new Date()
      };

      if (modePaiement === 'CHEQUE') {
        paiementData.numeroCheque = numeroCheque;
        paiementData.banqueEmettrice = banqueEmettrice;
      }
      if (modePaiement === 'CARTE') {
        paiementData.typeCarte = typeCarte;
        paiementData.numeroCarteMasque = numeroCarteMasque || '****';
      }
      if (modePaiement === 'VIREMENT') {
        paiementData.referenceVirement = referenceVirement;
        paiementData.banqueEmettrice = banqueEmettrice || '';
      }

      const paiement = await Payment.create(paiementData, { transaction: t });

      const result = await this.updateReservationPaymentStatus(reservationId, t);

      await t.commit();

      // ── Effets de bord après commit (WebSocket, email) ──────
      const wsManager = WebSocketManager.getInstance();
      wsManager.emitPaymentRecorded(reservationId, reservation.chambreId, paiement);
      wsManager.broadcastToAll({
        type: 'REFRESH_CHAMBRES',
        data: { reason: 'payment_recorded', timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        message: 'Paiement enregistré avec succès',
        data: {
          paiement,
          reservation: {
            id: result?.reservation.id,
            numero: result?.reservation.numero,
            statut: result?.reservation.statut,
            statutPaiement: result?.statutPaiement,
            statutPaiementFrontend: mapStatutPaiement(result?.statutPaiement),
            montantRestantDu: result?.montantRestantDu ?? 0
          }
        }
      });
    } catch (error) {
      await t.rollback();
      console.error('❌ Erreur create paiement:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'enregistrement du paiement: ' + (error as Error).message
      });
    }
  }

  // ============================================================
  // FACTURATION (§8.3)
  // ============================================================

  /**
   * ✅ CORRECTION — La facture était générée avec tauxTva et montantTva figés à 0
   * et montantTtc = montantTotal brut, ce qui ne respecte pas le CDC (la TVA
   * hébergement et la taxe de séjour doivent apparaître distinctement, §8.3 et
   * classe Facture du diagramme de classes : montantHT / taxeTouristique / montantTTC).
   * On recalcule désormais le détail via TarifService à partir des données
   * réelles de la réservation, pour obtenir une ventilation HT / TVA / taxe de
   * séjour cohérente avec ce qui a été appliqué à la création de la réservation.
   * Le montant TTC facturé reste toutefois aligné sur reservation.montantTotal
   * (le montant réellement dû par le client), pour ne jamais désynchroniser
   * la facture du montant encaissé.
   */
  async generateFacture(req: Request, res: Response) {
    try {
      const { reservationId } = req.params;
      const userId = (req as any).user?.id;

      const reservation: any = await Reservation.findByPk(reservationId, {
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
      }

      const existingFacture = await Invoice.findOne({ where: { reservationId } });
      if (existingFacture) {
        return res.status(400).json({ success: false, message: 'Une facture existe déjà pour cette réservation' });
      }

      // ✅ Recalcul du détail HT / TVA / taxe de séjour (§8.3). Si la réservation
      // ne porte pas les champs nbEnfants / petitDejeunerInclus (selon le modèle
      // Reservation réellement en place), on retombe sur une facture TTC simple.
      const nbEnfants = Number(reservation.nbEnfants ?? 0);
      const petitDejeunerInclus = Boolean(reservation.petitDejeunerInclus ?? false);

      let detailTarif: Awaited<ReturnType<TarifService['calculerTarif']>> | null = null;
      try {
        detailTarif = await this.tarifService.calculerTarif(
          reservation.chambreId,
          reservation.dateArrivee,
          reservation.dateDepart,
          reservation.nbAdultes,
          nbEnfants,
          petitDejeunerInclus
        );
      } catch (e) {
        console.warn(
          '⚠️ Impossible de recalculer le détail tarifaire pour la facture, bascule sur une facture TTC simple:',
          (e as Error).message
        );
      }

      const montantTotal = Number(reservation.montantTotal) || 0;
      const montantHt = detailTarif ? Math.round(detailTarif.totalHT * 100) / 100 : montantTotal;
      const montantTva = detailTarif ? Math.round(detailTarif.montantTVA * 100) / 100 : 0;
      const tauxTva = detailTarif ? detailTarif.detail.taxes.tauxTVA : 0;
      const taxeSejour = detailTarif ? Math.round(detailTarif.taxeSejour * 100) / 100 : 0;

      const count = await Invoice.count();
      const numero = `FAC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

      const facture = await Invoice.create({
        numero,
        reservationId,
        montantHt,
        tauxTva,
        montantTva,
        // ✅ Le TTC facturé reste le montant réellement dû (montantTotal stocké sur
        // la réservation), la ventilation HT/TVA/taxe de séjour n'étant qu'informative.
        montantTtc: montantTotal,
        // NB : le modèle Invoice actuel ne porte pas de champ dédié pour la taxe de
        // séjour (taxeTouristique du diagramme de classes) — à ajouter en migration
        // si une ligne distincte est requise sur le PDF de facture (§8.3).
        editePar: userId
      });

      return res.status(201).json({
        success: true,
        message: 'Facture générée avec succès',
        data: {
          ...facture.toJSON(),
          detailTarif: detailTarif
            ? {
                montantHt,
                montantTva,
                tauxTva,
                taxeSejour,
                montantTtc: montantTotal
              }
            : null
        }
      });
    } catch (error) {
      console.error('❌ Erreur generateFacture:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de la génération de la facture' });
    }
  }

  async getFacture(req: Request, res: Response) {
    try {
      const { reservationId } = req.params;

      const facture = await Invoice.findOne({
        where: { reservationId },
        include: [
          {
            model: Reservation,
            as: 'reservation',
            include: [
              { model: Client, as: 'client' },
              { model: Room, as: 'chambre' }
            ]
          }
        ]
      });

      if (!facture) {
        return res.status(404).json({ success: false, message: 'Facture non trouvée' });
      }

      return res.status(200).json({ success: true, data: facture });
    } catch (error) {
      console.error('❌ Erreur getFacture:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de la récupération de la facture' });
    }
  }

  // ============================================================
  // RELANCES (§3.4.2 — RG3) — désormais réellement envoyées
  // ============================================================

  /**
   * Relance individuelle. Le CDC (Annexe 3 / §3.4.2) exige une alerte
   * visuelle ; par cohérence produit on envoie aussi un email réel
   * au client via le même service que les confirmations/rappels,
   * et on trace l'envoi (traçabilité RG7 / §4.4).
   */
  async envoyerRelance(req: Request, res: Response) {
    try {
      const { reservationId } = req.params;

      const reservation = await Reservation.findByPk(reservationId, {
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
      }

      if (!reservation.client?.email) {
        return res.status(400).json({ success: false, message: 'Le client n\'a pas d\'adresse email enregistrée' });
      }

      await this.emailService.envoyerRelanceImpaye(reservation.id);

      return res.status(200).json({
        success: true,
        message: `Relance envoyée à ${reservation.client.prenom} ${reservation.client.nom}`,
        data: { reservationId: reservation.id, email: reservation.client.email }
      });
    } catch (error) {
      console.error('❌ Erreur envoyerRelance:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi de la relance' });
    }
  }

  /**
   * Relance groupée. On ne cible désormais que les réservations qui
   * remontent réellement une alerte via classifierAlertePaiement()
   * (ACOMPTE_NON_RECU, ATTENTE_LONGUE ou IMPAYE), au lieu du seul critère
   * "arrivée ≤ 2 jours" qui laissait passer les attentes > 24h (UC_AlerteAttente).
   */
  async alerterImpayes(req: Request, res: Response) {
    try {
      const reservations: any[] = await Reservation.findAll({
        where: {
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW', 'TERMINEE'] },
          [Op.or]: [
            { statutPaiement: { [Op.in]: ['ACOMPTE_EN_ATTENTE', 'SOLDE_PARTIEL'] } },
            { statut: StatutReservation.EN_ATTENTE_ACOMPTE }
          ]
        },
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      const aRelancer = reservations.filter(r => this.classifierAlertePaiement(r) !== null && r.client?.email);

      const resultats = await Promise.allSettled(
        aRelancer.map(r => this.emailService.envoyerRelanceImpaye(r.id))
      );
      const envoyees = resultats.filter(r => r.status === 'fulfilled').length;

      return res.status(200).json({
        success: true,
        message: `${envoyees}/${aRelancer.length} relance(s) envoyée(s)`,
        data: aRelancer.map(r => ({
          ...r.toJSON(),
          alerte: this.classifierAlertePaiement(r)
        }))
      });
    } catch (error) {
      console.error('❌ Erreur alerterImpayes:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de l\'alerte des impayés' });
    }
  }
}

export default new PaiementsController();