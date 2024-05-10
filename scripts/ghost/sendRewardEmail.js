const { createGhostJWT } = require('../../utils/jwt');
const { fetchRewardLink } = require('../fetchRewardLink');
const { getNewsletterSlug } = require('./getNewsletterSlug');
const axios = require('axios');

const GHOST_API = process.env.GHOST_API;

const sendRewardEmail = async (email, referrerEmail) => {
  const token = await createGhostJWT();
  const refereeLink = await fetchRewardLink();

  const newsletterSlug = await getNewsletterSlug();

  console.log('newsletterSlug:', newsletterSlug);

  try {
    // Create a draft post for the test email
    const createPostResponse = await axios.post(`${GHOST_API}/posts/`, {
      posts: [
        {
          title: 'Test Email',
          lexical: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"This is a test email. Claim your reward here: ${refereeLink}","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
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
    const refereeEmailResponse = await axios.put(`${GHOST_API}/posts/${postId}/?newsletter=${newsletterSlug}&email_segment=email:'${email}'`, {      posts: [
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

    console.log('refereeEmailResponse:', refereeEmailResponse.data);

    if (referrerEmail) {
      const referrerLink = await fetchRewardLink();
      console.log('referrerLink:', referrerLink);

      // Create a draft post for the referrer email
      const createReferrerPostResponse = await axios.post(`${GHOST_API}/posts/`, {
        posts: [
          {
            title: 'Referral Email',
            lexical: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Your referee has claimed their reward. Claim your reward here: ${referrerLink}","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
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
      await axios.put(`${GHOST_API}/posts/${referrerPostId}/?newsletter=${newsletterSlug}&email_segment=email:'${referrerEmail}'`, {        posts: [
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

      console.log('Referrer email sent successfully');
    }

    return { message: 'Test reward email sent successfully' };
  } catch (error) {
    console.error('Error sending test reward email:', error.message, error.response?.data);
    throw new Error('Failed to send test email');
  }
};

module.exports = { sendRewardEmail };