import pool from "../database/connection";
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
        const client = await pool.connect();

        try{
            let query = 'SELECT * FROM contacts WHERE deleted_at IS NULL AND (';
            const params: (string | null)[] = [];
            const conditions: string[] = [];

            if(email){
                conditions.push(`email = $${params.length + 1}`);
                params.push(email);
            }

            if(phoneNumber){
                conditions.push(`phone_number = $${params.length + 1}`);
                params.push(phoneNumber);
            }

            query += conditions.join(' OR ') + ') ORDER BY created_at ASC';

            const result = await client.query(query, params);
            return result.rows.map(this.mapRowToContact);
        }finally{
            client.release();
        }
    }


    static async create(
        email: string | null,
        phoneNumber: string | null,
        linkedId: number | null = null,
        linkPrecedence: 'primary' | 'secondary' = 'primary'
    ): Promise<Contact> {
        const client = await pool.connect();
        try{
            const query = `
            INSERT INTO contacts (email, phone_number, linked_id, link_precedence)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            `;

            const result = await client.query(query, [email, phoneNumber, linkedId, linkPrecedence]);
            return this.mapRowToContact(result.rows[0]);
        }
        finally{
            client.release();
        }
    }
}