import { AuditLog } from '../models';

export class AuditService {
  async logAction(
    utilisateurId: number | undefined,
    action: string,
    entite: string,
    entiteId: number | undefined,
    ancienneValeur: any,
    nouvelleValeur: any,
    adresseIp?: string
  ) {
    try {
      await AuditLog.create({
        utilisateurId: utilisateurId || undefined,
        action,
        entite,
        entiteId,
        ancienneValeur: ancienneValeur ? JSON.parse(JSON.stringify(ancienneValeur)) : null,
        nouvelleValeur: nouvelleValeur ? JSON.parse(JSON.stringify(nouvelleValeur)) : null,
        adresseIp
      });
    } catch (error) {
      console.error('Erreur audit:', error);
    }
  }
}