/**
 * Contact Controller
 * Handles HTTP requests for contact management
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { ContactService, CreateContactData, UpdateContactData } from '../../services/company/ContactService';

export class ContactController {
    /**
     * Get all contacts for a company
     * GET /api/companies/:companyId/contacts
     */
    static async getContacts(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { companyId } = req.params;

            const contacts = await ContactService.getContactsByCompany(companyId);

            res.json({
                success: true,
                data: { contacts }
            });
        } catch (error: any) {
            console.error('Get contacts error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch contacts'
            });
        }
    }

    /**
     * Get a single contact
     * GET /api/companies/:companyId/contacts/:id
     */
    static async getContact(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { companyId, id } = req.params;

            const contact = await ContactService.getContactById(companyId, id);

            if (!contact) {
                res.status(404).json({
                    success: false,
                    error: 'Contact not found'
                });
                return;
            }

            res.json({
                success: true,
                data: { contact }
            });
        } catch (error: any) {
            console.error('Get contact error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch contact'
            });
        }
    }

    /**
     * Create a new contact
     * POST /api/companies/:companyId/contacts
     */
    static async createContact(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { companyId } = req.params;
            const { firstName, lastName, email, phone, title, department, linkedInUrl, notes } = req.body;

            // Validation
            if (!firstName || !lastName || !email) {
                res.status(400).json({
                    success: false,
                    error: 'First name, last name, and email are required'
                });
                return;
            }

            const contactData: CreateContactData = {
                companyId,
                firstName,
                lastName,
                email,
                phone,
                title,
                department,
                linkedInUrl,
                notes
            };

            const contact = await ContactService.createContact(contactData);

            res.status(201).json({
                success: true,
                data: { contact },
                message: 'Contact created successfully'
            });
        } catch (error: any) {
            console.error('Create contact error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to create contact'
            });
        }
    }

    /**
     * Update a contact
     * PUT /api/companies/:companyId/contacts/:id
     */
    static async updateContact(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { companyId, id } = req.params;
            const updateData: UpdateContactData = req.body;

            const contact = await ContactService.updateContact(companyId, id, updateData);

            res.json({
                success: true,
                data: { contact },
                message: 'Contact updated successfully'
            });
        } catch (error: any) {
            console.error('Update contact error:', error);

            if (error.message === 'Contact not found') {
                res.status(404).json({
                    success: false,
                    error: error.message
                });
                return;
            }

            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update contact'
            });
        }
    }

    /**
     * Delete a contact
     * DELETE /api/companies/:companyId/contacts/:id
     */
    static async deleteContact(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { companyId, id } = req.params;

            await ContactService.deleteContact(companyId, id);

            res.json({
                success: true,
                message: 'Contact deleted successfully'
            });
        } catch (error: any) {
            console.error('Delete contact error:', error);

            if (error.message === 'Contact not found') {
                res.status(404).json({
                    success: false,
                    error: error.message
                });
                return;
            }

            res.status(500).json({
                success: false,
                error: error.message || 'Failed to delete contact'
            });
        }
    }

    /**
     * Set a contact as primary
     * PUT /api/companies/:companyId/contacts/:id/set-primary
     */
    static async setPrimaryContact(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { companyId, id } = req.params;

            const contact = await ContactService.setPrimaryContact(companyId, id);

            res.json({
                success: true,
                data: { contact },
                message: 'Primary contact updated successfully'
            });
        } catch (error: any) {
            console.error('Set primary contact error:', error);

            if (error.message === 'Contact not found') {
                res.status(404).json({
                    success: false,
                    error: error.message
                });
                return;
            }

            res.status(500).json({
                success: false,
                error: error.message || 'Failed to set primary contact'
            });
        }
    }

    /**
     * Get primary contact for a company
     * GET /api/companies/:companyId/contacts/primary
     */
    static async getPrimaryContact(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { companyId } = req.params;

            const contact = await ContactService.getPrimaryContact(companyId);

            if (!contact) {
                res.status(404).json({
                    success: false,
                    error: 'No primary contact found'
                });
                return;
            }

            res.json({
                success: true,
                data: { contact }
            });
        } catch (error: any) {
            console.error('Get primary contact error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch primary contact'
            });
        }
    }
}
