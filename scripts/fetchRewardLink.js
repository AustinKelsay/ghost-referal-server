const axios = require('axios');

const BITCOIN_LINK_API = process.env.BITCOIN_LINK_API;
const BITCOIN_LINK_SECRET = process.env.BITCOIN_LINK_SECRET;

const fetchRewardLink = async () => {
  try {
    const response = await axios.get(`${BITCOIN_LINK_API}`, {
      headers: {
        'Authorization': BITCOIN_LINK_SECRET,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response from fetchRewardLink:', response.data);

    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error(`Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      console.error(`Error response status: ${status}`);
      console.error(`Error response data: ${JSON.stringify(data)}`);

      if (status === 401) {
        throw new Error('Unauthorized: Invalid or missing token');
      } else if (status === 404) {
        throw new Error('Link not found');
      } else {
        throw new Error(`Server responded with status code ${status}`);
      }
    } else if (error.request) {
      console.error('No response received from the server');
      throw new Error('No response received from the server');
    } else {
      console.error('Error', error.message);
      throw new Error(`Request setup error: ${error.message}`);
    }
  }
};

module.exports = { fetchRewardLink };