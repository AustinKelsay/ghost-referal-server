const express = require('express');
const referralRouter = require('./routers/referralRouter');
const cronRouter = require('./routers/cronRouter');
const { errorMiddleware } = require('./middleware/errorMiddleware');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(cors());
// restrict to only form website?
// app.use(cors({
//   origin: 'https://your-client-app-url.com',
//   methods: ['GET', 'POST'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  trustProxy: true,
  proxy: true
});

app.use(limiter);

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.use('/referral', referralRouter);
app.use('/cron', cronRouter);

app.use(errorMiddleware);

// app.listen(3000, () => {
//   console.log('Server is running on port 3000');
// });

module.exports = app;