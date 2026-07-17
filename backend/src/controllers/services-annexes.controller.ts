// backend/src/controllers/services-annexes.controller.ts
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Bike, 
  BikeRental, 
  Transfer, 
  Partner, 
  Activity, 
  ReservationActivity, 
  Reservation,
  Client,
  Room
} from '../models';
import { WebSocketManager } from '../websocket/server';
import { StatutReservation } from '../models/Reservation';

// ============================================================
// HELPERS
// ============================================================

function generateVeloNumber(): string {
  const chars = '0123456789';
  let result = 'V';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateVeloSerial(): string {
  const chars = '0123456789';
  let result = 'VE';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateReservationNumber(): string {
  const chars = '0123456789';
  let result = 'RES';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateTransfertNumber(): string {
  const chars = '0123456789';
  let result = 'TRA';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getDefaultPrixVelo(type: string): number {
  switch (type) {
    case 'VTT': return 15;
    case 'VILLE': return 10;
    case 'ELECTRIQUE': return 25;
    default: return 15;
  }
}

// ============================================================
// NORMALISATION DES PAYLOADS
// ============================================================

function mapVeloPayload(body: any) {
  return {
    type: body.type,
    taille: body.taille ?? null,
    etat: body.etat ?? 'BON',
    prix: body.prix !== undefined ? Number(body.prix) : undefined,
    numeroSerie: body.numero_serie ?? body.numeroSerie ?? undefined,
    disponible: body.disponible !== undefined ? body.disponible : undefined,
  };
}

function mapLocationVeloInput(body: any) {
  return {
    clientId: body.clientId ?? body.client_id ?? null,
    reservationId: body.reservation_id ?? body.reservationId ?? null,
    veloId: body.velo_id ?? body.veloId ?? null,
    dateDebut: body.date_debut ?? body.dateDebut,
    dateFin: body.date_fin ?? body.dateFin,
    typeTarification: body.type_tarification ?? body.typeTarification ?? 'JOURNALIERE',
    montant: body.montant,
  };
}

function mapTransfertPayload(body: any) {
  let statut = body.statut || body.status || 'PLANIFIE';
  
  if (statut === 'EN_COURS') {
    statut = 'PLANIFIE';
  }
  
  const statutsValides = ['PLANIFIE', 'REALISE', 'ANNULE'];
  if (!statutsValides.includes(statut)) {
    statut = 'PLANIFIE';
  }

  const payload: any = {
    clientId: body.clientId ?? body.client_id ?? null,
    reservationId: body.reservation_id ?? body.reservationId ?? null,
    dateHeure: body.date_heure ?? body.dateHeure,
    sens: body.sens,
    numeroVol: body.numero_vol ?? body.numeroVol ?? null,
    nbPersonnes: body.nb_personnes ?? body.nbPersonnes ?? 1,
    nbBagages: body.nb_bagages ?? body.nbBagages ?? 0,
    montant: body.montant ?? 0,
    statut: statut,
    notes: body.remarques ?? body.notes ?? null,
  };
  
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
  return payload;
}

function mapActivitePayload(body: any) {
  const payload: any = {
    partenaireId: body.partenaire_id ?? body.partenaireId,
    nom: body.nom,
    description: body.description ?? null,
    typeActivite: body.type_activite ?? body.typeActivite ?? 'AUTRE',
    prixClient: body.tarif_client !== undefined ? Number(body.tarif_client)
      : body.prixClient !== undefined ? Number(body.prixClient)
      : body.prix_client !== undefined ? Number(body.prix_client)
      : undefined,
    commissionGite: body.commission_gite !== undefined ? Number(body.commission_gite) 
      : (body.commissionGite !== undefined ? Number(body.commissionGite) : undefined),
    actif: body.disponible !== undefined ? body.disponible 
      : (body.actif !== undefined ? body.actif : true),
    dureeHeures: body.duree_heures ?? body.dureeHeures ?? 2,
  };
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
  return payload;
}

function serializeActivite(a: any) {
  const data = a.toJSON ? a.toJSON() : a;
  return {
    id: data.id,
    partenaire_id: data.partenaireId,
    nom_activite: data.nom,
    nom_partenaire: data.partenaire?.nom || '',
    type_activite: data.typeActivite,
    duree_heures: data.dureeHeures ?? 2,
    tarif_client: Number(data.prixClient) || 0,
    commission_gite: Number(data.commissionGite) || 0,
    description: data.description,
    disponible: !!data.actif,
  };
}

function mapPartenairePayload(body: any) {
  const payload: any = {
    nom: body.nom,
    telephone: body.telephone ?? null,
    email: body.email ?? null,
    tauxCommissionDefaut: body.tauxCommissionDefaut ?? body.taux_commission_defaut ?? 0,
    actif: body.actif !== undefined ? body.actif : true,
  };
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
  return payload;
}

// ============================================================
// CONTROLEUR
// ============================================================

export class ServicesAnnexesController {
  
  // ============================================================
  // CHAMBRE VIRTUELLE POUR LOCATIONS VÉLO
  // ============================================================
  
  private async getVeloReservationRoomId(): Promise<number> {
    let room = await Room.findOne({ where: { nom: 'LOCATION_VELO' } });
    
    if (!room) {
      room = await Room.create({
        numero: 'VELO-0',
        nom: 'LOCATION_VELO',
        capaciteAdultes: 0,
        nbLitsSimples: 0,
        nbLitsDoubles: 0,
        nbLitsBebe: 0,
        surfaceM2: 0,
        vue: 'JARDIN',
        accessiblePMR: false,
        statut: 'DISPONIBLE',
        climatisation: false,
        ventilateur: false,
        secheCheveux: false,
        bouilloire: false,
        miniRefrigerateur: false,
      });
      console.log('✅ Chambre virtuelle LOCATION_VELO créée avec ID:', room.id);
    }
    
    return room.id;
  }

  // ========================
  // VÉLOS — §3.5.1
  // ========================

  async getVelos(req: Request, res: Response) {
    try {
      const velos = await Bike.findAll({
        order: [['type', 'ASC']]
      });

      const locationsEnCours = await BikeRental.findAll({
        where: { statut: 'EN_COURS' },
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

      const velosEnriched = velos.map(velo => {
        const veloData = velo.toJSON();
        const location = locationsEnCours.find(l => l.veloId === velo.id);
        return {
          ...veloData,
          numero: veloData.numero || generateVeloNumber(),
          prix: Number(veloData.prix) || 15,
          numero_serie: veloData.numeroSerie,
          disponible: veloData.disponible !== false && veloData.etat !== 'HORS_SERVICE' && !location,
          locationEnCours: location ? {
            id: location.id,
            clientNom: location.reservation?.client?.nom || '',
            clientPrenom: location.reservation?.client?.prenom || '',
            dateDebut: location.dateDebut,
            dateFin: location.dateFin,
            reservationId: location.reservationId
          } : null
        };
      });

      return res.status(200).json({
        success: true,
        data: velosEnriched
      });
    } catch (error) {
      console.error('❌ Erreur getVelos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des vélos'
      });
    }
  }

  async getVelosDisponibles(req: Request, res: Response) {
    try {
      const { dateDebut, dateFin } = req.query;

      const velos = await Bike.findAll({
        where: { etat: { [Op.not]: 'HORS_SERVICE' } }
      });

      if (!dateDebut || !dateFin) {
        return res.status(200).json({
          success: true,
          data: velos.filter(v => v.etat !== 'HORS_SERVICE')
        });
      }

      const disponibles = await Promise.all(
        velos.map(async (velo) => {
          const locations = await BikeRental.count({
            where: {
              veloId: velo.id,
              statut: 'EN_COURS',
              dateDebut: { [Op.lt]: dateFin },
              dateFin: { [Op.gt]: dateDebut }
            }
          });
          return {
            ...velo.toJSON(),
            disponible: locations === 0
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: disponibles.filter(v => v.disponible)
      });
    } catch (error) {
      console.error('❌ Erreur getVelosDisponibles:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification des disponibilités'
      });
    }
  }

  async getLocationsEnCours(req: Request, res: Response) {
    try {
      const locations = await BikeRental.findAll({
        where: { statut: 'EN_COURS' },
        include: [
          { model: Bike, as: 'velo' },
          {
            model: Reservation,
            as: 'reservation',
            include: [
              { model: Client, as: 'client' }
            ]
          }
        ],
        order: [['dateDebut', 'ASC']]
      });

      const locationsEnriched = locations.map(loc => {
        const locData = loc.toJSON();
        return {
          ...locData,
          client: locData.reservation?.client || null
        };
      });

      return res.status(200).json({
        success: true,
        data: locationsEnriched
      });
    } catch (error) {
      console.error('❌ Erreur getLocationsEnCours:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des locations'
      });
    }
  }

  async createVelo(req: Request, res: Response) {
    try {
      const mapped = mapVeloPayload(req.body);
      const numero = generateVeloNumber();

      const velo = await Bike.create({
        numero: numero,
        type: mapped.type || 'VILLE',
        taille: mapped.taille || 'M',
        etat: mapped.etat || 'BON',
        prix: mapped.prix ?? getDefaultPrixVelo(mapped.type),
        numeroSerie: mapped.numeroSerie || generateVeloSerial(),
        disponible: mapped.disponible !== undefined ? mapped.disponible : true
      });

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'VELO_CREATED',
          ...velo.toJSON(),
          numero_serie: velo.numeroSerie
        },
        timestamp: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        message: 'Vélo créé avec succès',
        data: velo
      });
    } catch (error) {
      console.error('❌ Erreur createVelo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du vélo: ' + (error as Error).message
      });
    }
  }

  async updateVelo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const velo = await Bike.findByPk(id);

      if (!velo) {
        return res.status(404).json({
          success: false,
          message: 'Vélo non trouvé'
        });
      }

      const mapped = mapVeloPayload(req.body);
      const updatePayload: any = {};
      Object.entries(mapped).forEach(([key, value]) => {
        if (value !== undefined) updatePayload[key] = value;
      });

      await velo.update(updatePayload);

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'VELO_UPDATED',
          ...velo.toJSON(),
          numero_serie: velo.numeroSerie
        },
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Vélo mis à jour avec succès',
        data: velo
      });
    } catch (error) {
      console.error('❌ Erreur updateVelo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour: ' + (error as Error).message
      });
    }
  }

  async deleteVelo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const velo = await Bike.findByPk(id);

      if (!velo) {
        return res.status(404).json({
          success: false,
          message: 'Vélo non trouvé'
        });
      }

      const locationEnCours = await BikeRental.findOne({
        where: { veloId: id, statut: 'EN_COURS' }
      });

      if (locationEnCours) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de supprimer un vélo actuellement en location'
        });
      }

      await velo.destroy();

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'VELO_DELETED',
          veloId: parseInt(id)
        },
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Vélo supprimé avec succès'
      });
    } catch (error) {
      console.error('❌ Erreur deleteVelo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression: ' + (error as Error).message
      });
    }
  }

  // ========================
  // LOCATIONS DE VÉLOS — §3.5.1
  // ========================

  async createLocationVelo(req: Request, res: Response) {
    try {
      console.log('📥 createLocationVelo - Body reçu:', req.body);

      const {
        clientId,
        reservationId,
        veloId,
        dateDebut,
        dateFin,
        typeTarification,
        montant
      } = mapLocationVeloInput(req.body);

      if (!veloId) {
        return res.status(400).json({
          success: false,
          message: 'Le champ veloId est obligatoire'
        });
      }

      const veloIdNumber = Number(veloId);
      if (isNaN(veloIdNumber) || veloIdNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID de vélo invalide'
        });
      }

      const velo = await Bike.findByPk(veloIdNumber);
      if (!velo) {
        return res.status(404).json({
          success: false,
          message: 'Vélo non trouvé'
        });
      }

      const conflict = await BikeRental.findOne({
        where: {
          veloId: veloIdNumber,
          statut: 'EN_COURS',
          dateDebut: { [Op.lt]: dateFin },
          dateFin: { [Op.gt]: dateDebut }
        }
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'Ce vélo n\'est pas disponible sur cette période'
        });
      }

      let finalReservationId = reservationId ? Number(reservationId) : null;
      let client = null;

      if (clientId) {
        const clientIdNumber = Number(clientId);
        if (!isNaN(clientIdNumber) && clientIdNumber > 0) {
          client = await Client.findByPk(clientIdNumber);
          if (!client) {
            return res.status(404).json({
              success: false,
              message: 'Client non trouvé'
            });
          }
        }
      }

      if (!finalReservationId && clientId) {
        const chambreVirtuelleId = await this.getVeloReservationRoomId();
        const reservationNumber = generateReservationNumber();
        
        const prixParJour = Number(velo.prix) || 15;
        const jours = Math.max(1, Math.ceil((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / (1000 * 60 * 60 * 24)));
        const montantFinal = montant || (jours * prixParJour);

        const newReservation = await Reservation.create({
          numero: reservationNumber,
          clientId: Number(clientId),
          chambreId: chambreVirtuelleId,
          dateArrivee: new Date(dateDebut),
          dateDepart: new Date(dateFin),
          nbAdultes: 1,
          nbEnfants: 0,
          statut: StatutReservation.CONFIRMEE,
          montantTotal: Math.round(montantFinal * 100) / 100,
          montantAcompte: Math.round(montantFinal * 100) / 100,
          montantSolde: 0,
          montantPenalite: 0,
          typeAcompte: 100,
          litBebe: false,
          petitDejeunerInclus: false,
          notesInternes: `Location vélo ${velo.type} du ${dateDebut} au ${dateFin}`,
          canalAcquisition: 'DIRECT',
          creePar: (req as any).user?.id
        });

        finalReservationId = newReservation.id;
        console.log(`📝 Réservation fantôme créée: ${newReservation.numero} (ID: ${newReservation.id})`);
      }

      if (finalReservationId) {
        const existingReservation = await Reservation.findByPk(finalReservationId);
        if (!existingReservation) {
          return res.status(404).json({
            success: false,
            message: 'Réservation non trouvée'
          });
        }
        if (!existingReservation.clientId && clientId) {
          await existingReservation.update({ clientId: Number(clientId) });
        }
      }

      let finalMontant = montant;
      if (!finalMontant || finalMontant === 0) {
        const prixParJour = Number(velo.prix) || 15;
        const jours = Math.max(1, Math.ceil((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / (1000 * 60 * 60 * 24)));
        finalMontant = jours * prixParJour;
      }

      const location = await BikeRental.create({
        reservationId: finalReservationId,
        veloId: veloIdNumber,
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        typeTarification: typeTarification || 'JOURNALIERE',
        montant: Math.round(Number(finalMontant) * 100) / 100,
        statut: 'EN_COURS',
        clientId: clientId ? Number(clientId) : null
      });

      await velo.update({ disponible: false });

      const locationWithRelations = await BikeRental.findByPk(location.id, {
        include: [
          { model: Bike, as: 'velo' },
          {
            model: Reservation,
            as: 'reservation',
            include: [{ model: Client, as: 'client' }]
          }
        ]
      });

      const wsManager = WebSocketManager.getInstance();
      
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'LOCATION_CREATED',
          locationId: location.id,
          veloId: veloIdNumber,
          veloNumero: velo.numero || '',
          reservationId: finalReservationId,
          clientNom: client?.nom || locationWithRelations?.reservation?.client?.nom || '',
          clientPrenom: client?.prenom || locationWithRelations?.reservation?.client?.prenom || '',
          dateDebut,
          dateFin,
          montant: finalMontant
        },
        timestamp: new Date().toISOString()
      });

      wsManager.broadcastToAll({
        type: 'VELO_STATUS_CHANGED',
        data: {
          veloId: veloIdNumber,
          locationId: location.id,
          disponible: false,
          clientNom: client?.nom || locationWithRelations?.reservation?.client?.nom || '',
          clientPrenom: client?.prenom || locationWithRelations?.reservation?.client?.prenom || '',
          dateDebut,
          dateFin,
          reservationId: finalReservationId
        },
        timestamp: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        message: 'Location créée avec succès',
        data: locationWithRelations || location
      });

    } catch (error) {
      console.error('❌ Erreur createLocationVelo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la location: ' + (error as Error).message
      });
    }
  }

  // ✅ AJOUT : Mettre à jour une location de vélo
  async updateLocationVelo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const location = await BikeRental.findByPk(id);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Location non trouvée'
        });
      }

      const { dateDebut, dateFin, montant, statut, typeTarification } = req.body;

      if (dateDebut) location.dateDebut = new Date(dateDebut);
      if (dateFin) location.dateFin = new Date(dateFin);
      if (montant !== undefined) location.montant = Number(montant);
      if (statut) location.statut = statut;
      if (typeTarification) location.typeTarification = typeTarification;

      await location.save();

      const locationWithRelations = await BikeRental.findByPk(location.id, {
        include: [
          { model: Bike, as: 'velo' },
          {
            model: Reservation,
            as: 'reservation',
            include: [{ model: Client, as: 'client' }]
          }
        ]
      });

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'LOCATION_UPDATED',
          locationId: location.id
        },
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Location mise à jour avec succès',
        data: locationWithRelations || location
      });
    } catch (error) {
      console.error('❌ Erreur updateLocationVelo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour: ' + (error as Error).message
      });
    }
  }

  // ✅ AJOUT : Supprimer une location de vélo
  async deleteLocationVelo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const location = await BikeRental.findByPk(id);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Location non trouvée'
        });
      }

      if (location.statut === 'EN_COURS') {
        await Bike.update(
          { disponible: true },
          { where: { id: location.veloId } }
        );
      }

      await location.destroy();

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'LOCATION_DELETED',
          locationId: parseInt(id)
        },
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Location supprimée avec succès'
      });
    } catch (error) {
      console.error('❌ Erreur deleteLocationVelo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression: ' + (error as Error).message
      });
    }
  }

  async terminerLocationVelo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const location = await BikeRental.findByPk(id, {
        include: [{ model: Bike, as: 'velo' }]
      });

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Location non trouvée'
        });
      }

      if (location.statut !== 'EN_COURS') {
        return res.status(400).json({
          success: false,
          message: 'Cette location est déjà terminée ou annulée'
        });
      }

      await location.update({ statut: 'TERMINEE' });

      if (location.velo) {
        await location.velo.update({ disponible: true });
      }

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'LOCATION_TERMINEE',
          locationId: location.id,
          veloId: location.veloId,
          veloNumero: location.velo?.numero || ''
        },
        timestamp: new Date().toISOString()
      });

      wsManager.broadcastToAll({
        type: 'VELO_STATUS_CHANGED',
        data: {
          veloId: location.veloId,
          locationId: location.id,
          disponible: true
        },
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Location terminée avec succès',
        data: location
      });
    } catch (error) {
      console.error('❌ Erreur terminerLocationVelo:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la terminaison de la location: ' + (error as Error).message
      });
    }
  }

  // ========================
  // TRANSFERTS — §3.5.2
  // ========================

  async getTransferts(req: Request, res: Response) {
    try {
      const { statut } = req.query;
      const where: any = {};

      if (statut) {
        where.statut = statut;
      }

      const transferts = await Transfer.findAll({
        where,
        include: [
          {
            model: Reservation,
            as: 'reservation',
            include: [
              { model: Client, as: 'client' }
            ]
          }
        ],
        order: [['dateHeure', 'ASC']]
      });

      const transfertsEnriched = transferts.map(t => {
        const tData = t.toJSON();
        return {
          ...tData,
          client: tData.reservation?.client || null,
          clientId: tData.reservation?.clientId || tData.clientId || null
        };
      });

      return res.status(200).json({
        success: true,
        data: transfertsEnriched
      });
    } catch (error) {
      console.error('❌ Erreur getTransferts:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des transferts'
      });
    }
  }

  async getHistoriqueTransferts(req: Request, res: Response) {
    try {
      const transferts = await Transfer.findAll({
        where: { statut: { [Op.in]: ['REALISE', 'ANNULE'] } },
        include: [
          {
            model: Reservation,
            as: 'reservation',
            include: [
              { model: Client, as: 'client' }
            ]
          }
        ],
        order: [['dateHeure', 'DESC']],
        limit: 50
      });

      const transfertsEnriched = transferts.map(t => {
        const tData = t.toJSON();
        return {
          ...tData,
          client: tData.reservation?.client || null
        };
      });

      return res.status(200).json({
        success: true,
        data: transfertsEnriched
      });
    } catch (error) {
      console.error('❌ Erreur getHistoriqueTransferts:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de l\'historique'
      });
    }
  }

  async createTransfert(req: Request, res: Response) {
    try {
      console.log('📥 createTransfert - Body reçu:', req.body);
      
      const payload = mapTransfertPayload(req.body);

      if (!payload.dateHeure) {
        return res.status(400).json({
          success: false,
          message: 'La date et l\'heure du transfert sont obligatoires'
        });
      }

      let finalReservationId = payload.reservationId;
      let client = null;

      if (payload.clientId && !payload.reservationId) {
        const clientIdNumber = Number(payload.clientId);
        if (!isNaN(clientIdNumber) && clientIdNumber > 0) {
          client = await Client.findByPk(clientIdNumber);
          if (!client) {
            return res.status(404).json({
              success: false,
              message: 'Client non trouvé'
            });
          }

          const chambreVirtuelleId = await this.getVeloReservationRoomId();
          const reservationNumber = generateTransfertNumber();
          
          const newReservation = await Reservation.create({
            numero: reservationNumber,
            clientId: clientIdNumber,
            chambreId: chambreVirtuelleId,
            dateArrivee: new Date(payload.dateHeure),
            dateDepart: new Date(new Date(payload.dateHeure).getTime() + 3600000),
            nbAdultes: payload.nbPersonnes || 1,
            nbEnfants: 0,
            statut: StatutReservation.CONFIRMEE,
            montantTotal: payload.montant || 0,
            montantAcompte: payload.montant || 0,
            montantSolde: 0,
            montantPenalite: 0,
            typeAcompte: 100,
            litBebe: false,
            petitDejeunerInclus: false,
            notesInternes: `Transfert ${payload.sens} du ${payload.dateHeure}`,
            canalAcquisition: 'DIRECT',
            creePar: (req as any).user?.id
          });

          finalReservationId = newReservation.id;
          console.log(`📝 Réservation fantôme pour transfert créée: ${newReservation.numero} (ID: ${newReservation.id})`);
        }
      }

      if (finalReservationId && payload.clientId) {
        const existingReservation = await Reservation.findByPk(finalReservationId);
        if (existingReservation && !existingReservation.clientId) {
          await existingReservation.update({ clientId: Number(payload.clientId) });
        }
      }

      const transfertPayload = {
        ...payload,
        reservationId: finalReservationId
      };

      console.log('📤 createTransfert - Payload final:', transfertPayload);

      const transfert = await Transfer.create(transfertPayload);

      const transfertWithRelations = await Transfer.findByPk(transfert.id, {
        include: [
          {
            model: Reservation,
            as: 'reservation',
            include: [{ model: Client, as: 'client' }]
          }
        ]
      });

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'TRANSFERT_CREATED',
          ...transfert.toJSON(),
          clientId: payload.clientId,
          reservationId: finalReservationId
        },
        timestamp: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        message: 'Transfert créé avec succès',
        data: transfertWithRelations || transfert
      });
    } catch (error) {
      console.error('❌ Erreur createTransfert:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du transfert: ' + (error as Error).message
      });
    }
  }

  async updateTransfert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const transfert = await Transfer.findByPk(id);

      if (!transfert) {
        return res.status(404).json({
          success: false,
          message: 'Transfert non trouvé'
        });
      }

      const payload = mapTransfertPayload(req.body);
      
      if (payload.clientId && transfert.reservationId) {
        const reservation = await Reservation.findByPk(transfert.reservationId);
        if (reservation && !reservation.clientId) {
          await reservation.update({ clientId: Number(payload.clientId) });
        }
      }

      await transfert.update(payload);

      const transfertWithRelations = await Transfer.findByPk(transfert.id, {
        include: [
          {
            model: Reservation,
            as: 'reservation',
            include: [{ model: Client, as: 'client' }]
          }
        ]
      });

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'TRANSFERT_UPDATED',
          ...transfert.toJSON()
        },
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Transfert mis à jour avec succès',
        data: transfertWithRelations || transfert
      });
    } catch (error) {
      console.error('❌ Erreur updateTransfert:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour: ' + (error as Error).message
      });
    }
  }

  async deleteTransfert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const transfert = await Transfer.findByPk(id);

      if (!transfert) {
        return res.status(404).json({
          success: false,
          message: 'Transfert non trouvé'
        });
      }

      await transfert.destroy();

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'TRANSFERT_DELETED',
          transfertId: parseInt(id)
        },
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Transfert supprimé avec succès'
      });
    } catch (error) {
      console.error('❌ Erreur deleteTransfert:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression: ' + (error as Error).message
      });
    }
  }

  // ========================
  // ACTIVITÉS — §3.5.3
  // ========================

  async getActivites(req: Request, res: Response) {
    try {
      const activites = await Activity.findAll({
        include: [{ model: Partner, as: 'partenaire' }],
        where: { actif: true },
        order: [['nom', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: activites.map(serializeActivite)
      });
    } catch (error) {
      console.error('❌ Erreur getActivites:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des activités'
      });
    }
  }

  async getCommissions(req: Request, res: Response) {
    try {
      const { dateDebut, dateFin } = req.query;

      const where: any = {};
      if (dateDebut && dateFin) {
        where.dateActivite = { [Op.between]: [dateDebut, dateFin] };
      }

      const reservations = await ReservationActivity.findAll({
        where,
        include: [
          {
            model: Activity,
            as: 'activite',
            include: [{ model: Partner, as: 'partenaire' }]
          },
          {
            model: Reservation,
            as: 'reservation',
            include: [{ model: Client, as: 'client' }]
          }
        ],
        order: [['dateActivite', 'DESC']]
      });

      const totalCommissions = reservations.reduce((sum, r) => sum + (r.commissionPercue || 0), 0);

      return res.status(200).json({
        success: true,
        data: {
          reservations,
          totalCommissions,
          nombreReservations: reservations.length
        }
      });
    } catch (error) {
      console.error('❌ Erreur getCommissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des commissions'
      });
    }
  }

  async getReservationsExternes(req: Request, res: Response) {
    try {
      const reservations = await ReservationActivity.findAll({
        include: [
          {
            model: Activity,
            as: 'activite',
            include: [{ model: Partner, as: 'partenaire' }]
          },
          {
            model: Reservation,
            as: 'reservation',
            include: [{ model: Client, as: 'client' }]
          }
        ],
        order: [['dateActivite', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: reservations
      });
    } catch (error) {
      console.error('❌ Erreur getReservationsExternes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des réservations externes'
      });
    }
  }

  async createActivite(req: Request, res: Response) {
    try {
      const payload = mapActivitePayload(req.body);

      if (!payload.partenaireId) {
        return res.status(400).json({
          success: false,
          message: 'Le partenaire est obligatoire'
        });
      }

      const created = await Activity.create(payload);

      const activite = await Activity.findByPk(created.id, {
        include: [{ model: Partner, as: 'partenaire' }]
      });

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'ACTIVITE_CREATED',
          ...(activite ? serializeActivite(activite) : {})
        },
        timestamp: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        message: 'Activité créée avec succès',
        data: activite ? serializeActivite(activite) : created
      });
    } catch (error) {
      console.error('❌ Erreur createActivite:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de l\'activité: ' + (error as Error).message
      });
    }
  }

  async updateActivite(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activite = await Activity.findByPk(id);

      if (!activite) {
        return res.status(404).json({
          success: false,
          message: 'Activité non trouvée'
        });
      }

      const payload = mapActivitePayload(req.body);
      await activite.update(payload);

      const reloaded = await Activity.findByPk(activite.id, {
        include: [{ model: Partner, as: 'partenaire' }]
      });

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'ACTIVITE_UPDATED',
          ...(reloaded ? serializeActivite(reloaded) : {})
        },
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Activité mise à jour avec succès',
        data: reloaded ? serializeActivite(reloaded) : activite
      });
    } catch (error) {
      console.error('❌ Erreur updateActivite:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour: ' + (error as Error).message
      });
    }
  }

  async deleteActivite(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const activite = await Activity.findByPk(id);

      if (!activite) {
        return res.status(404).json({
          success: false,
          message: 'Activité non trouvée'
        });
      }

      await activite.destroy();

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'ACTIVITE_DELETED',
          activiteId: parseInt(id)
        },
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Activité supprimée avec succès'
      });
    } catch (error) {
      console.error('❌ Erreur deleteActivite:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression: ' + (error as Error).message
      });
    }
  }

  // ========================
  // RÉSERVATIONS D'ACTIVITÉS — §3.5.3
  // ========================

  async createReservationActivite(req: Request, res: Response) {
    try {
      const { reservationId, activiteId, dateActivite, nbParticipants, montantPaye } = req.body;

      const activite = await Activity.findByPk(activiteId);
      if (!activite) {
        return res.status(404).json({
          success: false,
          message: 'Activité non trouvée'
        });
      }

      const commissionPercue = activite.commissionGite || 0;

      const reservation = await ReservationActivity.create({
        reservationId: reservationId || null,
        activiteId,
        dateActivite,
        nbParticipants: nbParticipants || 1,
        montantPaye: montantPaye || 0,
        commissionPercue,
        statut: 'CONFIRMEE'
      });

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'RESERVATION_ACTIVITE_CREATED',
          ...reservation.toJSON(),
          commissionPercue
        },
        timestamp: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        message: 'Réservation d\'activité créée avec succès',
        data: reservation
      });
    } catch (error) {
      console.error('❌ Erreur createReservationActivite:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la réservation: ' + (error as Error).message
      });
    }
  }

  // ========================
  // PARTENAIRES — §3.5.3
  // ========================

  async getPartenaires(req: Request, res: Response) {
    try {
      const partenaires = await Partner.findAll({
        where: { actif: true },
        include: [
          {
            model: Activity,
            as: 'activites',
            where: { actif: true },
            required: false
          }
        ],
        order: [['nom', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: partenaires
      });
    } catch (error) {
      console.error('❌ Erreur getPartenaires:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des partenaires'
      });
    }
  }

  async createPartenaire(req: Request, res: Response) {
    try {
      const payload = mapPartenairePayload(req.body);
      const partenaire = await Partner.create(payload);

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'PARTENAIRE_CREATED',
          ...partenaire.toJSON()
        },
        timestamp: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        message: 'Partenaire créé avec succès',
        data: partenaire
      });
    } catch (error) {
      console.error('❌ Erreur createPartenaire:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du partenaire: ' + (error as Error).message
      });
    }
  }

  // ✅ AJOUT : Mettre à jour un partenaire
  async updatePartenaire(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const partenaire = await Partner.findByPk(id);

      if (!partenaire) {
        return res.status(404).json({
          success: false,
          message: 'Partenaire non trouvé'
        });
      }

      const payload = mapPartenairePayload(req.body);
      await partenaire.update(payload);

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'PARTENAIRE_UPDATED',
          ...partenaire.toJSON()
        },
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Partenaire mis à jour avec succès',
        data: partenaire
      });
    } catch (error) {
      console.error('❌ Erreur updatePartenaire:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour: ' + (error as Error).message
      });
    }
  }

  // ✅ AJOUT : Supprimer un partenaire
  async deletePartenaire(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const partenaire = await Partner.findByPk(id);

      if (!partenaire) {
        return res.status(404).json({
          success: false,
          message: 'Partenaire non trouvé'
        });
      }

      const activitesLiees = await Activity.count({
        where: { partenaireId: id, actif: true }
      });

      if (activitesLiees > 0) {
        return res.status(400).json({
          success: false,
          message: `Impossible de supprimer ce partenaire (${activitesLiees} activité(s) liée(s) active(s))`
        });
      }

      await partenaire.destroy();

      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastToAll({
        type: 'SERVICE_ANNEXE_UPDATED',
        data: {
          type: 'PARTENAIRE_DELETED',
          partenaireId: parseInt(id)
        },
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Partenaire supprimé avec succès'
      });
    } catch (error) {
      console.error('❌ Erreur deletePartenaire:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression: ' + (error as Error).message
      });
    }
  }
}