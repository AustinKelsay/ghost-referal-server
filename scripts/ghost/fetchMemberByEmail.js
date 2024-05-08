const axios = require('axios');

const GHOST_API = process.env.GHOST_API;

const fetchMemberByEmail = async (email, token) => {
    try {
        const response = await axios.get(`${GHOST_API}/members/?filter=email:'${email}'`, {
            headers: {
                'Authorization': `Ghost ${token}`,
                'Content-Type': 'application/json',
                'Accept-Version': 'v5.82'
            }
        });
        if (response.data?.members && response.data?.members.length > 0) {
            return { status: 'found' };
        } else {
            return { status: 'not found' };
        }
    } catch (error) {
        console.error('Error fetching members:', Object.keys(error), error?.message, error?.name, error.response?.data);
        throw new Error('Error fetching member data');
    }
}

module.exports = { fetchMemberByEmail };
