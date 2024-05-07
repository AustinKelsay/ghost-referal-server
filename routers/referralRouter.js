const router = require("express").Router();
const axios = require('axios');
const { createGhostJWT } = require('../utils/jwt');
const {createReferral} = require('../db/methods/referralMethods');

const GHOST_API = process.env.GHOST_API;
const GHOST_API_KEY = process.env.GHOST_API_KEY;

router.post('/', async (req, res) => {
    const { referrerName, referrerEmail, refereeEmail } = req.body;
    const token = await createGhostJWT();
    // 1. Fetch the referee by email
    // 2. If the referee exists return a unique error because you cannot refer someone who is already a member
    // 3. If the referee does not exist, create a new member with the email
    // 4. If the referee is successfully created, save the referrer and the referee in the database

    axios.get(`${GHOST_API}/members/?filter=email:'${refereeEmail}'`, {
        headers: {
            'Authorization': `Ghost ${token}`,
            'Content-Type': 'application/json',
            'Accept-Version': 'v5.82'
        }
    }).then(response => {
        console.log('Response:', response.data);
        if (response.data?.members && response.data?.members.length > 0) {
            res.status(400).send('Referee is already a member');
        } else {
            axios.post(`${GHOST_API}/members/`, {
                members: [{
                    email: refereeEmail
                }]
            }, {
                headers: {
                    'Authorization': `Ghost ${token}`,
                    'Content-Type': 'application/json',
                    'Accept-Version': 'v5.82'
                }
            }).then(response => {
                console.log('Response for createmember:', response.data);

                createReferral(referrerName, referrerEmail, refereeEmail).then(referral => {
                    if (!referral) {
                        res.status(500).send('Error creating referral');
                    } else {
                        res.status(200).send(referral);
                    }
                });
            }
            ).catch(error => {
                console.error('Error creating referee:', Object.keys(error), error?.message, error?.name, error?.response?.data);
            });
        }
    }).catch(error => {
        console.error('Error fetching members:', Object.keys(error), error?.message, error?.name, error.response?.data);
    });
});

module.exports = router;