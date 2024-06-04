const router = require("express").Router();
const { getAllReferees } = require('../db/methods/referralMethods');
const { fetchRewardLink } = require('../scripts/fetchRewardLink');
const { getNewsletterSlug } = require('../scripts/ghost/getNewsletterSlug');
const { createGhostJWT } = require('../utils/jwt');
const axios = require('axios');

const GHOST_API = process.env.GHOST_API;

// simply get all the referees and return them
router.get('/', async (req, res, next) => {
  try {
    const referees = await getAllReferees();

    if (!referees || referees?.length === 0) {
      return res.status(404).json({ message: 'No referees found' });
    }

    return res.status(200).json({ referees });
  } catch (error) {
    console.error('Error fetching referees:', error.message, error.stack);
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
    const { referrerEmail } = req.body;
    const referrerLink = await fetchRewardLink();
    const newsletterSlug = await getNewsletterSlug();
    const token = await createGhostJWT();

    const createPostResponse = await axios.post(`${GHOST_API}/posts/`, {
        posts: [
          {
            title: "Congrats! You've Unlocked A TFTC Reward - Claim Here",
            lexical: JSON.stringify({
              "root": {
                "children": [
                  {
                    "children": [
                      {
                        "detail": 0,
                        "format": 0,
                        "mode": "normal",
                        "style": "",
                        "text": `Since you opened three newsletters after being referred by a friend within the TFTC community you are receiving a bitcoin reward as a token of our appreciation. Thank you for taking time out of your day to read our content.\n\nClick the link button below to claim your reward. This reward can be claimed using a bitcoin wallet that has the Lightning Network enabled. If you don't have a Lightning Network enabled wallet already there are some suggestions on the \"Redeem\" page.\n\nUnlock more rewards by inviting a friend who you think will get value out of our content. https://tftc-referral-form.vercel.app/ \n\nClaim your reward here: ${referrerLink}`,
                        "type": "extended-text",
                        "version": 1
                      }
                    ],
                    "direction": "ltr",
                    "format": "",
                    "indent": 0,
                    "type": "paragraph",
                    "version": 1
                  }
                ],
                "direction": "ltr",
                "format": "",
                "indent": 0,
                "type": "root",
                "version": 1
              }
            }),
            status: 'draft',
            email_only: true,
          },
        ],
      }, {
        headers: {
          'Authorization': `Ghost ${token}`,
          'Content-Type': 'application/json',
          'Accept-Version': 'v5.82',
        },
      });
  
      const postId = createPostResponse.data.posts[0].id;
      const updatedAt = createPostResponse.data.posts[0].updated_at;
  
      // Publish the post to trigger email sending
      const refereeEmailResponse = await axios.put(`${GHOST_API}/posts/${postId}/?newsletter=${newsletterSlug}&email_segment=email:'${referrerEmail}'`, {
        posts: [
          {
            status: 'published',
            updated_at: updatedAt,
          },
        ],
      }, {
        headers: {
          'Authorization': `Ghost ${token}`,
          'Content-Type': 'application/json',
          'Accept-Version': 'v5.82',
        },
      });

      // Extract relevant data from the response
    const { id, title, status } = refereeEmailResponse.data.posts[0];

    // Send the extracted data in the JSON response
    res.status(200).json({ id, title, status });
});

module.exports = router;