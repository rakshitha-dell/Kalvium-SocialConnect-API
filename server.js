const express = require('express');
const cors = require('cors');

const postsRouter = require('./routes/posts');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow all origins
app.use(express.json());

// Routes
app.use('/api', postsRouter);

// Health check
app.get('/', (req, res) => {
  res.send('SocialConnect API — healthy');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
