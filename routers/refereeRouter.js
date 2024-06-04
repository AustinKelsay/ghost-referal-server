const router = require("express").Router();
const { getAllReferees } = require('../db/methods/referralMethods');

// simply get all the referees and return them
router.get('/', async (req, res, next) => {
  try {
    const referees = await getAllReferees();

    if (!referees || referees?.length === 0) {
      return res.status(404).json({ message: 'No referees found' });
    }

    return res.status(200).json({ referees });
  } catch (error) {
    console.error('Error fetching referees:', error.message, error.stack);
    return next(error);
  }
});

module.exports = router;