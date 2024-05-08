const { createGhostJWT } = require('../utils/jwt');
const { fetchRewardLink } = require('./fetchRewardLink');
const axios = require('axios');

const GHOST_API = process.env.GHOST_API;

const sendEmail = async (email, referrerEmail) => {
    const token = await createGhostJWT();

    console.log('Attempting to send test email to:', email);

    try {
        // Fetch the member's UUID based on their email address
        const memberResponse = await axios.get(`${GHOST_API}/members/?filter=email:'${email}'`, {
            headers: {
                'Authorization': `Ghost ${token}`,
                'Content-Type': 'application/json',
                'Accept-Version': 'v5.82'
            }
        });

        const member = memberResponse.data.members[0];

        if (!member) {
            throw new Error('Member not found');
        }

        const memberUUID = member.uuid;

        const link = await fetchRewardLink();

        // Create a new draft post for the test email
        const createPostResponse = await axios.post(`${GHOST_API}/posts/`, {
            posts: [
                {
                    title: 'Test Email',
                    lexical: `{\"root\":{\"children\":[{\"children\":[{\"detail\":0,\"format\":0,\"mode\":\"normal\",\"style\":\"\",\"text\":\"This is a test email. Claim your reward here: ${link}\",\"type\":\"text\",\"version\":1}],\"direction\":\"ltr\",\"format\":\"\",\"indent\":0,\"type\":\"paragraph\",\"version\":1}],\"direction\":\"ltr\",\"format\":\"\",\"indent\":0,\"type\":\"root\",\"version\":1}}`,
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

        if (referrerEmail) {
            // Send email to the referrer
            const referrerLink = await fetchRewardLink();
            const referrerCreatePostResponse = await axios.post(`${GHOST_API}/posts/`, {
                posts: [
                    {
                        title: 'Referral Email',
                        lexical: `{\"root\":{\"children\":[{\"children\":[{\"detail\":0,\"format\":0,\"mode\":\"normal\",\"style\":\"\",\"text\":\"Your referee has claimed their reward. Claim your reward here: ${referrerLink}\",\"type\":\"text\",\"version\":1}],\"direction\":\"ltr\",\"format\":\"\",\"indent\":0,\"type\":\"paragraph\",\"version\":1}],\"direction\":\"ltr\",\"format\":\"\",\"indent\":0,\"type\":\"root\",\"version\":1}}`,
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

            const referrerPostId = referrerCreatePostResponse.data.posts[0].id;
            const referrerUpdatedAt = referrerCreatePostResponse.data.posts[0].updated_at;

            await axios.put(`${GHOST_API}/posts/${referrerPostId}/?newsletter=default-newsletter&email_segment=${encodeURIComponent(`email:"${referrerEmail}"`)}`, {
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
        }

        const postId = createPostResponse.data.posts[0].id;
        const updatedAt = createPostResponse.data.posts[0].updated_at;

        // Publish the post and send the test email to the specific member
        const putResponse = await axios.put(`${GHOST_API}/posts/${postId}/?newsletter=default-newsletter&email_segment=${encodeURIComponent(`uuid:${memberUUID}`)}`, {
            posts: [
                {
                    status: 'published',
                    updated_at: updatedAt
                }
            ]
        }, {
            headers: {
                'Authorization': `Ghost ${token}`,
                'Content-Type': 'application/json',
                'Accept-Version': 'v5.82'
            }
        });

        console.log('SendEmail Put response:', putResponse.data);

        if (putResponse.data.posts[0].status !== 'published') {
            throw new Error('Failed to send test email');
        }

        return { message: 'Test email sent successfully' };
    } catch (error) {
        console.error('Error sending test email:', error.message, error.response?.data);
        throw new Error('Failed to send test email');
    }
};

module.exports = { sendEmail };