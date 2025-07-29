export interface Contact{
    id: number;
    phoneNumber: string | null;
    email: string | null;
    linkedId: number | null;
    linkPrecedence: 'primary' | 'secondary';
    createdAt: Date;
    updatedt: Date;
    deletedAt: Date | null;
}

export interface ContactRow{
    id: number;
    phone_number: string | null;
    email: string | null;
    linked_id: number | null;
    link_precedence: 'primary' | 'secondary';
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface IdentifyRequest {
  email?: string | null;
  phoneNumber?: string | null;
}

export interface IdentifyResponse {
  contact: {
    primaryContatctId: number; // Note: keeping the typo as per requirements
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export interface ConsolidatedContact {
  primaryContactId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}