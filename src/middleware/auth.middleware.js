const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET ;
const JWT_EXPIRY = process.env.JWT_EXPIRY ;

const generateToken = (userId, email) => {
  try {
    const token = jwt.sign(
      {
        userId,
        email,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRY,
        algorithm: 'HS256'
      }
    );
    return token;
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate token');
  }
};

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'No authorization header provided'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token has expired'
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    console.error('Token verification error:', error);
    return res.status(401).json({
      error: 'Token verification failed'
    });
  }
};

const refreshToken = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'User not authenticated'
      });
    }

    const newToken = generateToken(req.user.userId, req.user.email);

    res.set('X-New-Token', newToken);

    next();
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      error: 'Failed to refresh token'
    });
  }
};

const logout = (req, res) => {
  try {
    res.json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      error: 'Error logging out'
    });
  }
};

module.exports = { generateToken, verifyToken, refreshToken, logout };