import { prisma } from '../../lib/prisma';

export class PricingService {
  /**
   * Get all products
   */
  static async getAllProducts() {
    return prisma.product.findMany({
      where: { is_active: true },
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
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          category: data.category,
          is_active: data.isActive,
          updated_at: new Date()
        },
      });
    }
    return prisma.product.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        category: data.category,
        is_active: data.isActive ?? true,
        updated_at: new Date()
      },
    });
  }

  /**
   * Get all price books
   */
  static async getAllPriceBooks(regionId?: string) {
    const where: any = { is_active: true };
    if (regionId) {
      where.region_id = regionId;
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
        is_global: data.isGlobal,
        region_id: data.regionId,
        currency: data.currency,
        tiers: {
          create: data.tiers.map(tier => ({
            product_id: tier.productId,
            name: tier.name,
            min_quantity: tier.minQuantity,
            max_quantity: tier.maxQuantity,
            unit_price: tier.unitPrice,
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
      data: { price_book_id: priceBookId }
    });
  }
}
