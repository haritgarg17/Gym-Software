import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

export const getDietPlans = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.query;

    const where: any = {};
    if (memberId) {
      where.memberId = String(memberId);
    } else if (req.user.role === 'MEMBER') {
      const profile = await prisma.memberProfile.findUnique({ where: { userId: req.user.id } });
      if (!profile) return res.status(404).json({ status: 'fail', message: 'Member profile not found.' });
      where.memberId = profile.id;
    }

    const plans = await prisma.dietPlan.findMany({
      where,
      include: {
        meals: true,
        trainer: {
          select: {
            user: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ status: 'success', data: { plans } });
  } catch (error) {
    next(error);
  }
};

export const createDietPlan = async (req: any, res: Response, next: NextFunction) => {
  try {
    const mealSchema = z.object({
      mealType: z.string(), // BREAKFAST, LUNCH, DINNER, SNACK
      time: z.string(),
      items: z.string(),
      calories: z.number().nonnegative(),
      protein: z.number().nonnegative(),
      carbs: z.number().nonnegative(),
      fat: z.number().nonnegative(),
      waterIntakeMl: z.number().nonnegative().default(0),
    });

    const planSchema = z.object({
      name: z.string(),
      memberId: z.string(), // Member Profile ID
      meals: z.array(mealSchema),
    });

    const data = planSchema.parse(req.body);

    const trainer = await prisma.trainerProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!trainer) {
      return res.status(403).json({ status: 'fail', message: 'Only trainers can construct diet plans.' });
    }

    const plan = await prisma.$transaction(async (tx) => {
      const p = await tx.dietPlan.create({
        data: {
          name: data.name,
          memberId: data.memberId,
          trainerId: trainer.id,
        }
      });

      for (const meal of data.meals) {
        await tx.meal.create({
          data: {
            dietPlanId: p.id,
            mealType: meal.mealType,
            time: meal.time,
            items: meal.items,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat,
            waterIntakeMl: meal.waterIntakeMl,
          }
        });
      }

      return p;
    });

    return res.status(201).json({ status: 'success', data: { plan } });
  } catch (error) {
    next(error);
  }
};
// Add get/update progress metrics for diets if needed
