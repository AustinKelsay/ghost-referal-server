const express = require('express');
const referralRouter = require('./routers/referralRouter');
const cronRouter = require('./routers/cronRouter');
const { errorMiddleware } = require('./middleware/errorMiddleware');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.use('/referral', referralRouter);
app.use('/cron', cronRouter);

// Error handling middleware
app.use(errorMiddleware);

module.exports = app;