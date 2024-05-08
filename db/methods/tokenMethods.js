const { prisma } = require('../prisma');
const { v4: uuidv4 } = require('uuid');

async function createClientToken() {
  const token = uuidv4();

  try {
    const createdToken = await prisma.clientToken.create({
      data: {
        token,
      },
    });

    console.log('Token created:', createdToken);
    return createdToken;
  } catch (error) {
    console.error('Error creating token:', error);
    throw error;
  }
}

async function deleteClientTokenByToken(tokenValue) {
    try {
      const deletedToken = await prisma.clientToken.delete({
        where: {
          token: tokenValue,
        },
      });
  
      console.log('Token deleted:', deletedToken);
      return deletedToken;
    } catch (error) {
      console.error('Error deleting token:', error);
      throw error;
    }
  }

module.exports = { createClientToken, deleteClientTokenByToken };