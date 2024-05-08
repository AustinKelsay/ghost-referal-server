const router = require("express").Router();
const axios = require('axios');
const { createGhostJWT } = require('../utils/jwt');
const { createReferral } = require('../db/methods/referralMethods');
const { fetchMemberByEmail } = require('../scripts/ghost/fetchMemberByEmail');
const { authMiddleware } = require('../middleware/authMiddleware');
const GHOST_API = process.env.GHOST_API;

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { referrerName, referrerEmail, refereeEmail } = req.body;
    const token = await createGhostJWT();
    const refereeStatus = await fetchMemberByEmail(refereeEmail, token);
    const referrerStatus = await fetchMemberByEmail(referrerEmail, token);

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