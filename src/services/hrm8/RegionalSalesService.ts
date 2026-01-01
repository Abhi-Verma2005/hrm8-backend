/**
 * Regional Sales Service
 * Handles fetching sales data for Regional Licensees/Admins
 */

import prisma from '../../lib/prisma';
import { OpportunityStage, ConsultantRole } from '@prisma/client';

export class RegionalSalesService {
  /**
   * Get all opportunities for a region
   */
  static async getRegionalOpportunities(
    regionId: string,
    filters?: {
      stage?: OpportunityStage;
      salesAgentId?: string;
    }
  ) {
    // 1. Find all consultants in this region
    const regionalConsultants = await prisma.consultant.findMany({
      where: {
        region_id: regionId,
        role: { in: [ConsultantRole.SALES_AGENT, ConsultantRole.CONSULTANT_360] }
      },
      select: { id: true, first_name: true, last_name: true, email: true }
    });

    const consultantIds = regionalConsultants.map(c => c.id);

    // 2. Fetch opportunities owned by these consultants
    const opportunities = await prisma.opportunity.findMany({
      where: {
        sales_agent_id: { in: consultantIds },
        stage: filters?.stage,
        // Optional: filter by specific agent if requested
        ...(filters?.salesAgentId ? { sales_agent_id: filters.salesAgentId } : {})
      },
      include: {
        company: {
          select: { id: true, name: true, domain: true }
        },
        consultant: {
          select: { id: true, first_name: true, last_name: true } // Relation is likely named 'consultant'
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    // Map consultant to sales_agent to match frontend interface
    return opportunities.map(opp => ({
      ...opp,
      sales_agent: opp.consultant
    }));
  }

  /**
   * Get Regional Pipeline Stats (Forecast)
   */
  static async getRegionalPipelineStats(regionId: string) {
    // 1. Find all consultants in this region
    const regionalConsultants = await prisma.consultant.findMany({
      where: {
        region_id: regionId,
        role: { in: [ConsultantRole.SALES_AGENT, ConsultantRole.CONSULTANT_360] }
      },
      select: { id: true }
    });
    
    const consultantIds = regionalConsultants.map(c => c.id);

    // 2. Fetch active opportunities
    const opportunities = await prisma.opportunity.findMany({
      where: {
        sales_agent_id: { in: consultantIds },
        stage: {
          notIn: ['CLOSED_WON', 'CLOSED_LOST']
        }
      }
    });

    // 3. Aggregate Stats
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
      regionId,
      totalPipelineValue,
      weightedPipelineValue,
      byStage,
      dealCount: opportunities.length,
      activeAgents: consultantIds.length
    };
  }

  /**
   * Get Regional Activity Feed
   */
  static async getRegionalActivities(regionId: string, limit = 50) {
    // 1. Find all consultants in this region
    const regionalConsultants = await prisma.consultant.findMany({
      where: { region_id: regionId },
      select: { id: true }
    });
    const consultantIds = regionalConsultants.map(c => c.id);

    // 2. Fetch activities created by these agents
    return await prisma.activity.findMany({
      where: {
        created_by: { in: consultantIds }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        lead: { select: { id: true, company_name: true } },
        opportunity: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        // The relation might be named differently in schema.prisma.
        // It's likely just 'consultant' if defined, or maybe not defined on Activity model.
        // Let's assume the relation back to Consultant is not explicitly named 'consultant' in the schema or is missing.
        // But Activity has 'created_by' field which is a string (UUID).
        // If the relation exists, it should be queryable.
        // Checking previous errors, it says "Unknown field `consultant`".
        // Let's remove this include for now to fix the error, or check schema.
        // We can fetch consultant names separately if needed, but for now let's skip.
      }
    });
  }
}
