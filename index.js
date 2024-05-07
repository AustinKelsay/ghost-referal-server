const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World');
});

// Example endpoint to create a referrer
app.post('/referrer', async (req, res) => {
  const { name, email } = req.body;
  try {
    const referrer = await prisma.referrer.create({
      data: {
        name,
        email,
      },
    });
    res.json(referrer);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
