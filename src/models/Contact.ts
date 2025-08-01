import supabase from "../database/connection";
import { Contact, ContactRow } from "../types";

export class ContactModel {
    //Convert database row to Contact object
    private static mapRowToContact(row: ContactRow): Contact{
        return {
            id: row.id,
            phoneNumber: row.phone_number,
            email: row.email,
            linkedId: row.linked_id,
            linkPrecedence: row.link_precedence,
            createdAt: row.created_at,
            updatedt: row.updated_at,
            deletedAt: row.deleted_at
        }; 
    }

    //Find contact by email or phone number
    static async findByEmailOrPhone(email: string | null, phoneNumber: string | null): Promise<Contact[]> {
        let query = supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: true })
            .is('deleted_at', null);

        if (email && phoneNumber) {
            query = query.or(`email.eq.${email},phone_number.eq.${phoneNumber}`);
        } else if (email) {
            query = query.eq('email', email);
        } else if (phoneNumber) {
            query = query.eq('phone_number', phoneNumber);
        }

        const { data, error } = await query;

        if (error) {
            return [];
        }

        return (data ?? []).map(this.mapRowToContact);
    }

    //Find all contacts in a linked group
    static async findLinkedContacts(contactIds: number[]): Promise<Contact[]> {
        if (contactIds.length === 0) return [];
        
        // Use Supabase to fetch linked contacts
        const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .or(
            `id.in.(${contactIds.join(',')}),linked_id.in.(${contactIds.join(',')})`
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

        if (error) {
            return [];
        }

        return (data ?? []).map(this.mapRowToContact);
    }   


    static async create(
        email: string | null,
        phoneNumber: string | null,
        linkedId: number | null = null,
        linkPrecedence: 'primary' | 'secondary' = 'primary'
    ): Promise<Contact> {
        const { data, error } = await supabase
            .from('contacts')
            .insert([
                {
                    email: email,
                    phone_number: phoneNumber,
                    linked_id: linkedId,
                    link_precedence: linkPrecedence
                }
            ])
            .select('*')
            .single();

        if (error) {
            throw error;
        }
        return this.mapRowToContact(data);
    }


    //update a contact to secondary
    static async updateToSecondary(contactId: number, linkedId: number): Promise<Contact>{
        const {data, error} = await supabase
        .from('contacts')
        .update({
            linked_id: linkedId,
            link_precedence: 'secondary',
            updated_at: new Date().toISOString
        })
        .eq('id', contactId)
        .select('*')
        .single();

        if(error)
        {
            throw error;
        }

        return this.mapRowToContact(data);

    }



    //update all contacts linked to oldPrimaryid to link to newPrimaryId
    static async updateLinkedContacts(oldPrimaryId: number, newPrimaryId: number): Promise<void> {

        const {error} = await supabase
        .from('contacts')
        .update({
            linked_id: newPrimaryId,
            updated_at: new Date().toISOString
        })
        .eq('linked_id',oldPrimaryId);

        if(error)
        {
            throw error;
        }
        
    }


    //Find a contact by Id
    static async findById(id: number): Promise<Contact | null> {
        const {data, error} = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

        if(error){
            return null;
        }

        return this.mapRowToContact(data);
    }


    static async findExactMatch(email: string | null, phoneNumber:string | null) : Promise<Contact | null> {
        try{
            const {data, error} = await supabase
            .from('contacts')
            .select('*')
            .eq('email', email)
            .eq('phone_number', phoneNumber)
            .maybeSingle();

            return this.mapRowToContact(data);
        }catch(error)
        {
            return null;
        }
    }
}