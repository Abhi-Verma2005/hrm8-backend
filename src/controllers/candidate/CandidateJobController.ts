import { Request, Response } from 'express';
import { CandidateJobService } from '../../services/candidate/CandidateJobService';
import { CandidateAuthenticatedRequest } from '../../middleware/candidateAuth';

export class CandidateJobController {
    // Saved Jobs
    static async getSavedJobs(req: Request, res: Response) {
        try {
            const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;
            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const jobs = await CandidateJobService.getSavedJobs(candidateId);
            res.json({ success: true, data: jobs });
        } catch (error: any) {
            console.error('Error fetching saved jobs:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Recommended Jobs
    static async getRecommendedJobs(req: Request, res: Response) {
        try {
            const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;
            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const jobs = await CandidateJobService.getRecommendedJobs(candidateId);
            res.json({ success: true, data: jobs });
        } catch (error: any) {
            console.error('Error fetching recommended jobs:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    static async saveJob(req: Request, res: Response) {
        try {
            const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;
            const { jobId } = req.params;

            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const savedJob = await CandidateJobService.saveJob(candidateId, jobId);
            res.json({ success: true, data: savedJob });
        } catch (error: any) {
            console.error('Error saving job:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    static async unsaveJob(req: Request, res: Response) {
        try {
            const candidateId = (req as CandidateAuthenticatedRequest).candidate?.id;
            const { jobId } = req.params;

            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            await CandidateJobService.unsaveJob(candidateId, jobId);
            res.json({ success: true, message: 'Job removed from saved list' });
        } catch (error: any) {
            console.error('Error removing saved job:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Saved Searches
    static async getSavedSearches(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const searches = await CandidateJobService.getSavedSearches(candidateId);
            res.json({ success: true, data: searches });
        } catch (error: any) {
            console.error('Error fetching saved searches:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    static async trackSearch(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            const { query, filters } = req.body;

            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const search = await CandidateJobService.trackSearch(candidateId, query, filters);
            res.json({ success: true, data: search });
        } catch (error: any) {
            console.error('Error tracking search:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    static async deleteSavedSearch(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            const { id } = req.params;

            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            await CandidateJobService.deleteSavedSearch(candidateId, id);
            res.json({ success: true, message: 'Saved search deleted' });
        } catch (error: any) {
            console.error('Error deleting saved search:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Job Alerts
    static async getJobAlerts(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const alerts = await CandidateJobService.getJobAlerts(candidateId);
            res.json({ success: true, data: alerts });
        } catch (error: any) {
            console.error('Error fetching job alerts:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    static async createJobAlert(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;

            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const alert = await CandidateJobService.createJobAlert(candidateId, req.body);
            res.json({ success: true, data: alert });
        } catch (error: any) {
            console.error('Error creating job alert:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    static async updateJobAlert(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            const { id } = req.params;

            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            const alert = await CandidateJobService.updateJobAlert(candidateId, id, req.body);
            res.json({ success: true, data: alert });
        } catch (error: any) {
            console.error('Error updating job alert:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    static async deleteJobAlert(req: Request, res: Response) {
        try {
            const candidateId = (req as any).candidate?.id;
            const { id } = req.params;

            if (!candidateId) {
                res.status(401).json({ success: false, error: 'Unauthorized' });
                return;
            }

            await CandidateJobService.deleteJobAlert(candidateId, id);
            res.json({ success: true, message: 'Job alert deleted' });
        } catch (error: any) {
            console.error('Error deleting job alert:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}
