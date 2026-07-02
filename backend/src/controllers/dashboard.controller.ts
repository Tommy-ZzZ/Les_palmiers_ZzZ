import { Request, Response } from 'express';
import { Op } from 'sequelize';
import {
  Reservation,
  Room,
  Client,
  Payment,
  Invoice,
  BikeRental,
  Transfer,
  ReservationActivity
} from '../models';

export class DashboardController {
  /**
   * Tableau de bord principal (CDC section 3.7.1)
   */
  async getDashboard(req: Request, res: Response) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // 1. Taux d'occupation (CDC section 3.7.1)
      const totalChambres = await Room.count();
      const joursDansMois = endOfMonth.getDate();

      const reservationsMois = await Reservation.findAll({
        where: {
          dateArrivee: { [Op.lte]: endOfMonth },
          dateDepart: { [Op.gte]: startOfMonth },
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        }
      });

      const nuitées = reservationsMois.reduce((total, r) => {
        const arrivee = new Date(r.dateArrivee);
        const depart = new Date(r.dateDepart);
        const nbNuits = Math.ceil((depart.getTime() - arrivee.getTime()) / (1000 * 60 * 60 * 24));
        return total + nbNuits;
      }, 0);

      const tauxOccupation = totalChambres * joursDansMois > 0
        ? (nuitées / (totalChambres * joursDansMois)) * 100
        : 0;

      // 2. Chiffre d'affaires (CDC section 3.7.1)
      const chiffreAffairesMois = reservationsMois.reduce((total, r) => total + r.montantTotal, 0);

      // 3. Réservations par canal d'acquisition (CDC section 3.7.1)
      const clients = await Client.findAll({
        attributes: ['canalAcquisition', [Op.count, 'count']],
        group: ['canalAcquisition']
      });

      const canalData: any = {};
      clients.forEach((c: any) => {
        canalData[c.canalAcquisition] = c.get('count');
      });

      // 4. Durée moyenne des séjours (CDC section 3.7.1)
      const dureeMoyenne = reservationsMois.length > 0
        ? nuitées / reservationsMois.length
        : 0;

      // 5. Taux d'annulation (CDC section 3.7.1)
      const annulationsMois = await Reservation.count({
        where: {
          statut: 'ANNULEE',
          dateAnnulation: {
            [Op.between]: [startOfMonth, endOfMonth]
          }
        }
      });

      const totalReservationsMois = reservationsMois.length + annulationsMois;
      const tauxAnnulation = totalReservationsMois > 0
        ? (annulationsMois / totalReservationsMois) * 100
        : 0;

      // 6. Revenu par service (CDC section 3.7.2)
      const revenuHebergement = reservationsMois.reduce((total, r) => total + r.montantTotal, 0);

