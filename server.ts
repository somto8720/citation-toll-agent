import app from './api/index';

const port = process.env.PORT || 3000;

// Also serve the static frontend
import express from 'express';
import path from 'path';

app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`CTL Backend running at http://localhost:${port}`);
  console.log(`Open http://localhost:${port}/index.html to view the dashboard!`);
});
