const { createGhostJWT } = require('../../utils/jwt');
const axios = require('axios');

const GHOST_API = process.env.GHOST_API;

const getNewsletterSlug = async () => {
  const token = await createGhostJWT();

  try {
    // Retrieve the list of newsletters
    const response = await axios.get(`${GHOST_API}/newsletters/?limit=all`, {
      headers: {
        'Authorization': `Ghost ${token}`,
        'Accept-Version': 'v5.82',
      },
    });

    const newsletters = response.data.newsletters;

    // Find the desired newsletter by name or other criteria
    const desiredNewsletter = newsletters.find(newsletter => newsletter.name === 'Test-Email-Newsletter');

    if (desiredNewsletter) {
      return desiredNewsletter.slug;
    } else {
      throw new Error('Newsletter not found');
    }
  } catch (error) {
    console.error('Error retrieving newsletter slug:', error.message, error.response?.data);
    throw new Error('Failed to retrieve newsletter slug');
  }
};

module.exports = { getNewsletterSlug };