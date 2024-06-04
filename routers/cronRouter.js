const router = require("express").Router();
const axios = require('axios');
const { createGhostJWT } = require('../utils/jwt');
const { getAllUnrewardedReferees } = require('../db/methods/referralMethods');
const { sendReferredEmail } = require('../scripts/ghost/sendReferredEmail');
const {sendRefereeReward} = require('../scripts/ghost/sendRefereeReward');
const {sendReferrerReward} = require('../scripts/ghost/sendReferrerReward');

const GHOST_API = process.env.GHOST_API;

router.get('/', async (req, res, next) => {
  try {
    const token = await createGhostJWT();
    const referees = await getAllUnrewardedReferees();

    if (!referees || referees?.length === 0) {
      return res.status(404).json({ message: 'No elligible referees found' });
    }

    const eligibleReferees = [];

    for (const referee of referees) {
        try {
          // Quick fix for error uriEncoding email with a + in it
            let email = referee.email;
            if (email.includes('+')) {
                email = email.replace(/\+/g, '%2B');
            }

            const response = await axios.get(`${GHOST_API}/members/?filter=email:'${encodeURIComponent(email)}'`, {
                headers: {
                    'Authorization': `Ghost ${token}`,
                    'Content-Type': 'application/json',
                    'Accept-Version': 'v5.82'
                }
            });
            
            if (response.data?.members && response.data?.members.length > 0) {
                const member = response.data.members[0];
                
                if (member.email_opened_count >= 4) {
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

    const emailPromises = eligibleReferees.map((referee) => {
      const refereeRewardResponse = sendRefereeReward(referee.email);
      // if the referee response was successful and the referrer has less than 1 "successfulReferrals" than send the referrer reward email and increment their successful referrals
      if (refereeRewardResponse && referee?.referrer.successfulReferrals < 1) {
        const referrerRewardResponse = sendReferrerReward(referee.referrer.email);
        return Promise.all([refereeRewardResponse, referrerRewardResponse]);
      } else {
        return refereeRewardResponse;
      }
    })

    try {
      await Promise.all(emailPromises);
      return res.status(200).json({ message: 'Emails sent successfully' });
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

// router.post('/', async (req, res, next) => {
//     try {
//       const { referrerName, referrerEmail, refereeEmail } = req.body;
//       const emailResponse = await sendReferredEmail(refereeEmail, referrerName, referrerEmail);
//       if (emailResponse) {
//         return res.status(200).json({ message: 'Referred email sent successfully', emailResponse });
//       }
//     } catch (error) {
//       console.error('Error sending referred email:', error.message, error.stack, {
//         requestData: req.body,
//         responseData: error.response?.data,
//       });
//       return next(error);
//     }
//   });

module.exports = router;