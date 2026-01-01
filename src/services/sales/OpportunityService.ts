/**
 * Opportunity Service
 * Handles sales opportunity management and forecasting
 */

import prisma from '../../lib/prisma';
import { OpportunityStage, OpportunityType } from '@prisma/client';

export class OpportunityService {
  /**
   * Calculate probability based on stage
   */
  private static getProbabilityForStage(stage: OpportunityStage): number {
    switch (stage) {
      case 'NEW': return 10;
      case 'QUALIFICATION': return 30;
      case 'PROPOSAL': return 60;
      case 'NEGOTIATION': return 80;
      case 'CLOSED_WON': return 100;
      case 'CLOSED_LOST': return 0;
      default: return 0;
    }
  }

  /**
   * Create a new opportunity
   */
  static async createOpportunity(data: {
    companyId: string;
    name: string;
    type: OpportunityType;
    stage?: OpportunityStage;
    amount?: number;
    currency?: string;
    expectedCloseDate?: Date;
    salesAgentId: string;
    description?: string;
    tags?: string[];
  }) {
    const stage = data.stage || 'NEW';
    const probability = this.getProbabilityForStage(stage);

    return await prisma.opportunity.create({
      data: {
        company_id: data.companyId,
        name: data.name,
        type: data.type,
        stage: stage,
        amount: data.amount,
        currency: data.currency || 'USD',
        probability: probability,
        expected_close_date: data.expectedCloseDate,
        sales_agent_id: data.salesAgentId,
        description: data.description,
        tags: data.tags || [],
      },
      include: {
        company: {
          select: { id: true, name: true, domain: true }
        }
      }
    });
  }

  /**
   * Update an opportunity
   */
  static async updateOpportunity(
    id: string,
    data: {
      name?: string;
      stage?: OpportunityStage;
      amount?: number;
      probability?: number;
      expectedCloseDate?: Date;
      description?: string;
      lostReason?: string;
      tags?: string[];
    }
  ) {
    // If stage is updated, auto-update probability unless explicitly provided
    let probability = data.probability;
    let closedAt: Date | null | undefined = undefined;

    if (data.stage) {
      if (probability === undefined) {
        probability = this.getProbabilityForStage(data.stage);
      }
      
      if (data.stage === 'CLOSED_WON' || data.stage === 'CLOSED_LOST') {
        closedAt = new Date();
      }
    }

    return await prisma.opportunity.update({
      where: { id },
      data: {
        ...data,
        probability,
        closed_at: closedAt,
      },
      include: {
        company: {
          select: { id: true, name: true, domain: true }
        }
      }
    });
  }

  /**
   * Get opportunities for a consultant
   */
  static async getOpportunities(
    consultantId: string,
    filters?: {
      stage?: OpportunityStage;
      companyId?: string;
    }
  ) {
    return await prisma.opportunity.findMany({
      where: {
        sales_agent_id: consultantId,
        stage: filters?.stage,
        company_id: filters?.companyId,
      },
      include: {
        company: {
          select: { id: true, name: true, domain: true }
        }
      },
      orderBy: { updated_at: 'desc' }
    });
  }

  /**
   * Get Pipeline Stats (Forecasting)
   */
  static async getPipelineStats(consultantId: string) {
    const opportunities = await prisma.opportunity.findMany({
      where: {
        sales_agent_id: consultantId,
        stage: {
          notIn: ['CLOSED_WON', 'CLOSED_LOST']
        }
      }
    });

    const totalPipelineValue = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);
    
    const weightedPipelineValue = opportunities.reduce((sum, opp) => {
      const amount = opp.amount || 0;
      const prob = opp.probability || 0;
      return sum + (amount * (prob / 100));
    }, 0);

    const byStage = opportunities.reduce((acc, opp) => {
      const stage = opp.stage;
      if (!acc[stage]) {
        acc[stage] = { count: 0, value: 0 };
      }
      acc[stage].count++;
      acc[stage].value += (opp.amount || 0);
      return acc;
    }, {} as Record<string, { count: number, value: number }>);

    return {
      totalPipelineValue,
      weightedPipelineValue,
      byStage,
      dealCount: opportunities.length
    };
  }

  /**
   * Delete an opportunity
   */
  static async deleteOpportunity(id: string) {
    return await prisma.opportunity.delete({
      where: { id }
    });
  }
}
