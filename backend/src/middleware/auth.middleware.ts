import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'login', 'nom', 'prenom', 'email', 'role', 'actif']
    });

    if (!user || !user.actif) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé ou inactif'
      });
    }

    (req as any).user = user;
    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expiré'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Erreur d\'authentification'
    });
  }
};

export const isGerante = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (user?.role !== 'GERANTE') {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé - Réservé à la gérante'
    });
  }
  next();
};

export const isGeranteOrComptable = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (user?.role !== 'GERANTE' && user?.role !== 'COMPTABLE') {
    return res.status(403).json({
      success: false,
      message: 'Accès refusé - Réservé à la gérante ou au comptable'
    });
  }
  next();
};