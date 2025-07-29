import { Client } from "pg";
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


        //Step 2: Check for exact match
        const exactMatch = await ContactModel.findExactMatch(safeEmail, safePhoneNumber);
        if(exactMatch){
            const consolidated = await this.getConsolidatedContact(exactMatch.id);
            return consolidated;
        }


        const consolidated: ConsolidatedContact = {
            primaryContactId: 0,
            emails: [],
            phoneNumbers: [],
            secondaryContactIds: []
        };
        return consolidated;
    }


    private static async getConsolidatedContact(primaryContactId: number): Promise<ConsolidatedContact>{
        //Get all contacts linked to this primary
        const allContacts = await ContactModel.findLinkedContacts([primaryContactId]);

        //Seperate primary and secondary contact
        const primaryContact = allContacts.find(c => c.id === primaryContactId);
        const secondaryContacts = allContacts.filter(c => c.id !== primaryContactId);

        //collect the unique emails and phone numbers
        const emailSet = new Set<string>();
        const phoneSet = new Set<string>();

        //Add primary contact data first
        if(primaryContact?.email) emailSet.add(primaryContact.email);
        if(primaryContact?.phoneNumber) phoneSet.add(primaryContact.phoneNumber);

        //Add seconday contact data
        secondaryContacts.forEach(contact => {
            if(contact.email) emailSet.add(contact.email);
            if(contact.phoneNumber) phoneSet.add(contact.phoneNumber);
        });

        // Convert to arrays with primary data first
        const emails: string[] = [];
        const phoneNumbers: string[] = [];
        
        if (primaryContact?.email) emails.push(primaryContact.email);
        if (primaryContact?.phoneNumber) phoneNumbers.push(primaryContact.phoneNumber);

        // Add remaining unique values
        emailSet.forEach(email => {
            if (email !== primaryContact?.email) {
                emails.push(email);
            }
        });
        
        phoneSet.forEach(phone => {
            if (phone !== primaryContact?.phoneNumber) {
                phoneNumbers.push(phone);
            }
        });
        
        return {
            primaryContactId: primaryContact?.id ? primaryContact.id : 0,
            emails,
            phoneNumbers,
            secondaryContactIds: secondaryContacts.map(c => c.id)
        };
    }
}