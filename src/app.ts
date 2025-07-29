import express from 'express'
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { validateIdentifyRequest } from './middleware/validation';
import { IdentifyController } from './controllers/identityController';

//Load environment variables
dotenv.config()

const app = express();

//Security middleware
app.use(helmet());

//CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
    ? ['https://api-domain.com']
    : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));

//logging middleware 
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

//Body Parsing middleware
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended: true}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


//main identify endpoint
app.post('/identify', validateIdentifyRequest, IdentifyController.identify);

//404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({
//     error: 'Not Found',
//     message: `Route ${req.originalUrl} not found`
//   });
// });

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message
  });
});

export default app;