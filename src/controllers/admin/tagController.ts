import { Request, Response } from 'express';
import { TagService } from '../../services/tagService';

const tagService = new TagService();

export const getAllTags = async (req: Request, res: Response) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const tags = await tagService.getAllTags(includeInactive);
        res.json({ success: true, data: tags });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getTagById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const tag = await tagService.getTagById(id);
        res.json({ success: true, data: tag });
    } catch (error: any) {
        res.status(404).json({ success: false, error: error.message });
    }
};

export const createTag = async (req: Request, res: Response) => {
    try {
        const tag = await tagService.createTag(req.body);
        res.status(201).json({ success: true, data: tag });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const updateTag = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const tag = await tagService.updateTag(id, req.body);
        res.json({ success: true, data: tag });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
};

export const deleteTag = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await tagService.deleteTag(id);
        res.json({ success: true, message: 'Tag deleted successfully' });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message });
    }
};
