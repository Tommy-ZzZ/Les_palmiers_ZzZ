// backend/src/services/tarif.service.ts
import { Op } from 'sequelize';
import { Tariff, Room, PromoCode } from '../models';
import { Saison } from '../models/Tariff';

interface TarifCalculResult {
  montantTotal: number;
  totalHT: number;
  montantTVA: number;
  totalTTC: number;
  taxeSejour: number;
  // ✅ AJOUT — traçabilité du code promo appliqué (facture, historique)
  codePromoApplique: {
    id: number;
    code: string;
    reduction: number;
  } | null;
  detail: {
    prixBaseParNuit: number;
    prixMoyenNuit: number;
    prixNuitFinal: number;
    sousTotalHebergement: number;
    sousTotalHebergementApresPromo: number;
    nbNuits: number;
    nbWeekend: number;
    prixPetitDejeunerHT: number;
    prixEnfantsHT: number;
    prixLitsSuppHT: number;
    saison: string;
    coeffWeekend: number;
    coeffDegressif: number;
    detailNuits: {
      total: number;
      weekend: number;
      semaine: number;
    };
    taxes: {
      tauxTVA: number;
      montantTVA: number;
      taxeSejour: number;
      taxeSejourParNuitParPersonne: number;
    };
  };
}

export class TarifService {
  // ✅ TAUX DE TVA (par défaut 5.5% pour l'hébergement en France)
  // ⚠️ Point ouvert du CDC (Partie 8, Q3) : statut d'assujettissement à la TVA
  // du gîte non confirmé par la gérante. Paramètre modifiable ici en attendant.
  private readonly TAUX_TVA = 0.055;

