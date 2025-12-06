/**
 * Auto Assignment Service
 * Handles automatic assignment of jobs to consultants based on matching rules
 */

import { ConsultantModel, ConsultantData } from '../../models/Consultant';
import { JobModel } from '../../models/Job';
import { ConsultantRole, ConsultantStatus, AvailabilityStatus } from '@prisma/client';

export interface AssignmentMatch {
  consultantId: string | null;
  score: number;
  reason: string;
}

export interface ConsultantEligibility {
  eligible: boolean;
  reason?: string;
}

export class AutoAssignmentService {
  /**
   * Find the best consultant for a job based on matching rules
   * 
   * Matching criteria (all must pass):
   * - Region match (mandatory)
   * - Role: RECRUITER or CONSULTANT_360
   * - Status: ACTIVE
   * - Availability: not AT_CAPACITY
   * - Capacity: currentJobs < maxJobs
   * 
   * Optional filters (boost score):
   * - Industry expertise overlap
   * - Language match
   * 
   * Ranking:
   * 1. Lowest workload ratio (currentJobs / maxJobs)
   * 2. Better performance metrics (successRate, averageDaysToFill)
   */
  static async findBestConsultantForJob(jobId: string): Promise<AssignmentMatch> {
    try {
      // Get job details
      const job = await JobModel.findById(jobId);
      if (!job) {
        return { consultantId: null, score: 0, reason: 'Job not found' };
      }

      if (!job.regionId) {
        return { consultantId: null, score: 0, reason: 'Job has no region assigned' };
      }

      // Find eligible consultants using the model
      const consultants = await ConsultantModel.findAll({
        regionId: job.regionId,
        role: ConsultantRole.RECRUITER, // We'll filter for both roles below
        status: ConsultantStatus.ACTIVE,
      });

      // Filter by role, availability, and capacity
      const eligibleConsultants = consultants.filter(
        (c) =>
          (c.role === ConsultantRole.RECRUITER || c.role === ConsultantRole.CONSULTANT_360) &&
          c.availability !== AvailabilityStatus.AT_CAPACITY &&
          c.currentJobs < c.maxJobs
      );

      if (eligibleConsultants.length === 0) {
        return {
          consultantId: null,
          score: 0,
          reason: 'No eligible consultants found in the job region',
        };
      }

      // Score each consultant
      const scoredConsultants: Array<{
        consultant: ConsultantData;
        score: number;
        reasons: string[];
      }> = [];

      for (const consultant of eligibleConsultants) {

        // Check capacity
        if (consultant.currentJobs >= consultant.maxJobs) {
          continue; // Skip consultants at capacity
        }

        let score = 100; // Base score
        const reasons: string[] = [];

        // Calculate workload ratio (lower is better)
        const workloadRatio = consultant.maxJobs > 0 
          ? consultant.currentJobs / consultant.maxJobs 
          : 1;
        
        // Workload score: 0-40 points (less workload = higher score)
        const workloadScore = Math.max(0, 40 * (1 - workloadRatio));
        score += workloadScore;
        reasons.push(`Workload: ${consultant.currentJobs}/${consultant.maxJobs} (${Math.round(workloadRatio * 100)}%)`);

        // Industry expertise match (0-30 points)
        if (job.category && consultant.industryExpertise && consultant.industryExpertise.length > 0) {
          const jobCategoryLower = job.category.toLowerCase();
          const hasMatch = consultant.industryExpertise.some(
            (expertise) => expertise.toLowerCase().includes(jobCategoryLower) ||
                          jobCategoryLower.includes(expertise.toLowerCase())
          );
          
          if (hasMatch) {
            score += 30;
            reasons.push('Industry expertise match');
          }
        }

        // Performance metrics (0-20 points)
        // Success rate contribution (0-10 points)
        if (consultant.successRate > 0) {
          const successScore = Math.min(10, consultant.successRate / 10);
          score += successScore;
        }

        // Average days to fill (0-10 points) - lower is better
        if (consultant.averageDaysToFill && consultant.averageDaysToFill > 0) {
          // Normalize: 0 days = 10 points, 60+ days = 0 points
          const daysScore = Math.max(0, 10 * (1 - Math.min(1, consultant.averageDaysToFill / 60)));
          score += daysScore;
        }

        // Language match (0-10 points) - if job has language requirements
        // Note: Job model doesn't currently have language field, but we can add this later
        // For now, we'll skip language matching

        scoredConsultants.push({
          consultant,
          score,
          reasons,
        });
      }

      if (scoredConsultants.length === 0) {
        return {
          consultantId: null,
          score: 0,
          reason: 'No consultants available (all at capacity)',
        };
      }

      // Sort by score (descending) and return best match
      scoredConsultants.sort((a, b) => b.score - a.score);
      const bestMatch = scoredConsultants[0];

      return {
        consultantId: bestMatch.consultant.id,
        score: bestMatch.score,
        reason: `Best match: ${bestMatch.reasons.join(', ')}`,
      };
    } catch (error: any) {
      console.error('Auto-assignment error:', error);
      return {
        consultantId: null,
        score: 0,
        reason: `Error: ${error.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if a specific consultant is eligible for a job
   */
  static async checkConsultantEligibility(
    consultantId: string,
    jobId: string
  ): Promise<ConsultantEligibility> {
    try {
      const consultant = await ConsultantModel.findById(consultantId);
      if (!consultant) {
        return { eligible: false, reason: 'Consultant not found' };
      }

      const job = await JobModel.findById(jobId);
      if (!job) {
        return { eligible: false, reason: 'Job not found' };
      }

      // Check region match
      if (job.regionId && consultant.regionId !== job.regionId) {
        return {
          eligible: false,
          reason: `Region mismatch: consultant in ${consultant.regionId}, job in ${job.regionId}`,
        };
      }

      // Check role
      if (
        consultant.role !== ConsultantRole.RECRUITER &&
        consultant.role !== ConsultantRole.CONSULTANT_360
      ) {
        return {
          eligible: false,
          reason: `Invalid role: ${consultant.role} (must be RECRUITER or CONSULTANT_360)`,
        };
      }

      // Check status
      if (consultant.status !== ConsultantStatus.ACTIVE) {
        return {
          eligible: false,
          reason: `Consultant status is ${consultant.status} (must be ACTIVE)`,
        };
      }

      // Check availability
      if (consultant.availability === AvailabilityStatus.AT_CAPACITY) {
        return {
          eligible: false,
          reason: 'Consultant is at capacity',
        };
      }

      // Check capacity
      if (consultant.currentJobs >= consultant.maxJobs) {
        return {
          eligible: false,
          reason: `Consultant at capacity: ${consultant.currentJobs}/${consultant.maxJobs} jobs`,
        };
      }

      return { eligible: true };
    } catch (error: any) {
      console.error('Check eligibility error:', error);
      return {
        eligible: false,
        reason: `Error: ${error.message || 'Unknown error'}`,
      };
    }
  }
}

