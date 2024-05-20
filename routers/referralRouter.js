const router = require("express").Router();
const axios = require('axios');
const prisma = require('../db/prisma');
const { createGhostJWT } = require('../utils/jwt');
const { createReferral } = require('../db/methods/referralMethods');
const { fetchMemberByEmail } = require('../scripts/ghost/fetchMemberByEmail');
const {sendReferredEmail} = require('../scripts/ghost/sendReferredEmail');
const GHOST_API = process.env.GHOST_API;

router.post('/', async (req, res, next) => {
  try {
    const { referrerName, referrerEmail, refereeEmail } = req.body;
    const token = await createGhostJWT();

    const refereeStatus = await fetchMemberByEmail(refereeEmail, token);
    const referrerStatus = await fetchMemberByEmail(referrerEmail, token);

    // Check if the referrer already exists in the database
    const existingReferrer = await prisma.referrer.findUnique({
      where: { email: referrerEmail },
    });

    if (existingReferrer) {
      const error = new Error('Referrer has already made a referral.');
      error.statusCode = 400;
      throw error;
    }

    if (refereeStatus.status === 'found' && referrerStatus.status === 'found') {
      const error = new Error('Both referee and referrer are already members.');
      error.statusCode = 400;
      throw error;
    } else if (refereeStatus.status === 'found') {
      const error = new Error('Referee is already a member.');
      error.statusCode = 400;
      throw error;
    } else if (referrerStatus.status === 'found') {
      try {
        const response = await axios.post(`${GHOST_API}/members/`, {
          members: [{ email: refereeEmail }]
        }, {
          headers: {
            'Authorization': `Ghost ${token}`,
            'Content-Type': 'application/json',
            'Accept-Version': 'v5.82'
          }
        });
        console.log('Response for create member:', response.data);

        const referral = await createReferral(referrerName, referrerEmail, refereeEmail);
        if (referral.error) {
          const error = new Error(referral.error);
          error.statusCode = 400;
          throw error;
        } else {
          await sendReferredEmail(refereeEmail, referrerName);
          return res.status(200).send(referral);
        }
      } catch (error) {
        console.error('Error creating referee:', error.message, error.stack, {
          requestData: req.body,
          responseData: error.response?.data,
        });
        return next(error);
      }
    } else {
      const error = new Error('Referrer is not a member.');
      error.statusCode = 400;
      throw error;
    }
  } catch (error) {
    return next(error);
  }
});

module.exports = router;