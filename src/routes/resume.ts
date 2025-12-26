/**
 * Resume Routes
 */

import { Router, type Router as RouterType } from 'express';
import { ResumeAnnotationController } from '../controllers/candidate/ResumeAnnotationController';
// import { authenticateUser } from '../middleware/auth'; // TODO: Add auth middleware

const router: RouterType = Router();

// Annotations
router.get('/:resumeId', ResumeAnnotationController.getResume);
router.get('/:resumeId/annotations', ResumeAnnotationController.getAnnotations);
router.post('/:resumeId/annotations', ResumeAnnotationController.createAnnotation);
router.delete('/:resumeId/annotations/:id', ResumeAnnotationController.deleteAnnotation);

export default router;
