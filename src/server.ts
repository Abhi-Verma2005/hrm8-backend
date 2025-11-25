import 'dotenv/config';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const getCorsOrigin = (): string | string[] | boolean => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  // Support multiple origins if comma-separated
  if (frontendUrl.includes(',')) {
    return frontendUrl.split(',').map(url => url.trim());
  }
  return frontendUrl;
};

const corsOptions = {
  origin: getCorsOrigin(),
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse cookies

// Basic route
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'HRM8 API - Authentication System' });
});

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/', routes);

// Serve static files from frontend dist directory in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  // Resolve path relative to the project root (not dist folder)
  // __dirname in compiled JS will be backend/dist, so we go up to backend, then to frontend/dist
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDistPath));
  
  // SPA fallback: serve index.html for all non-API routes
  // This must be after API routes and static files
  app.get('/*', (req: Request, res: Response) => {
    // Don't serve index.html for API routes or health check
    if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/') {
      res.status(404).json({
        success: false,
        error: 'Route not found',
      });
      return;
    }
    
    // Serve index.html for all other routes (SPA routing)
    const indexPath = path.resolve(__dirname, '../../frontend/dist/index.html');
    res.sendFile(indexPath);
  });
} else {
  // 404 handler for development (when frontend is served separately)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
    });
  });
}

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

