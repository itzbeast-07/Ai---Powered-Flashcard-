
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ML Prediction API
  app.post('/api/evaluate', (req, res) => {
    const performanceData = req.body;
    
    // Spawn python process to run predictor.py
    const python = spawn('python', ['predictor.py']);
    
    let resultData = '';
    let errorData = '';

    python.stdin.write(JSON.stringify(performanceData));
    python.stdin.end();

    python.stdout.on('data', (data) => {
      resultData += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python error (code ${code}):`, errorData);
        return res.status(500).json({ error: 'ML Evaluation failed', details: errorData });
      }
      try {
        const prediction = JSON.parse(resultData);
        res.json(prediction);
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse ML output' });
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
