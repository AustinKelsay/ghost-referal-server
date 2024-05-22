const { createGhostJWT } = require('../../utils/jwt');
const { getNewsletterSlug } = require('./getNewsletterSlug');
const axios = require('axios');

const GHOST_API = process.env.GHOST_API;

const sendReferredEmail = async (email, name, referrerEmail) => {
  const token = await createGhostJWT();

  const newsletterSlug = await getNewsletterSlug();

  try {
    // Create a draft post for the test email
    const createPostResponse = await axios.post(`${GHOST_API}/posts/`, {
      posts: [
        {
          title: "You've been invited to the TFTC community",
          lexical: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Hey there! You have been invited to the TFTC (Truth for the Commoner) community by a friend who believes that you would get value out of the content we produce here at TFTC.\\n\\nYou are now officially a part of the TFTC community, have been automatically enrolled in our rewards program, and will receive a link redeemable for some bitcoin after reading three newsletters.\\n\\nOur hope is that we prove to you that we are a valuable source of information after reading three of our newsletters, that you continue reading, and feel compelled to tell others about what we're up to at TFTC.\\n\\nWe look forward to earning your attention and hope that our offer of some bitcoin after reading a few newsletters is a step toward building trust between yourself and TFTC.\\n\\nBest,\\n\\nMarty\\nFounder of TFTC","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
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

    // Publish the post to trigger email sending to a single email address
    const emailResponse = await axios.put(`${GHOST_API}/posts/${postId}/?newsletter=${newsletterSlug}&email_segment=email:'${email}'`, {
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

    if (emailResponse.data.posts[0].status === 'published') {
      console.log('Test referred email sent successfully:', email);
      return emailResponse.data;
    }
  } catch (error) {
    console.error('Error sending referred test email:', error.message, error.response?.data);
    throw new Error('Failed to send test email');
  }
};

module.exports = { sendReferredEmail };