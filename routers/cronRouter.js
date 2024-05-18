const router = require("express").Router();
const axios = require('axios');
const { createGhostJWT } = require('../utils/jwt');
const { getAllReferees, deleteReferee } = require('../db/methods/referralMethods');
const { sendRewardEmail } = require('../scripts/ghost/sendRewardEmail');
const {sendReferredEmail} = require('../scripts/ghost/sendReferredEmail');

const GHOST_API = process.env.GHOST_API;

router.get('/', async (req, res, next) => {
  try {
    const token = await createGhostJWT();
    const referees = await getAllReferees();

    console.log('Referees:', referees);

    if (!referees || referees?.length === 0) {
      return res.status(404).json({ message: 'No referees found' });
    }

    const eligibleReferees = [];

    for (const referee of referees) {
        try {

            const response = await axios.get(`${GHOST_API}/members/?filter=email:${encodeURIComponent(referee.email)}`, {
                headers: {
                    'Authorization': `Ghost ${token}`,
                    'Content-Type': 'application/json',
                    'Accept-Version': 'v5.82'
                }
            });

            console.log('Response for fetch member by referee email:', response.data, response.data.newsletters);
            
            if (response.data?.members && response.data?.members.length > 0) {
                const member = response.data.members[0];
                
                if (member.email_opened_count >= 1 && member.email === "austinkelsay11@gmail.com") {
                    eligibleReferees.push(referee);
                }
            }
        } catch (error) {
            console.warn('Error fetching member:', referee.email, error.message, error.response?.data);
        }
    }

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
      const emailResponse = await sendReferredEmail(refereeEmail, referrerName);
      if (emailResponse) {
        return res.status(200).send(emailResponse);
      }
    } catch (error) {
      console.error('Error sending referred email:', error.message, error.stack, {
        requestData: req.body,
        responseData: error.response?.data,
      });
      return next(error);
    }
  });

module.exports = router;