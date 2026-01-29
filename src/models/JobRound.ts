import { prisma } from '../lib/prisma';

// JobRoundType enum - will be available after Prisma client is regenerated
export type JobRoundType = 'ASSESSMENT' | 'INTERVIEW';

export interface JobRoundData {
  id: string;
  jobId: string;
  name: string;
  order: number;
  type: JobRoundType;
  isFixed: boolean;
  fixedKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class JobRoundModel {
  static async findById(id: string): Promise<JobRoundData | null> {
    const round = await prisma.jobRound.findUnique({
      where: { id },
    });

    return round ? this.mapPrismaToJobRound(round) : null;
  }

  static async findByJobId(jobId: string): Promise<JobRoundData[]> {
    const rounds = await prisma.jobRound.findMany({
      where: { job_id: jobId },
      orderBy: { order: 'asc' },
    });

    return rounds.map((round) => this.mapPrismaToJobRound(round));
  }

  static async findByJobIdAndFixedKey(jobId: string, fixedKey: string): Promise<JobRoundData | null> {
    const round = await prisma.jobRound.findFirst({
      where: {
        job_id: jobId,
        is_fixed: true,
        fixed_key: fixedKey,
      },
    });

    return round ? this.mapPrismaToJobRound(round) : null;
  }

  static async create(data: {
    jobId: string;
    name: string;
    order: number;
    type: JobRoundType;
    isFixed?: boolean;
    fixedKey?: string | null;
    assessmentConfig?: {
      questionType?: string;
      questions?: any;
    };
  }): Promise<JobRoundData> {
    const jobRoundData: any = {
      job_id: data.jobId,
      name: data.name,
      order: data.order,
      type: data.type,
      is_fixed: data.isFixed ?? false,
      fixed_key: data.fixedKey,
      updated_at: new Date(),
    };

    if (data.assessmentConfig) {
      jobRoundData.assessment_configuration = {
        create: {
          enabled: true,
          questions: data.assessmentConfig.questions || { type: data.assessmentConfig.questionType },
          auto_assign: true,
        },
      };
    }

    const round = await prisma.jobRound.create({
      data: jobRoundData,
      include: {
        assessment_configuration: true,
      }
    });

    return this.mapPrismaToJobRound(round);
  }

  static async update(
    id: string,
    data: Partial<Pick<JobRoundData, 'name' | 'order' | 'type'>>
  ): Promise<JobRoundData | null> {
    try {
      const updateData: any = {
        updated_at: new Date(),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.order !== undefined) updateData.order = data.order;
      if (data.type !== undefined) updateData.type = data.type;

      const round = await prisma.jobRound.update({
        where: { id },
        data: updateData,
      });
      return this.mapPrismaToJobRound(round);
    } catch {
      return null;
    }
  }

  static async delete(id: string): Promise<void> {
    await prisma.jobRound.delete({
      where: { id },
    });
  }

  private static mapPrismaToJobRound(prismaRound: any): JobRoundData {
    return {
      id: prismaRound.id,
      jobId: prismaRound.job_id,
      name: prismaRound.name,
      order: prismaRound.order,
      type: prismaRound.type,
      isFixed: prismaRound.is_fixed,
      fixedKey: prismaRound.fixed_key,
      createdAt: prismaRound.created_at,
      updatedAt: prismaRound.updated_at,
    };
  }
}


