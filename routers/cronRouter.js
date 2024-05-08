const router = require("express").Router();
const axios = require('axios');
const { createGhostJWT } = require('../utils/jwt');
const {getAllReferees} = require('../db/methods/referralMethods');

const GHOST_API = process.env.GHOST_API;

router.get('/', async (req, res) => {
    const token = await createGhostJWT();
    const referees = await getAllReferees();

    axios.get(`${GHOST_API}/members/`, {
        headers: {
            'Authorization': `Ghost ${token}`,
            'Content-Type': 'application/json',
            'Accept-Version': 'v5.82'
        }
    }).then(response => {
        if (response.data?.members && response.data?.members.length > 0) {
            const members = response.data.members;
            console.log('Members:', members);
            // grab all of the members that are in the referees list and return the ones where "email_opened_count" === 3
            const elligibleReferees = members.filter(member => referees.some(referee => referee.email === member.email && member.email_opened_count === 3));
            console.log('elligibleReferees:', elligibleReferees);
            if (elligibleReferees.length === 0) {
                res.status(404).send('No elligible referees found');
            } else {
                // send emails with linsk to these eligible referees
                res.status(200).send(elligibleReferees);
            }
        }
    }).catch(error => {
        console.error('Error fetching members:', Object.keys(error), error?.message, error?.name, error.response?.data);
    });
});

router.post('/', async (req, res) => {
    const { referrerName, referrerEmail, refereeEmail } = req.body;
  
    const token = await createGhostJWT();
  
    try {
      // Fetch the member's UUID based on their email address
      const memberResponse = await axios.get(`${GHOST_API}/members/?filter=email:'${refereeEmail}'`, {
        headers: {
          'Authorization': `Ghost ${token}`,
          'Content-Type': 'application/json',
          'Accept-Version': 'v5.82'
        }
      });
  
      const member = memberResponse.data.members[0];

      console.log('Member:', member);
  
      if (!member) {
        throw new Error('Member not found');
      }
  
      const memberUUID = member.uuid;
  
      // Create a new draft post for the test email
      const createPostResponse = await axios.post(`${GHOST_API}/posts/`, {
        posts: [
          {
            title: 'Test Email',
            lexical: '{\"root\":{\"children\":[{\"children\":[{\"detail\":0,\"format\":0,\"mode\":\"normal\",\"style\":\"\",\"text\":\"This is a test email.\",\"type\":\"text\",\"version\":1}],\"direction\":\"ltr\",\"format\":\"\",\"indent\":0,\"type\":\"paragraph\",\"version\":1}],\"direction\":\"ltr\",\"format\":\"\",\"indent\":0,\"type\":\"root\",\"version\":1}}',
            status: 'draft',
            email_only: true
          }
        ]
      }, {
        headers: {
          'Authorization': `Ghost ${token}`,
          'Content-Type': 'application/json',
          'Accept-Version': 'v5.82'
        }
      });
  
      console.log('Create post response:', createPostResponse.data);
  
      const postId = createPostResponse.data.posts[0].id;
      const updatedAt = createPostResponse.data.posts[0].updated_at;
  
      console.log('Post ID:', postId);
      console.log('Updated At:', updatedAt);
  
      // Publish the post and send the test email to the specific member
      const putResponse = await axios.put(`${GHOST_API}/posts/${postId}/?newsletter=default-newsletter&email_segment=${encodeURIComponent(`uuid:${memberUUID}`)}`, {
        posts: [
          {
            status: 'published',
            updated_at: updatedAt,
            email: refereeEmail
          }
        ]
      }, {
        headers: {
          'Authorization': `Ghost ${token}`,
          'Content-Type': 'application/json',
          'Accept-Version': 'v5.82'
        }
      });

      console.log('Put response:', putResponse.data);
  
      res.status(200).json({ message: 'Test email sent successfully' });
    } catch (error) {
      console.error('Error sending test email:', error.message, error.response?.data);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  });

module.exports = router;