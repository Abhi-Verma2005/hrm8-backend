/**
 * Assessment Configuration Model
 * Manages assessment configurations for job rounds
 */

import { prisma } from '../lib/prisma';

export interface AssessmentConfigurationData {
  id: string;
  jobRoundId: string;
  enabled: boolean;
  autoAssign: boolean;
  deadlineDays?: number | null;
  timeLimitMinutes?: number | null;
  passThreshold?: number | null;
  provider?: string | null;
  providerConfig?: any;
  assessmentTemplateId?: string | null;
  questions?: any;
  instructions?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AssessmentConfigurationModel {
  static async findByJobRoundId(jobRoundId: string): Promise<AssessmentConfigurationData | null> {
    const config = await prisma.assessmentConfiguration.findUnique({
      where: { job_round_id: jobRoundId },
    });

    if (!config) {
      return null;
    }

    return this.mapPrismaToAssessmentConfiguration(config);
  }

  static async create(data: {
    jobRoundId: string;
    enabled?: boolean;
    autoAssign?: boolean;
    deadlineDays?: number;
    timeLimitMinutes?: number;
    passThreshold?: number;
    provider?: string;
    providerConfig?: any;
    assessmentTemplateId?: string;
    questions?: any;
    instructions?: string;
  }): Promise<AssessmentConfigurationData> {
    const config = await prisma.assessmentConfiguration.create({
      data: {
        job_round_id: data.jobRoundId,
        enabled: data.enabled ?? false,
        auto_assign: data.autoAssign ?? true,
        deadline_days: data.deadlineDays,
        time_limit_minutes: data.timeLimitMinutes,
        pass_threshold: data.passThreshold,
        provider: data.provider ?? 'native',
        provider_config: data.providerConfig,
        assessment_template_id: data.assessmentTemplateId,
        questions: data.questions,
        instructions: data.instructions,
        updated_at: new Date(),
      },
    });

    return this.mapPrismaToAssessmentConfiguration(config);
  }

  static async update(
    jobRoundId: string,
    data: Partial<Omit<AssessmentConfigurationData, 'id' | 'jobRoundId' | 'createdAt' | 'updatedAt'>>
  ): Promise<AssessmentConfigurationData | null> {
    const updateData: any = {};
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.autoAssign !== undefined) updateData.auto_assign = data.autoAssign;
    if (data.deadlineDays !== undefined) updateData.deadline_days = data.deadlineDays;
    if (data.timeLimitMinutes !== undefined) updateData.time_limit_minutes = data.timeLimitMinutes;
    if (data.passThreshold !== undefined) updateData.pass_threshold = data.passThreshold;
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.providerConfig !== undefined) updateData.provider_config = data.providerConfig;
    if (data.assessmentTemplateId !== undefined) updateData.assessment_template_id = data.assessmentTemplateId;
    if (data.questions !== undefined) updateData.questions = data.questions;
    if (data.instructions !== undefined) updateData.instructions = data.instructions;
    
    updateData.updated_at = new Date();

    const config = await prisma.assessmentConfiguration.update({
      where: { job_round_id: jobRoundId },
      data: updateData,
    });

    return this.mapPrismaToAssessmentConfiguration(config);
  }

  static async delete(jobRoundId: string): Promise<void> {
    await prisma.assessmentConfiguration.delete({
      where: { job_round_id: jobRoundId },
    });
  }

  /**
   * Map Prisma AssessmentConfiguration (snake_case) to AssessmentConfigurationData (camelCase)
   */
  private static mapPrismaToAssessmentConfiguration(prismaConfig: any): AssessmentConfigurationData {
    return {
      id: prismaConfig.id,
      jobRoundId: prismaConfig.job_round_id,
      enabled: prismaConfig.enabled,
      autoAssign: prismaConfig.auto_assign,
      deadlineDays: prismaConfig.deadline_days ?? null,
      timeLimitMinutes: prismaConfig.time_limit_minutes ?? null,
      passThreshold: prismaConfig.pass_threshold ?? null,
      provider: prismaConfig.provider ?? null,
      providerConfig: prismaConfig.provider_config ?? null,
      assessmentTemplateId: prismaConfig.assessment_template_id ?? null,
      questions: prismaConfig.questions ?? null,
      instructions: prismaConfig.instructions ?? null,
      createdAt: prismaConfig.created_at,
      updatedAt: prismaConfig.updated_at,
    };
  }
}

