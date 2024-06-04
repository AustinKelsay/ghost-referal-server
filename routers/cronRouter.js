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
                
                if (member.email_opened_count >= 0 && member.email === "austinkelsay11@gmail.com") {
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

    const emailPromises = eligibleReferees.map(async (referee) => {
      try {
        const refereeRewardResponse = await sendRefereeReward(referee.email);

        if (refereeRewardResponse && referee?.referrer.successfulReferrals < 1) {
          const referrerRewardResponse = await sendReferrerReward(referee.referrer.email);
          return { referee: refereeRewardResponse, referrer: referrerRewardResponse };
        } else {
          return { referee: refereeRewardResponse, referrer: null };
        }
      } catch (error) {
        console.error('Error sending reward emails:', error);
        return { referee: false, referrer: false };
      }
    });

    try {
      const results = await Promise.all(emailPromises);
      const successCount = results.filter((result) => result.referee).length;
      const failureCount = results.filter((result) => !result.referee).length;

      return res.status(200).json({
        message: `Successfully sent ${successCount} reward emails, failed to send ${failureCount} emails`,
      });
    } catch (error) {
      console.error('Error processing emails:', error);
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