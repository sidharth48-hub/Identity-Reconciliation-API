import { ContactModel } from "../models/Contact";
import { Contact, ConsolidatedContact, IdentifyRequest } from "../types";

export class IdentityService{
    static async identify(request: IdentifyRequest): Promise<ConsolidatedContact> {
        const {email, phoneNumber} = request;
        const safeEmail: string | null = email ?? null;
        const safePhoneNumber: string | null = phoneNumber ?? null;

        // Step 1: Find existing contacts
        const existingContacts = await ContactModel.findByEmailOrPhone(safeEmail, safePhoneNumber);

        if(existingContacts.length === 0){
            // No existing contacts - create new primary contact
            const newContact = await ContactModel.create(safeEmail, safePhoneNumber, null, 'primary');

            return {
                primaryContactId: newContact.id,
                emails: newContact.email ? [newContact.email] : [],
                phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
                secondaryContactIds : []
            }
        }

        const consolidated: ConsolidatedContact = {
            primaryContactId: 0,
            emails: [],
            phoneNumbers: [],
            secondaryContactIds: []
        };
        return consolidated;
    }
}