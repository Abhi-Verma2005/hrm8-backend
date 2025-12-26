import { prisma } from '../../lib/prisma';

export class IntegrationAdminService {
  /**
   * Get all global integrations
   */
  static async getAll() {
    return prisma.globalIntegration.findMany({
      orderBy: { provider: 'asc' }
    });
  }

  /**
   * Upsert global integration config
   */
  static async upsert(data: {
    provider: string;
    name: string;
    category: string;
    apiKey?: string;
    apiSecret?: string;
    endpointUrl?: string;
    config?: any;
    isActive?: boolean;
  }) {
    return prisma.globalIntegration.upsert({
      where: { provider: data.provider },
      update: data,
      create: {
        provider: data.provider,
        name: data.name,
        category: data.category,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        endpointUrl: data.endpointUrl,
        config: data.config,
        isActive: data.isActive ?? true
      }
    });
  }

  /**
   * Get integration usage stats
   */
  static async getUsageStats() {
    const usage = await prisma.integration.groupBy({
      by: ['type'],
      _count: {
        id: true
      },
      where: {
        status: 'ACTIVE'
      }
    });
    return usage;
  }
}
