const jwt = require('jsonwebtoken');

const key = process.env.GHOST_API_KEY;

const createGhostJWT = async () => {
    // Split the key into ID and SECRET
    const [id, secret] = key.split(':');

    console.log('ID:', id);
    console.log('Secret:', secret);

    // Create the token (including decoding secret)
    const token = jwt.sign({}, Buffer.from(secret, 'hex'), {
        keyid: id,
        algorithm: 'HS256',
        expiresIn: '5m',
        audience: `/admin/`
    });

    return token;
};


module.exports = { createGhostJWT };