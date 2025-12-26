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
      where: { jobRoundId },
    });

    return config;
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
        jobRoundId: data.jobRoundId,
        enabled: data.enabled ?? false,
        autoAssign: data.autoAssign ?? true,
        deadlineDays: data.deadlineDays,
        timeLimitMinutes: data.timeLimitMinutes,
        passThreshold: data.passThreshold,
        provider: data.provider ?? 'native',
        providerConfig: data.providerConfig,
        assessmentTemplateId: data.assessmentTemplateId,
        questions: data.questions,
        instructions: data.instructions,
      },
    });

    return config;
  }

  static async update(
    jobRoundId: string,
    data: Partial<Omit<AssessmentConfigurationData, 'id' | 'jobRoundId' | 'createdAt' | 'updatedAt'>>
  ): Promise<AssessmentConfigurationData | null> {
    const config = await prisma.assessmentConfiguration.update({
      where: { jobRoundId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return config;
  }

  static async delete(jobRoundId: string): Promise<void> {
    await prisma.assessmentConfiguration.delete({
      where: { jobRoundId },
    });
  }
}