      // Revenus annexes
      const locationsVelo = await BikeRental.sum('montant', {
        where: {
          dateDebut: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      });

      const transferts = await Transfer.sum('montant', {
        where: {
          dateHeure: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      });

      const commissions = await ReservationActivity.sum('commissionPercue', {
        where: {
          dateActivite: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      });

      // 7. Évolution des recettes (CDC section 3.7.2)
      const lastMonthStart = new Date(startOfMonth);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      const lastMonthEnd = new Date(endOfMonth);
      lastMonthEnd.setMonth(lastMonthEnd.getMonth() - 1);

      const reservationsLastMonth = await Reservation.findAll({
        where: {
          dateArrivee: { [Op.between]: [lastMonthStart, lastMonthEnd] },
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        }
      });

      const caLastMonth = reservationsLastMonth.reduce((total, r) => total + r.montantTotal, 0);
      const evolution = caLastMonth > 0
        ? ((chiffreAffairesMois - caLastMonth) / caLastMonth) * 100
        : 0;

      // 8. Arrivées et départs du jour (CDC section 3.1.3)
      const arriveesJour = await Reservation.count({
        where: {
          dateArrivee: today,
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        }
      });

      const departsJour = await Reservation.count({
        where: {
          dateDepart: today,
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        }
      });

      // 9. Impayés à relancer (CDC section 3.4.2)
      const impayes = await Reservation.count({
        where: {
          statutPaiement: 'ACOMPTE_EN_ATTENTE',
          dateArrivee: { [Op.lte]: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000) }
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          periode: {
            mois: today.getMonth() + 1,
            annee: today.getFullYear()
          },
          occupation: {
            taux: Math.round(tauxOccupation * 100) / 100,
            nuitées,
            chambres: totalChambres,
            jours: joursDansMois
          },
          chiffreAffaires: {
            mois: chiffreAffairesMois,
            evolution: Math.round(evolution * 100) / 100,
            caLastMonth
          },
          reservations: {
            parCanal: canalData,
            dureeMoyenne: Math.round(dureeMoyenne * 100) / 100,
            tauxAnnulation: Math.round(tauxAnnulation * 100) / 100
          },
          revenusParService: {
            hebergement: revenuHebergement,
            locationVelo: locationsVelo || 0,
            transferts: transferts || 0,
            commissions: commissions || 0,
            total: revenuHebergement + (locationsVelo || 0) + (transferts || 0) + (commissions || 0)
          },
          aujourdHui: {
            arrivees: arriveesJour,
            departs: departsJour
          },
          alertes: {
            impayes
          }
        }
      });

    } catch (error) {
      console.error('Erreur getDashboard:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du tableau de bord'
      });
    }
  }

  /**
   * RevPAR - Revenu par chambre disponible (CDC section 3.7.2)
   */
  async getRevPAR(req: Request, res: Response) {
    try {
      const { mois, annee } = req.query;
      const month = parseInt(mois as string) || new Date().getMonth() + 1;
      const year = parseInt(annee as string) || new Date().getFullYear();

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const totalChambres = await Room.count();
      const joursDansMois = endDate.getDate();

      const reservations = await Reservation.findAll({
        where: {
          dateArrivee: { [Op.lte]: endDate },
          dateDepart: { [Op.gte]: startDate },
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        }
      });

      const recettes = reservations.reduce((total, r) => total + r.montantTotal, 0);
      const capaciteTotale = totalChambres * joursDansMois;
      const revPAR = capaciteTotale > 0 ? recettes / capaciteTotale : 0;

      // RevPAR par chambre
      const revPARParChambre: any = {};
      const chambres = await Room.findAll();

      for (const chambre of chambres) {
        const reservationsChambre = reservations.filter(r => r.chambreId === chambre.id);
        const recettesChambre = reservationsChambre.reduce((total, r) => total + r.montantTotal, 0);
        revPARParChambre[chambre.nom] = capaciteTotale > 0
          ? Math.round((recettesChambre / capaciteTotale) * 100) / 100
          : 0;
      }

      return res.status(200).json({
        success: true,
        data: {
          mois: month,
          annee: year,
          revPAR: Math.round(revPAR * 100) / 100,
          recettesTotales: recettes,
          capaciteTotale,
          parChambre: revPARParChambre
        }
      });

    } catch (error) {
      console.error('Erreur getRevPAR:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du calcul du RevPAR'
      });
    }
  }

  /**
   * Revenu moyen par client (CDC section 3.7.2)
   */
  async getRevenuMoyenParClient(req: Request, res: Response) {
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

      const reservations = await Reservation.findAll({
        where: {
          dateArrivee: { [Op.between]: [startDate, endDate] },
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        },
        include: [
          { model: Client, as: 'client' }
        ]
      });

      const clientsUniques = new Set();
      let recettesTotal = 0;

      reservations.forEach(r => {
        clientsUniques.add(r.clientId);
        recettesTotal += r.montantTotal;
      });

      const nbClients = clientsUniques.size;
      const revenuMoyen = nbClients > 0 ? recettesTotal / nbClients : 0;

      return res.status(200).json({
        success: true,
        data: {
          periode: {
            debut: startDate,
            fin: endDate
          },
          nbClients,
          recettesTotal,
          revenuMoyen: Math.round(revenuMoyen * 100) / 100
        }
      });

    } catch (error) {
      console.error('Erreur getRevenuMoyenParClient:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du calcul du revenu moyen'
      });
    }
  }

  /**
   * Rapport journalier (CDC section 3.7.3)
   */
  async getRapportJournalier(req: Request, res: Response) {
    try {
      const { date } = req.query;
      const jour = date ? new Date(date as string) : new Date();
      jour.setHours(0, 0, 0, 0);

      const nextDay = new Date(jour);
      nextDay.setDate(nextDay.getDate() + 1);

      // Arrivées du jour
      const arrivees = await Reservation.findAll({
        where: {
          dateArrivee: jour,
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        },
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      // Départs du jour
      const departs = await Reservation.findAll({
        where: {
          dateDepart: jour,
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        },
        include: [
          { model: Client, as: 'client' },
          { model: Room, as: 'chambre' }
        ]
      });

      // Paiements du jour
      const paiements = await Payment.findAll({
        where: {
          datePaiement: {
            [Op.between]: [jour, nextDay]
          }
        },
        include: [
          {
            model: Reservation,
            as: 'reservation',
            include: [
              { model: Client, as: 'client' }
            ]
          }
        ]
      });

      const totalEncaissements = paiements.reduce((sum, p) => sum + p.montant, 0);

      // Taux d'occupation du jour
      const totalChambres = await Room.count();
      const occupees = await Reservation.count({
        where: {
          dateArrivee: { [Op.lte]: jour },
          dateDepart: { [Op.gt]: jour },
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        }
      });

      const tauxOccupation = totalChambres > 0 ? (occupees / totalChambres) * 100 : 0;

      return res.status(200).json({
        success: true,
        data: {
          date: jour,
          arrivees: {
            nombre: arrivees.length,
            details: arrivees
          },
          departs: {
            nombre: departs.length,
            details: departs
          },
          paiements: {
            total: totalEncaissements,
            details: paiements
          },
          occupation: {
            occupees,
            totalChambres,
            taux: Math.round(tauxOccupation * 100) / 100
          }
        }
      });

    } catch (error) {
      console.error('Erreur getRapportJournalier:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du rapport journalier'
      });
    }
  }

  /**
   * Rapport mensuel (CDC section 3.7.3)
   */
  async getRapportMensuel(req: Request, res: Response) {
    try {
      const { mois, annee } = req.query;
      const month = parseInt(mois as string) || new Date().getMonth() + 1;
      const year = parseInt(annee as string) || new Date().getFullYear();

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Statistiques générales
      const totalChambres = await Room.count();

      const reservations = await Reservation.findAll({
        where: {
          dateArrivee: { [Op.between]: [startDate, endDate] },
          statut: { [Op.notIn]: ['ANNULEE', 'NO_SHOW'] }
        }
      });

      const annulations = await Reservation.count({
        where: {
          dateAnnulation: { [Op.between]: [startDate, endDate] },
          statut: 'ANNULEE'
        }
      });

      const nuitées = reservations.reduce((total, r) => {
        const arrivee = new Date(r.dateArrivee);
        const depart = new Date(r.dateDepart);
        const nbNuits = Math.ceil((depart.getTime() - arrivee.getTime()) / (1000 * 60 * 60 * 24));
        return total + nbNuits;
      }, 0);

      const joursDansMois = endDate.getDate();
      const tauxOccupation = (nuitées / (totalChambres * joursDansMois)) * 100;
      const chiffreAffaires = reservations.reduce((total, r) => total + r.montantTotal, 0);

      // Revenus par service
      const revenuHebergement = chiffreAffaires;

      const locationsVelo = await BikeRental.sum('montant', {
        where: {
          dateDebut: { [Op.between]: [startDate, endDate] }
        }
      });

      const transferts = await Transfer.sum('montant', {
        where: {
          dateHeure: { [Op.between]: [startDate, endDate] }
        }
      });

      const commissions = await ReservationActivity.sum('commissionPercue', {
        where: {
          dateActivite: { [Op.between]: [startDate, endDate] }
        }
      });

      // Clients par origine géographique (CDC section 3.3.2)
      const clientsParOrigine = await Client.findAll({
        attributes: ['origineGeo', [Op.count, 'count']],
        group: ['origineGeo']
      });

      const origineData: any = {};
      clientsParOrigine.forEach((c: any) => {
        origineData[c.origineGeo] = c.get('count');
      });

      // Réservations par canal
      const clientsParCanal = await Client.findAll({
        attributes: ['canalAcquisition', [Op.count, 'count']],
        group: ['canalAcquisition']
      });

      const canalData: any = {};
      clientsParCanal.forEach((c: any) => {
        canalData[c.canalAcquisition] = c.get('count');
      });

      // Paiements du mois
      const paiements = await Payment.findAll({
        where: {
          datePaiement: { [Op.between]: [startDate, endDate] }
        }
      });

      const totalEncaissements = paiements.reduce((sum, p) => sum + p.montant, 0);

      return res.status(200).json({
        success: true,
        data: {
          periode: {
            mois: month,
            annee: year,
            debut: startDate,
            fin: endDate
          },
          occupation: {
            taux: Math.round(tauxOccupation * 100) / 100,
            nuitées,
            chambres: totalChambres,
            jours: joursDansMois
          },
          finances: {
            chiffreAffaires,
            encaissements: totalEncaissements,
            ecart: chiffreAffaires - totalEncaissements,
            detailsParService: {
              hebergement: revenuHebergement,
              locationVelo: locationsVelo || 0,
              transferts: transferts || 0,
              commissions: commissions || 0
            }
          },
          reservations: {
            nombre: reservations.length,
            annulations,
            tauxAnnulation: (reservations.length + annulations) > 0
              ? Math.round((annulations / (reservations.length + annulations)) * 100 * 100) / 100
              : 0,
            dureeMoyenne: reservations.length > 0
              ? Math.round((nuitées / reservations.length) * 100) / 100
              : 0
          },
          clients: {
            parOrigine: origineData,
            parCanal: canalData
          }
        }
      });

    } catch (error) {
      console.error('Erreur getRapportMensuel:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération du rapport mensuel'
      });
    }
  }
}