  /**
   * Calculer le tarif pour un séjour avec TVA
   * @param codePromo Code promo optionnel saisi par l'employé (CDC §3.1.2 / UC_CodePromo).
   *   Centralisé ici pour que TOUT calcul de tarif (simulation ET création de
   *   réservation) applique la même logique de validation/réduction, au lieu de
   *   dupliquer la requête PromoCode dans chaque contrôleur.
   * @param appliquerUsage Si true, incrémente réellement `nbUtilisations` du code promo.
   *   Ne doit être mis à true QUE lors de la création définitive de la réservation,
   *   jamais lors d'une simple simulation de tarif.
   */
  async calculerTarif(
    chambreId: number,
    dateArrivee: string | Date,
    dateDepart: string | Date,
    nbAdultes: number,
    nbEnfants: number,
    petitDejeunerInclus: boolean,
    codePromo?: string | null,
    appliquerUsage: boolean = false
  ): Promise<TarifCalculResult> {
    const arrivee = typeof dateArrivee === 'string' ? new Date(dateArrivee) : dateArrivee;
    const depart = typeof dateDepart === 'string' ? new Date(dateDepart) : dateDepart;

    if (depart <= arrivee) {
      throw new Error('La date de départ doit être postérieure à la date d\'arrivée');
    }

    const chambre = await Room.findByPk(chambreId);
    if (!chambre) {
      throw new Error('Chambre non trouvée');
    }

    const saison = this.determinerSaison(arrivee);
    const nbNuits = Math.ceil((depart.getTime() - arrivee.getTime()) / (1000 * 60 * 60 * 24));

    let tarif = await this.findOrCreateTarif(chambreId, saison, arrivee);

    // ✅ Calcul du prix HT
    const prixBaseParNuit = tarif.prixBase || 85;

    // ✅ Calcul des week-ends
    let nbWeekend = 0;
    const dateCourante = new Date(arrivee);
    for (let i = 0; i < nbNuits; i++) {
      const d = new Date(dateCourante);
      d.setDate(d.getDate() + i);
      const day = d.getDay();
      if (day === 5 || day === 6) {
        nbWeekend++;
      }
    }

    const coeffWeekend = tarif.coeffWeekend || 1.15;
    const prixMoyenNuit = (prixBaseParNuit * (nbNuits - nbWeekend) + prixBaseParNuit * coeffWeekend * nbWeekend) / nbNuits;

    // ✅ Réduction dégressive > 5 nuits
    const coeffDegressif = tarif.coeffDegressif5Nuits || 0.9;
    const prixNuitFinal = nbNuits > 5 ? prixMoyenNuit * coeffDegressif : prixMoyenNuit;

    // ✅ Sous-total hébergement HT (avant code promo)
    const sousTotalHebergementHT = prixNuitFinal * nbNuits;

    // ✅ Petit-déjeuner HT
    let prixPetitDejeunerHT = 0;
    if (petitDejeunerInclus) {
      prixPetitDejeunerHT = (tarif.prixPetitDejeuner || 15) * nbAdultes * nbNuits;
    }

    // ✅ Enfants HT
    const prixEnfantsHT = (tarif.prixEnfant || 10) * nbEnfants * nbNuits;

    // ✅ Lits supplémentaires HT
    let prixLitsSuppHT = 0;
    const nbLitsDisponibles = (chambre.nbLitsDoubles || 0) * 2 + (chambre.nbLitsSimples || 0);
    const nbPersonnes = nbAdultes + nbEnfants;
    if (nbPersonnes > nbLitsDisponibles && nbLitsDisponibles > 0) {
      const nbLitsSupp = nbPersonnes - nbLitsDisponibles;
      prixLitsSuppHT = (tarif.prixLitSupplementaire || 20) * nbLitsSupp * nbNuits;
    }

    // ════════════════════════════════════════════════════════════
    // ✅ CODE PROMO (CDC §3.1.2, UC_CodePromo) — appliqué sur le sous-total
    // hébergement HT, avant TVA. Utilise les VRAIS champs du modèle PromoCode :
    // tauxReduction / reductionFixe / dateDebut / dateFin / nbUtilisationsMax /
    // nbUtilisations / actif (voir models/PromoCode.ts).
    // ════════════════════════════════════════════════════════════
    let sousTotalHebergementApresPromo = sousTotalHebergementHT;
    let codePromoApplique: { id: number; code: string; reduction: number } | null = null;

    if (codePromo) {
      const maintenant = new Date();
      const promo = await PromoCode.findOne({
        where: {
          code: { [Op.iLike]: codePromo.toUpperCase() }
        }
      });

      if (!promo) {
        throw new Error(`Code promo "${codePromo}" introuvable`);
      }

      const dateDebut = new Date(promo.dateDebut);
      const dateFin = new Date(promo.dateFin);
      const estActif = promo.actif !== false;
      const dansLaPeriode = dateDebut <= maintenant && dateFin >= maintenant;
      const usagesOk =
        promo.nbUtilisationsMax == null || (promo.nbUtilisations ?? 0) < promo.nbUtilisationsMax;

      if (!estActif || !dansLaPeriode || !usagesOk) {
        throw new Error(`Le code promo "${codePromo}" n'est plus valide`);
      }

      let reduction = 0;
      if (promo.tauxReduction) {
        reduction = sousTotalHebergementHT * (Number(promo.tauxReduction) / 100);
      } else if (promo.reductionFixe) {
        reduction = Math.min(Number(promo.reductionFixe), sousTotalHebergementHT);
      }

      sousTotalHebergementApresPromo = Math.max(0, sousTotalHebergementHT - reduction);
      codePromoApplique = { id: promo.id, code: promo.code, reduction: Math.round(reduction * 100) / 100 };

      // On ne consomme réellement le code (incrémentation) qu'à la création
      // définitive de la réservation, jamais lors d'une simulation de tarif.
      if (appliquerUsage) {
        await promo.increment('nbUtilisations');
      }
    }

    // ✅ Total HT (après code promo éventuel)
    const totalHT =
      sousTotalHebergementApresPromo + prixPetitDejeunerHT + prixEnfantsHT + prixLitsSuppHT;

    // ✅ TVA
    const montantTVA = totalHT * this.TAUX_TVA;

    // ✅ Total TTC
    const totalTTC = totalHT + montantTVA;

    // ✅ Taxe de séjour (par nuit et par personne) — hors champ de la TVA
    const taxeSejourParNuitParPersonne = 1.5; // Tarif fixe pour l'exemple
    const taxeSejour = taxeSejourParNuitParPersonne * (nbAdultes + nbEnfants) * nbNuits;

    // ✅ Total final — inclut bien la taxe de séjour (voir correction dans
    // reservations.controller.ts qui utilisait par erreur totalTTC seul).
    const montantTotal = totalTTC + taxeSejour;

    return {
      montantTotal,
      totalHT,
      montantTVA,
      totalTTC,
      taxeSejour,
      codePromoApplique,

      detail: {
        prixBaseParNuit,
        prixMoyenNuit,
        prixNuitFinal,
        sousTotalHebergement: sousTotalHebergementHT,
        sousTotalHebergementApresPromo,
        nbNuits,
        nbWeekend,
        prixPetitDejeunerHT,
        prixEnfantsHT,
        prixLitsSuppHT,
        saison,
        coeffWeekend,
        coeffDegressif: nbNuits > 5 ? coeffDegressif : 1,
        detailNuits: {
          total: nbNuits,
          weekend: nbWeekend,
          semaine: nbNuits - nbWeekend
        },
        taxes: {
          tauxTVA: this.TAUX_TVA * 100,
          montantTVA: montantTVA,
          taxeSejour: taxeSejour,
          taxeSejourParNuitParPersonne
        }
      }
    };
  }

