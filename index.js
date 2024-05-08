const express = require('express');
const referralRouter = require('./routers/referralRouter');
const cronRouter = require('./routers/cronRouter');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use('/referral', referralRouter);
app.use('/cron', cronRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
