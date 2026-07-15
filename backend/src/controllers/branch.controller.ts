import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

export const getBranches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
    });
    return res.status(200).json({ status: 'success', data: { branches } });
  } catch (error) {
    next(error);
  }
};

export const createBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branchSchema = z.object({
      name: z.string(),
      address: z.string(),
      phone: z.string(),
      email: z.string().email(),
    });

    const data = branchSchema.parse(req.body);

    const branch = await prisma.branch.create({
      data,
    });

    return res.status(201).json({ status: 'success', data: { branch } });
  } catch (error) {
    next(error);
  }
};

// Plan Operations
export const getPlans = async (req: any, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.membershipPlan.findMany({
      where: { branchId: req.user.branchId },
      orderBy: { price: 'asc' },
    });
    return res.status(200).json({ status: 'success', data: { plans } });
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req: any, res: Response, next: NextFunction) => {
  try {
    const planSchema = z.object({
      name: z.string(),
      durationMonths: z.number().int().positive(),
      price: z.number().positive(),
    });

    const data = planSchema.parse(req.body);

    const plan = await prisma.membershipPlan.create({
      data: {
        ...data,
        branchId: req.user.branchId,
      },
    });

    return res.status(201).json({ status: 'success', data: { plan } });
  } catch (error) {
    next(error);
  }
};
