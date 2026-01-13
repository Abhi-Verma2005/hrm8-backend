/**
 * Contact Service
 * Business logic for contact management
 */

import prisma from '../../lib/prisma';
import { Contact } from '@prisma/client';

export interface CreateContactData {
    companyId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    title?: string;
    department?: string;
    linkedInUrl?: string;
    notes?: string;
}

export interface UpdateContactData {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    title?: string;
    department?: string;
    linkedInUrl?: string;
    notes?: string;
}

/**
 * Transform Prisma Contact (snake_case) to API Contact (camelCase)
 */
function transformContact(contact: Contact) {
    return {
        id: contact.id,
        companyId: contact.company_id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        title: contact.title,
        department: contact.department,
        isPrimary: contact.is_primary,
        linkedInUrl: contact.linked_in_url,
        notes: contact.notes,
        createdAt: contact.created_at.toISOString(),
        updatedAt: contact.updated_at.toISOString()
    };
}

export class ContactService {
    /**
     * Get all contacts for a company
     */
    static async getContactsByCompany(companyId: string) {
        const contacts = await prisma.contact.findMany({
            where: { company_id: companyId },
            orderBy: [
                { is_primary: 'desc' },
                { created_at: 'desc' }
            ]
        });
        return contacts.map(transformContact);
    }

    /**
     * Get a single contact by ID
     */
    static async getContactById(companyId: string, contactId: string) {
        const contact = await prisma.contact.findFirst({
            where: {
                id: contactId,
                company_id: companyId
            }
        });
        return contact ? transformContact(contact) : null;
    }

    /**
     * Create a new contact
     */
    static async createContact(data: CreateContactData) {
        // If this is the first contact, make it primary
        const existingContacts = await prisma.contact.count({
            where: { company_id: data.companyId }
        });

        const isPrimary = existingContacts === 0;

        const contact = await prisma.contact.create({
            data: {
                company_id: data.companyId,
                first_name: data.firstName,
                last_name: data.lastName,
                email: data.email,
                phone: data.phone,
                title: data.title,
                department: data.department,
                linked_in_url: data.linkedInUrl,
                notes: data.notes,
                is_primary: isPrimary
            }
        });
        return transformContact(contact);
    }

    /**
     * Update a contact
     */
    static async updateContact(
        companyId: string,
        contactId: string,
        data: UpdateContactData
    ) {
        // Verify contact belongs to company
        const contact = await this.getContactById(companyId, contactId);
        if (!contact) {
            throw new Error('Contact not found');
        }

        const updated = await prisma.contact.update({
            where: { id: contactId },
            data: {
                ...(data.firstName && { first_name: data.firstName }),
                ...(data.lastName && { last_name: data.lastName }),
                ...(data.email && { email: data.email }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.title !== undefined && { title: data.title }),
                ...(data.department !== undefined && { department: data.department }),
                ...(data.linkedInUrl !== undefined && { linked_in_url: data.linkedInUrl }),
                ...(data.notes !== undefined && { notes: data.notes })
            }
        });
        return transformContact(updated);
    }

    /**
     * Delete a contact
     */
    static async deleteContact(companyId: string, contactId: string): Promise<void> {
        // Verify contact belongs to company
        const contact = await this.getContactById(companyId, contactId);
        if (!contact) {
            throw new Error('Contact not found');
        }

        // If deleting primary contact, assign primary to another contact
        if (contact.is_primary) {
            const otherContacts = await prisma.contact.findMany({
                where: {
                    company_id: companyId,
                    id: { not: contactId }
                },
                take: 1
            });

            if (otherContacts.length > 0) {
                await prisma.contact.update({
                    where: { id: otherContacts[0].id },
                    data: { is_primary: true }
                });
            }
        }

        await prisma.contact.delete({
            where: { id: contactId }
        });
    }

    /**
     * Set a contact as primary
     */
    static async setPrimaryContact(companyId: string, contactId: string) {
        // Verify contact belongs to company
        const contact = await this.getContactById(companyId, contactId);
        if (!contact) {
            throw new Error('Contact not found');
        }

        // Use transaction to ensure atomicity
        const updated = await prisma.$transaction(async (tx) => {
            // Remove primary from all contacts in this company
            await tx.contact.updateMany({
                where: { company_id: companyId },
                data: { is_primary: false }
            });

            // Set this contact as primary
            return await tx.contact.update({
                where: { id: contactId },
                data: { is_primary: true }
            });
        });
        return transformContact(updated);
    }

    /**
     * Get primary contact for a company
     */
    static async getPrimaryContact(companyId: string) {
        const contact = await prisma.contact.findFirst({
            where: {
                company_id: companyId,
                is_primary: true
            }
        });
        return contact ? transformContact(contact) : null;
    }
}
