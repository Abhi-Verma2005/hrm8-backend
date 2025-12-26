import { JobRoundModel, JobRoundData, JobRoundType } from '../../models/JobRound';
import { JobModel } from '../../models/Job';

export interface CreateJobRoundRequest {
  jobId: string;
  name: string;
  type: JobRoundType;
}

export interface UpdateJobRoundRequest {
  id: string;
  name?: string;
  type?: JobRoundType;
  order?: number;
}

export class JobRoundService {
  /**
   * Initialize the four fixed rounds for a new job.
   * This should be called when a job is created.
   */
  static async initializeFixedRounds(jobId: string): Promise<void> {
    // Check if fixed rounds already exist (idempotent)
    const existingFixedRounds = await JobRoundModel.findByJobId(jobId);
    const fixedKeys = ['NEW', 'OFFER', 'HIRED', 'REJECTED'];
    const existingFixedKeys = existingFixedRounds
      .filter(r => r.isFixed && r.fixedKey)
      .map(r => r.fixedKey!);
    
    // Only create fixed rounds that don't exist
    if (!existingFixedKeys.includes('NEW')) {
      await JobRoundModel.create({
        jobId,
        name: 'New',
        type: 'ASSESSMENT' as JobRoundType, // New doesn't have a type, use ASSESSMENT as default
        order: 1,
        isFixed: true,
        fixedKey: 'NEW',
      });
    }

    if (!existingFixedKeys.includes('OFFER')) {
      await JobRoundModel.create({
        jobId,
        name: 'Offer',
        type: 'ASSESSMENT' as JobRoundType, // Offer doesn't have a type, use ASSESSMENT as default
        order: 999, // Place far in pipeline - will be adjusted when user adds rounds
        isFixed: true,
        fixedKey: 'OFFER',
      });
    }

    if (!existingFixedKeys.includes('HIRED')) {
      await JobRoundModel.create({
        jobId,
        name: 'Hired',
        type: 'ASSESSMENT' as JobRoundType, // Hired doesn't have a type, use ASSESSMENT as default
        order: 1000,
        isFixed: true,
        fixedKey: 'HIRED',
      });
    }

    if (!existingFixedKeys.includes('REJECTED')) {
      await JobRoundModel.create({
        jobId,
        name: 'Rejected',
        type: 'ASSESSMENT' as JobRoundType, // Rejected doesn't have a type, use ASSESSMENT as default
        order: 1001,
        isFixed: true,
        fixedKey: 'REJECTED',
      });
    }
  }

  /**
   * Get all rounds for a job ordered by pipeline order.
   */
  static async getJobRounds(jobId: string): Promise<JobRoundData[]> {
    return JobRoundModel.findByJobId(jobId);
  }

  /**
   * Create a new configurable (non-fixed) round for a job.
   *
   * The new round will be placed after the last custom round, but before the fixed rounds (OFFER/HIRED/REJECTED).
   */
  static async createRound(request: CreateJobRoundRequest): Promise<JobRoundData | { error: string }> {
    const job = await JobModel.findById(request.jobId);
    if (!job) {
      return { error: 'Job not found' };
    }

    const existingRounds = await JobRoundModel.findByJobId(request.jobId);
    const fixedRounds = existingRounds.filter(r => r.isFixed);
    const customRounds = existingRounds.filter(r => !r.isFixed);

    // Find the first fixed round order (OFFER at 999, or higher)
    const fixedOrders = fixedRounds.map(r => r.order);
    const minFixedOrder = fixedOrders.length > 0 ? Math.min(...fixedOrders.filter(o => o > 1)) : 999;

    // Find max order among custom rounds (excluding NEW which is fixed at 1)
    const customOrders = customRounds.map(r => r.order);
    const maxCustomOrder = customOrders.length > 0 ? Math.max(...customOrders) : 1;

    // Place new round after last custom round, but before fixed rounds
    const newOrder = Math.min(maxCustomOrder + 1, minFixedOrder - 1);

    const round = await JobRoundModel.create({
      jobId: request.jobId,
      name: request.name,
      type: request.type,
      order: newOrder,
      isFixed: false,
      fixedKey: null,
    });

    return round;
  }

  /**
   * Update a round's name/type/order (but not fixed-ness).
   * If order is changed, other rounds will be adjusted accordingly.
   */
  static async updateRound(request: UpdateJobRoundRequest): Promise<JobRoundData | { error: string }> {
    const target = await JobRoundModel.findById(request.id);

    if (!target) {
      return { error: 'Round not found' };
    }

    if (target.isFixed) {
      return { error: 'Fixed rounds cannot be updated' };
    }

    // If order is being changed, we need to reorder other rounds
    if (request.order !== undefined && request.order !== target.order) {
      const allRounds = await JobRoundModel.findByJobId(target.jobId);
      const fixedRounds = allRounds.filter(r => r.isFixed);
      const customRounds = allRounds.filter(r => !r.isFixed && r.id !== request.id);

      // Ensure new order is valid (not in fixed rounds range)
      const fixedOrders = fixedRounds.map(r => r.order);
      const minFixedOrder = Math.min(...fixedOrders.filter(o => o > 1)); // Exclude NEW which is at 1
      
      // If moving to position near fixed rounds, adjust
      let newOrder = request.order;
      if (newOrder >= minFixedOrder) {
        // Place before the first fixed round (OFFER)
        newOrder = minFixedOrder - 1;
      }

      // Reorder other custom rounds
      customRounds.sort((a, b) => a.order - b.order);
      
      let currentOrder = 2; // Start after NEW (order 1)
      for (const round of customRounds) {
        if (currentOrder === newOrder) {
          currentOrder++; // Skip the position we're moving to
        }
        if (round.id !== request.id) {
          await JobRoundModel.update(round.id, {
            order: currentOrder,
          });
          currentOrder++;
        }
      }

      // Update the target round with new order
      const updated = await JobRoundModel.update(request.id, {
        name: request.name ?? target.name,
        type: request.type ?? target.type,
        order: newOrder,
      });

      if (!updated) {
        return { error: 'Failed to update round' };
      }

      return updated;
    } else {
      // No order change, just update name/type
      const updated = await JobRoundModel.update(request.id, {
        name: request.name ?? target.name,
        type: request.type ?? target.type,
        order: target.order,
      });

      if (!updated) {
        return { error: 'Failed to update round' };
      }

      return updated;
    }
  }

  /**
   * Delete a non-fixed round.
   */
  static async deleteRound(id: string): Promise<{ success: true } | { error: string }> {
    try {
      const round = await JobRoundModel.findById(id);
      if (!round) {
        return { error: 'Round not found' };
      }

      if (round.isFixed) {
        return { error: 'Fixed rounds cannot be deleted' };
      }

      await JobRoundModel.delete(id);
      return { success: true };
    } catch (error) {
      return { error: 'Failed to delete round' };
    }
  }
}


