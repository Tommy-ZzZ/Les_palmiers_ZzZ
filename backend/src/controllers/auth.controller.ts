import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';

export class AuthController {
  /**
   * Connexion utilisateur
   * Conforme au CDC section 4.1 - Authentification par identifiant et mot de passe
   */
  async login(req: Request, res: Response) {
    try {
      const { login, motDePasse } = req.body;

      if (!login || !motDePasse) {
        return res.status(400).json({
          success: false,
          message: 'Identifiant et mot de passe requis'
        });
      }

      const user = await User.findOne({
        where: { login, actif: true }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Identifiant ou mot de passe incorrect'
        });
      }

      const isValidPassword = await bcrypt.compare(motDePasse, user.motDePasseHash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Identifiant ou mot de passe incorrect'
        });
      }

      // Mettre à jour la dernière connexion (RG7)
      await user.update({ derniereConnexion: new Date() });

      const token = jwt.sign(
        {
          id: user.id,
          login: user.login,
          role: user.role,
          nom: user.nom,
          prenom: user.prenom
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '15min' }
      );

      // Ne pas renvoyer le mot de passe hashé
      const userData = {
        id: user.id,
        login: user.login,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role
      };

      return res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        data: {
          token,
          user: userData
        }
      });

    } catch (error) {
      console.error('Erreur login:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la connexion'
      });
    }
  }

  /**
   * Déconnexion - côté client uniquement
   */
  async logout(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      message: 'Déconnexion réussie'
    });
  }

  /**
   * Récupérer l'utilisateur courant
   */
  async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }

      const user = await User.findByPk(userId, {
        attributes: ['id', 'login', 'nom', 'prenom', 'email', 'role', 'actif']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      return res.status(200).json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Erreur getCurrentUser:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération'
      });
    }
  }
}