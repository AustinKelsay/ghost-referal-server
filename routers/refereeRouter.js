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

      // Create a draft post for the referrer email
      const createReferrerPostResponse = await axios.post(`${GHOST_API}/posts/`, {
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
                        "text": `Since your friend opened three newsletters after you referred them, you are receiving a bitcoin reward as a token of our appreciation. Thank you for helping us grow the TFTC community!\n\nClick the link below to claim your reward. This reward can be claimed using a bitcoin wallet that has the Lightning Network enabled. If you don't have a Lightning Network enabled wallet already there are some suggestions on the \"Redeem\" page.\n\nThis is only the beginning for the TFTC rewards program. We will be adding more ways to earn rewards while interacting with our content and helping us expand our community in the near future. Stay tuned!\n\nClaim your reward here: ${referrerLink}`,
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
            visibility: 'none',
          },
        ],
      }, {
        headers: {
          'Authorization': `Ghost ${token}`,
          'Content-Type': 'application/json',
          'Accept-Version': 'v5.82',
        },
      });

      const referrerPostId = createReferrerPostResponse.data.posts[0].id;
      const referrerUpdatedAt = createReferrerPostResponse.data.posts[0].updated_at;

      // Publish the referrer post to trigger email sending
      const updateReferrerPostResponse = await axios.put(`${GHOST_API}/posts/${referrerPostId}/?newsletter=${newsletterSlug}&email_segment=email:'${referrerEmail}'`, {
        posts: [
          {
            status: 'published',
            updated_at: referrerUpdatedAt,
          },
        ],
      }, {
        headers: {
          'Authorization': `Ghost ${token}`,
          'Content-Type': 'application/json',
          'Accept-Version': 'v5.82',
        },
      });

      res.status(200).json({ updateReferrerPostResponse });
});

module.exports = router;