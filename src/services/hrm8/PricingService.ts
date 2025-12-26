import { prisma } from '../../lib/prisma';

export class PricingService {
  /**
   * Get all products
   */
  static async getAllProducts() {
    return prisma.product.findMany({
      where: { isActive: true },
      include: { tiers: true },
    });
  }

  /**
   * Create or update product
   */
  static async upsertProduct(data: {
    id?: string;
    name: string;
    code: string;
    description?: string;
    category: string;
    isActive?: boolean;
  }) {
    if (data.id) {
      return prisma.product.update({
        where: { id: data.id },
        data,
      });
    }
    return prisma.product.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        category: data.category,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Get all price books
   */
  static async getAllPriceBooks(regionId?: string) {
    const where: any = { isActive: true };
    if (regionId) {
      where.regionId = regionId;
    }
    return prisma.priceBook.findMany({
      where,
      include: {
        tiers: {
          include: { product: true }
        },
        region: true
      },
    });
  }

  /**
   * Create price book
   */
  static async createPriceBook(data: {
    name: string;
    description?: string;
    isGlobal: boolean;
    regionId?: string;
    currency: string;
    tiers: {
      productId: string;
      name: string;
      minQuantity: number;
      maxQuantity?: number;
      unitPrice: number;
      period: string;
    }[];
  }) {
    return prisma.priceBook.create({
      data: {
        name: data.name,
        description: data.description,
        isGlobal: data.isGlobal,
        regionId: data.regionId,
        currency: data.currency,
        tiers: {
          create: data.tiers.map(tier => ({
            productId: tier.productId,
            name: tier.name,
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity,
            unitPrice: tier.unitPrice,
            period: tier.period
          }))
        }
      },
      include: { tiers: true }
    });
  }

  /**
   * Assign custom price book to company
   */
  static async assignCustomPriceBook(companyId: string, priceBookId: string) {
    return prisma.company.update({
      where: { id: companyId },
      // @ts-ignore: priceBookId exists in schema but types might be stale
      data: { priceBookId }
    });
  }
}
