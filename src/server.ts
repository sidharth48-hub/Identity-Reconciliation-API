import app from './app';
//import pool from './database/connection';
import supabase from './database/connection';
import dotenv from 'dotenv'

dotenv.config();

const PORT = process.env.PORT || 3000;

//Test database connection on startup
async function startServer(){
    try{
        console.log('Starting the server...');

        //start the server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
            //console.log(`Health check: http://localhost:${PORT}/health`);
        });
    } catch(error){
        console.error('Failed to start server', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  // Add any necessary supabase cleanup here if needed
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  // Add any necessary supabase cleanup here if needed
  process.exit(0);
});


startServer()