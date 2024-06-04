const { createGhostJWT } = require('../../utils/jwt');
const { fetchRewardLink } = require('../fetchRewardLink');
const { getNewsletterSlug } = require('./getNewsletterSlug');
const { incrementReferrerSuccessfulReferrals } = require('../../db/methods/referralMethods');
const axios = require('axios');

const GHOST_API = process.env.GHOST_API;

const sendReferrerReward = async (email) => {
    const token = await createGhostJWT();

    const newsletterSlug = await getNewsletterSlug();

    try {
        const referrerLink = await fetchRewardLink();

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
      const updateReferrerPostResponse = await axios.put(`${GHOST_API}/posts/${referrerPostId}/?newsletter=${newsletterSlug}&email_segment=email:'${email}'`, {
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

    // if the email was sent successfully to the referrer increment their successful referrals
    if (updateReferrerPostResponse.data.posts[0].status === 'sent') {
      await incrementReferrerSuccessfulReferrals(email);
      return { message: 'Reward emails sent successfully' };
    } else {
      return { message: 'Referrer reward email failed to send, but referee reward email sent successfully' };
    }

    } catch (error) {
        console.error('Error sending test reward email:', error.message, error.response?.data);
        throw new Error('Failed to send test email');
      }
}

module.exports = { sendReferrerReward };
