import { Client } from "pg";
import { ContactModel } from "../models/Contact";
import { Contact, ConsolidatedContact, IdentifyRequest } from "../types";

export class IdentityService{
    static async identify(request: IdentifyRequest): Promise<ConsolidatedContact> {
        const {email, phoneNumber} = request;
        const safeEmail: string | null = email ?? null;
        const safePhoneNumber: string | null = phoneNumber ?? null;

        try{
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

        //step 3: Analyze the existing contacts and find their primary contacts
        const primaryContactIds = new Set<number>();
        const contactGroups = new Map<number, Contact[]>();

        for(const contact of existingContacts)
        {
            const primaryId = contact.linkPrecedence === 'primary'?contact.id : contact.linkedId!;
            primaryContactIds.add(primaryId);
            
            if(!contactGroups.has(primaryId))
            {
                contactGroups.set(primaryId, []);
            }
        }

        // Step 4: Get all contacts for each primary group
        const allLinkedContacts = await ContactModel.findLinkedContacts(Array.from(primaryContactIds));
      
        // Group contacts by their primary
        for (const contact of allLinkedContacts) {
            const primaryId = contact.linkPrecedence === 'primary' ? contact.id : contact.linkedId!;
            if (!contactGroups.has(primaryId)) {
                contactGroups.set(primaryId, []);
            }
            contactGroups.get(primaryId)!.push(contact);
        }

        // Step 5: Determine if we need to merge groups or create new contact
        const primaryIds = Array.from(primaryContactIds);
      
        if (primaryIds.length === 1) {
            // Case 2: Single primary group exists
            const primaryId = primaryIds[0];
            const hasNewInfo = await this.hasNewInformation(contactGroups.get(primaryId)!, safeEmail, safePhoneNumber);
        
            if (hasNewInfo) {
            // Create secondary contact with new information
            await ContactModel.create(safeEmail, safePhoneNumber, primaryId, 'secondary');
            }
        
            const consolidated = await this.getConsolidatedContact(primaryId);
            return consolidated;
        } else {
            // Case 3: Multiple primary groups need to be merged
            // Find the oldest primary contact
            const primaryContacts = primaryIds.map(id => 
                contactGroups.get(id)!.find(c => c.linkPrecedence === 'primary')!
            );
            
            primaryContacts.sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            const oldestPrimary = primaryContacts[0];
            const otherPrimaries = primaryContacts.slice(1);

            // Convert other primaries to secondary and update their linked contacts
            for (const primary of otherPrimaries) {
                await ContactModel.updateToSecondary(primary.id, oldestPrimary.id);
                await ContactModel.updateLinkedContacts(primary.id, oldestPrimary.id);
            }

            // Check if we need to create a new secondary with the request data
            const allContacts = Array.from(contactGroups.values()).flat();
            const hasNewInfo = await this.hasNewInformation(allContacts, safeEmail, safePhoneNumber);
        
            if (hasNewInfo) {
                await ContactModel.create(safeEmail, safePhoneNumber, oldestPrimary.id, 'secondary');
            }

            const consolidated = await this.getConsolidatedContact(oldestPrimary.id);
            return consolidated;
        }
        }catch (error) {
            throw error;
        }
    }

    private static async hasNewInformation(contacts: Contact[], email: string | null, phoneNumber: string | null): Promise<boolean> {
        const existingEmails = new Set(contacts.map(c => c.email).filter(Boolean));
        const existingPhones = new Set(contacts.map(c => c.phoneNumber).filter(Boolean));

        const hasNewEmail = email && !existingEmails.has(email);
        const hasNewPhone = phoneNumber && !existingPhones.has(phoneNumber);

        return (hasNewEmail || hasNewPhone) ? true: false;
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