import { Request, Response } from "express";
import { IdentityService } from "../services/identityService";
import { IdentifyRequest, IdentifyResponse } from "../types";

export class IdentifyController{
    static async identify(req: Request, res: Response): Promise<void> {
        try{
            const request: IdentifyRequest = req.body;

            const consolidatedContact = await IdentityService.identify(request);

            const response: IdentifyResponse = {
                contact: {
                    primaryContatctId: consolidatedContact.primaryContactId,
                    emails: consolidatedContact.emails,
                    phoneNumbers: consolidatedContact.phoneNumbers,
                    secondaryContactIds: consolidatedContact.secondaryContactIds
                }
            };

            res.status(200).json(response);
        }catch(error){
            console.error('Error in identify endpoint: ', error);

            // Handle specific database errors
            if (error instanceof Error) {
                if (error.message.includes('connection')) {
                    res.status(503).json({
                        error: 'Database connection error',
                        message: 'Unable to connect to database'
                    });
                    return;
                }
                
                if (error.message.includes('validation')) {
                    res.status(400).json({
                        error: 'Validation error',
                        message: error.message
                    });
                    return;
                }
            }
            
            // Generic server error
            res.status(500).json({
                error: 'Internal server error',
                message: 'An unexpected error occurred'
            });
        }
    }
}