import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService.js';

/**
 * Extended Request interface with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

/**
 * Authentication middleware
 * 
 * Verifies JWT token and attaches user info to request
 * Protects routes requiring authentication
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'No authorization header provided',
      });
      return;
    }

    // Check Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Invalid authorization format',
        error: 'Authorization header must be in format: Bearer <token>',
      });
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer '

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'No token provided',
      });
      return;
    }

    // Validate token
    const authService = new AuthService();
    const user = await authService.validateToken(token);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'Please login again',
      });
      return;
    }

    // Attach user info to request
    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
    };

    // Continue to next middleware/route handler
    next();
  } catch (error: any) {
    console.error('Authentication error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: 'Internal server error',
    });
  }
}



export default authenticate;
