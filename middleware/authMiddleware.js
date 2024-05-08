const prisma = require('../db/prisma');

async function authMiddleware(req, res, next) {
  const token = req.headers['x-client-token'];

  if (!token) {
    return res.status(401).json({ error: 'Missing client token' });
  }

  try {
    const clientToken = await prisma.clientToken.findUnique({
      where: {
        token,
      },
    });

    if (!clientToken) {
      return res.status(401).json({ error: 'Invalid client token' });
    }

    await prisma.clientToken.delete({
      where: {
        token,
      },
    });

    next();
  } catch (error) {
    console.error('Error in token middleware:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { authMiddleware };