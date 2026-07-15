import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

export const getInventory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.inventory.findMany({
      where: { branchId: req.user.branchId },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json({ status: 'success', data: { items } });
  } catch (error) {
    next(error);
  }
};

export const createInventoryItem = async (req: any, res: Response, next: NextFunction) => {
  try {
    const itemSchema = z.object({
      name: z.string(),
      category: z.string(), // EQUIPMENT, MERCHANDISE, SUPPLEMENTS
      quantity: z.number().int().nonnegative(),
      status: z.string(), // FUNCTIONAL, UNDER_MAINTENANCE, OUT_OF_STOCK
      purchaseDate: z.string().optional(),
      warrantyExpiry: z.string().optional(),
      nextMaintenanceDate: z.string().optional(),
    });

    const data = itemSchema.parse(req.body);

    const item = await prisma.inventory.create({
      data: {
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        status: data.status,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : null,
        branchId: req.user.branchId,
      },
    });

    return res.status(201).json({ status: 'success', data: { item } });
  } catch (error) {
    next(error);
  }
};

export const updateInventoryItem = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const itemSchema = z.object({
      name: z.string().optional(),
      category: z.string().optional(),
      quantity: z.number().int().nonnegative().optional(),
      status: z.string().optional(),
      purchaseDate: z.string().optional(),
      warrantyExpiry: z.string().optional(),
      nextMaintenanceDate: z.string().optional(),
    });

    const data = itemSchema.parse(req.body);

    const current = await prisma.inventory.findFirst({
      where: { id, branchId: req.user.branchId }
    });

    if (!current) {
      return res.status(404).json({ status: 'fail', message: 'Inventory item not found.' });
    }

    const updated = await prisma.inventory.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        status: data.status,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : undefined,
      },
    });

    return res.status(200).json({ status: 'success', data: { item: updated } });
  } catch (error) {
    next(error);
  }
};

export const deleteInventoryItem = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const current = await prisma.inventory.findFirst({
      where: { id, branchId: req.user.branchId }
    });

    if (!current) {
      return res.status(404).json({ status: 'fail', message: 'Inventory item not found.' });
    }

    await prisma.inventory.delete({ where: { id } });
    return res.status(200).json({ status: 'success', message: 'Inventory item deleted.' });
  } catch (error) {
    next(error);
  }
};
