const { createGhostJWT } = require('../../utils/jwt');
const { getNewsletterSlug } = require('./getNewsletterSlug');
const axios = require('axios');

const GHOST_API = process.env.GHOST_API;

const sendReferredEmail = async (email, name) => {
  const token = await createGhostJWT();

  const newsletterSlug = await getNewsletterSlug();

  try {
    // Create a draft post for the test email
    const createPostResponse = await axios.post(`${GHOST_API}/posts/`, {
      posts: [
        {
          title: 'Test Email',
          lexical: `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"You've been Referred to TFTC by ${name}","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`,
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