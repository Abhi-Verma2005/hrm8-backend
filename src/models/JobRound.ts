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

    return round;
  }

  static async findByJobId(jobId: string): Promise<JobRoundData[]> {
    const rounds = await prisma.jobRound.findMany({
      where: { jobId },
      orderBy: { order: 'asc' },
    });

    return rounds;
  }

  static async findByJobIdAndFixedKey(jobId: string, fixedKey: string): Promise<JobRoundData | null> {
    const round = await prisma.jobRound.findFirst({
      where: {
        jobId,
        isFixed: true,
        fixedKey,
      },
    });

    return round;
  }

  static async create(data: {
    jobId: string;
    name: string;
    order: number;
    type: JobRoundType;
    isFixed?: boolean;
    fixedKey?: string | null;
  }): Promise<JobRoundData> {
    const round = await prisma.jobRound.create({
      data,
    });

    return round;
  }

  static async update(
    id: string,
    data: Partial<Pick<JobRoundData, 'name' | 'order' | 'type'>>
  ): Promise<JobRoundData | null> {
    try {
      const round = await prisma.jobRound.update({
        where: { id },
        data,
      });
      return round;
    } catch {
      return null;
    }
  }

  static async delete(id: string): Promise<void> {
    await prisma.jobRound.delete({
      where: { id },
    });
  }
}


