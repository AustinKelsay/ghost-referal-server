const express = require('express');
const referralRouter = require('../routers/referralRouter');
const cronRouter = require('../routers/cronRouter');
const { errorMiddleware } = require('../middleware/errorMiddleware');
const { authMiddleware } = require('../middleware/authMiddleware');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.use('/referral', authMiddleware, referralRouter);
app.use('/cron', cronRouter);

// Error handling middleware
app.use(errorMiddleware);

module.exports = app;