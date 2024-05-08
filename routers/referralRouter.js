const router = require("express").Router();
const axios = require('axios');
const { createGhostJWT } = require('../utils/jwt');
const { createReferral } = require('../db/methods/referralMethods');
const { fetchMemberByEmail } = require('../scripts/ghost/fetchMemberByEmail');
const GHOST_API = process.env.GHOST_API;

router.post('/', async (req, res) => {
    const { referrerName, referrerEmail, refereeEmail } = req.body;
    try {
        const token = await createGhostJWT();
        const refereeStatus = await fetchMemberByEmail(refereeEmail, token);
        const referrerStatus = await fetchMemberByEmail(referrerEmail, token);

        if (refereeStatus.status === 'found' && referrerStatus.status === 'found') {
            res.status(400).send('Both referee and referrer are already members.');
        } else if (refereeStatus.status === 'found') {
            res.status(400).send('Referee is already a member.');
        } else if (referrerStatus.status === 'found') {
            // Attempt to create the new member since referee is not a member
            axios.post(`${GHOST_API}/members/`, {
                members: [{ email: refereeEmail }]
            }, {
                headers: {
                    'Authorization': `Ghost ${token}`,
                    'Content-Type': 'application/json',
                    'Accept-Version': 'v5.82'
                }
            }).then(response => {
                console.log('Response for create member:', response.data);
                createReferral(referrerName, referrerEmail, refereeEmail)
                    .then(referral => {
                        if (referral.error) {
                            res.status(400).send(referral.error);
                        } else {
                            res.status(200).send(referral);
                        }
                    })
                    .catch(error => {
                        res.status(500).send('Error creating referral');
                    });
            }).catch(error => {
                console.error('Error creating referee:', Object.keys(error), error?.message, error?.name, error?.response?.data);
                res.status(500).send('Error in member creation');
            });
        } else {
            res.status(400).send('Referrer is not a member.');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error processing your request');
    }
});

module.exports = router;
