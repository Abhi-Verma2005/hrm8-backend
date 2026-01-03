import { Request, Response } from 'express';
import { CategoryService } from '../../services/categoryService';

const categoryService = new CategoryService();

export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const categories = await categoryService.getAllCategories(includeInactive);
        res.json({ success: true, data: categories });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getCategoryById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const category = await categoryService.getCategoryById(id);
        res.json({ success: true, data: category });
    } catch (error: any) {
        res.status(404).json({ success: false, error: error.message });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json({ success: true, data: category });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const category = await categoryService.updateCategory(id, req.body);
        res.json({ success: true, data: category });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await categoryService.deleteCategory(id);
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const reorderCategories = async (req: Request, res: Response) => {
    try {
        const { order } = req.body; // Array of { id, order }
        await categoryService.reorderCategories(order);
        res.json({ success: true, message: 'Categories reordered successfully' });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
};
