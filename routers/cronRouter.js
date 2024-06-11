const router = require("express").Router();
const axios = require('axios');
const { createGhostJWT } = require('../utils/jwt');
const { getAllUnrewardedReferees, getRefereeRewardStatus, getReferrerRewardStatus, getAllUnrewardedReferrers } = require('../db/methods/referralMethods');
const { sendReferredEmail } = require('../scripts/ghost/sendReferredEmail');
const { sendRefereeReward } = require('../scripts/ghost/sendRefereeReward');
const { sendReferrerReward } = require('../scripts/ghost/sendReferrerReward');

const GHOST_API = process.env.GHOST_API;

router.get('/', async (req, res, next) => {
  try {
    const token = await createGhostJWT(); // Create a Ghost JWT for authentication
    const referees = await getAllUnrewardedReferees(); // Get all unrewarded referees from the database (these are just referees who have not openned enough emails yet)
    const elligibleReferrers = await getAllUnrewardedReferrers(); // Get all unrewarded referrers from the database (these are referrers who have not been rewarded even though their referees have)

    const eligibleReferees = []; // Array to store eligible referees

    for (const referee of referees) {
      try {
        let email = referee.email;
        if (email.includes('+')) {
          email = email.replace(/\+/g, '%2B'); // Quick fix for error uriEncoding email with a '+' in it
        }

        // Fetch the member data from the Ghost API
        const response = await axios.get(`${GHOST_API}/members/?filter=email:'${encodeURIComponent(email)}'`, {
          headers: {
            'Authorization': `Ghost ${token}`,
            'Content-Type': 'application/json',
            'Accept-Version': 'v5.82'
          }
        });

        if (response.data?.members && response.data?.members.length > 0) {
          const member = response.data.members[0];

          // if (member.email_opened_count >= 4) { // Check if the referee has opened at least 4 emails
          //   eligibleReferees.push(referee); // Add the referee to the eligible referees array
          // }
        }
      } catch (error) {
        console.warn('Error fetching member:', referee.email, error.message, error.response?.data);
      }
    }

    console.log('eligibleReferees:', eligibleReferees);
    console.log('elligibleReferrers:', elligibleReferrers);

    // Create email promises for eligible referees
    const refereeEmailPromises = eligibleReferees.map(async (referee) => {
      try {
        const refereeRewardResponse = await sendRefereeReward(referee.email); // Send the reward email to the referee
        return { referee: refereeRewardResponse };
      } catch (error) {
        console.error('Error sending referee reward email:', error);
        return { referee: false };
      }
    });

    // Create email promises for referrers
    const referrerEmailPromises = elligibleReferrers.map(async (referrer) => {
      try {
        const referrerRewardResponse = await sendReferrerReward(referrer.email); // Send the reward email to the referrer
        return { referrer: referrerRewardResponse };
      } catch (error) {
        console.error('Error sending referrer reward email:', error);
        return { referrer: false };
      }
    });

    try {
      const refereeResults = await Promise.all(refereeEmailPromises); // Wait for all referee email promises to resolve
      const refereeSuccessCount = refereeResults.filter((result) => result.referee).length; // Count successful referee emails
      const refereeFailureCount = refereeResults.filter((result) => !result.referee).length; // Count failed referee emails

      const referrerResults = await Promise.all(referrerEmailPromises); // Wait for all referrer email promises to resolve
      const referrerSuccessCount = referrerResults.filter((result) => result.referrer).length; // Count successful referrer emails
      const referrerFailureCount = referrerResults.filter((result) => !result.referrer).length; // Count failed referrer emails

      if (refereeSuccessCount === 0 && referrerSuccessCount === 0) {
        return res.status(404).json({
          message: 'No one was eligible for rewards.',
        });
      }

      // Send the response with the counts of successful and failed emails
      return res.status(200).json({
        message: `Successfully sent ${refereeSuccessCount} reward emails to referees, failed to send ${refereeFailureCount} emails to referees. Successfully sent ${referrerSuccessCount} reward emails to referrers, failed to send ${referrerFailureCount} emails to referrers.`,
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