  /**
   * Trouver ou créer un tarif
   */
  private async findOrCreateTarif(chambreId: number, saison: Saison, dateReference: Date): Promise<Tariff> {
    let tarif = await Tariff.findOne({
      where: {
        chambreId,
        saison
      },
      order: [['dateApplication', 'DESC']]
    });

    if (!tarif) {
      console.log(`📝 Création d'un tarif par défaut pour chambre ${chambreId} saison ${saison}`);

      const defaultValues = this.getDefaultTarif(saison);

      tarif = await Tariff.create({
        chambreId,
        saison,
        prixBase: defaultValues.prixBase,
        prixPetitDejeuner: defaultValues.prixPetitDejeuner,
        prixLitSupplementaire: defaultValues.prixLitSupplementaire,
        prixEnfant: defaultValues.prixEnfant,
        coeffWeekend: defaultValues.coeffWeekend,
        coeffDegressif5Nuits: defaultValues.coeffDegressif,
        dateApplication: new Date(),
        dateFin: undefined,
        modifiePar: 1
      });

      console.log(`✅ Tarif créé avec succès pour chambre ${chambreId} saison ${saison}`);
      return tarif;
    }

    const dateApplication = new Date(tarif.dateApplication);
    const dateFin = tarif.dateFin ? new Date(tarif.dateFin) : undefined;

    if (dateApplication > dateReference || (dateFin && dateFin < dateReference)) {
      console.log(`🔄 Mise à jour du tarif pour chambre ${chambreId} saison ${saison}`);

      const newTarif = await Tariff.create({
        chambreId,
        saison,
        prixBase: tarif.prixBase,
        prixPetitDejeuner: tarif.prixPetitDejeuner || 15,
        prixLitSupplementaire: tarif.prixLitSupplementaire || 20,
        prixEnfant: tarif.prixEnfant || 10,
        coeffWeekend: tarif.coeffWeekend || 1.15,
        coeffDegressif5Nuits: tarif.coeffDegressif5Nuits || 0.9,
        dateApplication: new Date(),
        dateFin: undefined,
        modifiePar: 1
      });

      return newTarif;
    }

    return tarif;
  }

  /**
   * Valeurs par défaut pour les tarifs selon la saison
   */
  private getDefaultTarif(saison: Saison): {
    prixBase: number;
    prixPetitDejeuner: number;
    prixLitSupplementaire: number;
    prixEnfant: number;
    coeffWeekend: number;
    coeffDegressif: number;
  } {
    switch (saison) {
      case 'BASSE':
        return {
          prixBase: 68,
          prixPetitDejeuner: 12,
          prixLitSupplementaire: 15,
          prixEnfant: 8,
          coeffWeekend: 1.15,
          coeffDegressif: 0.9
        };
      case 'HAUTE':
        return {
          prixBase: 119,
          prixPetitDejeuner: 18,
          prixLitSupplementaire: 25,
          prixEnfant: 12,
          coeffWeekend: 1.15,
          coeffDegressif: 0.9
        };
      case 'MOYENNE':
      default:
        return {
          prixBase: 85,
          prixPetitDejeuner: 15,
          prixLitSupplementaire: 20,
          prixEnfant: 10,
          coeffWeekend: 1.15,
          coeffDegressif: 0.9
        };
    }
  }

  /**
   * Déterminer la saison selon la date
   */
  private determinerSaison(date: Date): Saison {
    const mois = date.getMonth() + 1;
    const jour = date.getDate();

    if (mois === 7 || mois === 8 || mois === 12) {
      return Saison.HAUTE;
    }

    if ((mois >= 4 && mois <= 6) || (mois >= 9 && mois <= 10)) {
      return Saison.MOYENNE;
    }

    return Saison.BASSE;
  }
}