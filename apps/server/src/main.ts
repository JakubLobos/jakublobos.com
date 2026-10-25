import express from 'express';

// Deliberately minimal; T-011 replaces this with the real server structure.
const app = express();

app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port);
