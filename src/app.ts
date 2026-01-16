import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';

import config from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initializeDatabase } from './models';
import WebSocketService from './websocket/WebSocketService';

class App {
  public app: Application;
  public server: http.Server;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: '*', // In production, restrict this to specific origins
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Request logging
    this.app.use(morgan('combined'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request ID middleware
    this.app.use((req, _res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || require('uuid').v4();
      next();
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/v1', routes);

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        name: 'VMAX API',
        version: '1.0.0',
        documentation: '/api/v1/health'
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await initializeDatabase();
      console.log('Database initialized successfully');

      // Initialize WebSocket
      WebSocketService.initialize(this.server);
      console.log('WebSocket server initialized');

      // Start HTTP server
      this.server.listen(config.port, config.host, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                      VMAX API Server                          ║
╠═══════════════════════════════════════════════════════════════╣
║  HTTP Server:  http://${config.host}:${config.port}                        ║
║  API Base:     http://${config.host}:${config.port}/api/v1                 ║
║  WebSocket:    ws://${config.host}:${config.port}/ws                       ║
║  Environment:  ${config.nodeEnv.padEnd(44)}║
╚═══════════════════════════════════════════════════════════════╝
        `);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

export default new App();
