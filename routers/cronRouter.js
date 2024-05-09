const router = require("express").Router();
const axios = require('axios');
const { createGhostJWT } = require('../utils/jwt');
const { getAllReferees } = require('../db/methods/referralMethods');
const { sendRewardEmail } = require('../scripts/ghost/sendRewardEmail');
const GHOST_API = process.env.GHOST_API;

router.get('/', async (req, res, next) => {
  try {
    const token = await createGhostJWT();
    const referees = await getAllReferees();

    if (referees?.length === 0) {
      return res.status(404).json({ message: 'No referees found' });
    }

    console.log('Referees:', referees);

    const response = await axios.get(`${GHOST_API}/members/`, {
      headers: {
        'Authorization': `Ghost ${token}`,
        'Content-Type': 'application/json',
        'Accept-Version': 'v5.82'
      }
    });

    if (response.data?.members && response.data?.members.length > 0) {
      const members = response.data.members;
      console.log('Members:', members);

      const eligibleReferees = members.filter(member =>
        referees.some(referee => referee.email === member.email && member.email_opened_count === 3)
      );
      console.log('eligibleReferees:', eligibleReferees);

      if (eligibleReferees.length === 0) {
        return res.status(404).json({ message: 'No eligible referees found' });
      }

      const emailPromises = eligibleReferees.map(referee =>
        sendRewardEmail(referee.email, referee.referrer.email)
          .then(() => deleteReferee(referee.email))
          .catch(error => {
            console.error('Error sending email or deleting referee:', referee.email, error);
            throw new Error(`Failed to send email or delete referee: ${referee.email}`);
          })
      );

      try {
        await Promise.all(emailPromises);
        return res.status(200).json({ message: 'Emails sent and referees deleted successfully', referees: eligibleReferees });
      } catch (error) {
        console.error('Error processing emails or deletions:', error);
        return next(error);
      }
    } else {
      return res.status(404).json({ message: 'No members found' });
    }
  } catch (error) {
    console.error('Error fetching members:', error.message, error.stack, {
      requestData: req.body,
      responseData: error.response?.data,
    });
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { referrerName, referrerEmail, refereeEmail } = req.body;
    const emailResponse = await sendRewardEmail(refereeEmail, referrerEmail);
    console.log('Email response on endpoint:', emailResponse);
    if (emailResponse.error) {
      const error = new Error('Error sending email');
      error.statusCode = 500;
      throw error;
    } else {
      return res.status(200).send(emailResponse);
    }
  } catch (error) {
    return next(error);
  }
});

module.exports = router;