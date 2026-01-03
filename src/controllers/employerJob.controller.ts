import { Request, Response } from 'express';
import { JobService, CreateJobDTO, UpdateJobDTO } from '../services/jobService';
import { JobStatus } from '@prisma/client';

const jobService = new JobService();

// Extended Request type to include user info from middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    companyId: string; // Auth middleware uses companyId, not company_id
    email: string;
    name: string;
  };
}

export const getEmployerJobs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    if (!userId || !companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const filters = {
      status: req.query.status as JobStatus,
      page: Number(req.query.page),
      limit: Number(req.query.limit),
      search: req.query.search as string,
    };

    const result = await jobService.getEmployerJobs(companyId, filters);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
  }
};

export const createJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;

    if (!userId || !companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const jobData: CreateJobDTO = req.body;
    const newJob = await jobService.createJob(userId, companyId, jobData);
    res.status(201).json({ success: true, data: newJob });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ success: false, error: error.message || 'Failed to create job' });
  }
};

export const updateJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;
    const { jobId } = req.params;

    if (!userId || !companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const jobData: UpdateJobDTO = req.body;
    const updatedJob = await jobService.updateJob(jobId, companyId, jobData);
    res.json({ success: true, data: updatedJob });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Failed to update job' });
  }
};

export const changeJobStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;
    const { jobId } = req.params;
    const { status } = req.body;

    if (!userId || !companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    const updatedJob = await jobService.changeJobStatus(jobId, companyId, status as JobStatus);
    res.json({ success: true, data: updatedJob });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Failed to update job status' });
  }
};

export const deleteJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;
    const { jobId } = req.params;

    if (!userId || !companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await jobService.deleteJob(jobId, companyId);
    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Failed to delete job' });
  }
};

export const getJobById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;
    const { jobId } = req.params;

    if (!userId || !companyId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const job = await jobService.getJobById(jobId, companyId);
    res.json({ success: true, data: job });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message || 'Job not found' });
  }
}
