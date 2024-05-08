const router = require("express").Router();
const axios = require('axios');
const { createGhostJWT } = require('../utils/jwt');
const { getAllReferees } = require('../db/methods/referralMethods');
const { sendEmail } = require('../scripts/sendEmail');

const GHOST_API = process.env.GHOST_API;

router.get('/', async (req, res) => {
  const token = await createGhostJWT();

  try {
    const referees = await getAllReferees();

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

      // Grab all of the members that are in the referees list and return the ones where "email_opened_count" === 3
      const eligibleReferees = members.filter(member =>
        referees.some(referee => referee.email === member.email && member.email_opened_count === 3)
      );

      console.log('eligibleReferees:', eligibleReferees);

      if (eligibleReferees.length === 0) {
        return res.status(404).json({ message: 'No eligible referees found' });
      }

      // Send emails with links to the eligible referees and their referrers
      const emailPromises = eligibleReferees.map(referee => sendEmail(referee.email, referee.referrer.email));

      try {
        await Promise.all(emailPromises);
        return res.status(200).json({ message: 'Emails sent successfully', referees: eligibleReferees });
      } catch (error) {
        console.error('Error sending emails:', error.message);
        return res.status(500).json({ error: 'Failed to send emails' });
      }
    } else {
      return res.status(404).json({ message: 'No members found' });
    }
  } catch (error) {
    console.error('Error fetching members:', error.message, error.response?.data);
    return res.status(500).json({ error: 'Failed to fetch members' });
  }
});

module.exports = router;