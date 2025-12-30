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
      update: {
        name: data.name,
        category: data.category,
        api_key: data.apiKey,
        api_secret: data.apiSecret,
        endpoint_url: data.endpointUrl,
        config: data.config,
        is_active: data.isActive,
      },
      create: {
        provider: data.provider,
        name: data.name,
        category: data.category,
        api_key: data.apiKey,
        api_secret: data.apiSecret,
        endpoint_url: data.endpointUrl,
        config: data.config,
        is_active: data.isActive ?? true
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
