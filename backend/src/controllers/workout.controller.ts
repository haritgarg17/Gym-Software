import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

export const getWorkoutPlans = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { memberId } = req.query; // If member profile ID is specified
    
    const where: any = {};
    if (memberId) {
      where.memberId = String(memberId);
    } else if (req.user.role === 'MEMBER') {
      const profile = await prisma.memberProfile.findUnique({ where: { userId: req.user.id } });
      if (!profile) return res.status(404).json({ status: 'fail', message: 'Member profile not found.' });
      where.memberId = profile.id;
    }

    const plans = await prisma.workoutPlan.findMany({
      where,
      include: {
        days: {
          include: { exercises: true }
        },
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

export const createWorkoutPlan = async (req: any, res: Response, next: NextFunction) => {
  try {
    const exerciseSchema = z.object({
      name: z.string(),
      category: z.string(),
      sets: z.number().int().positive(),
      reps: z.string(),
      restTimeSeconds: z.number().int().nonnegative().default(60),
      notes: z.string().optional(),
    });

    const daySchema = z.object({
      dayOfWeek: z.string(), // MONDAY, TUESDAY...
      exercises: z.array(exerciseSchema),
    });

    const planSchema = z.object({
      name: z.string(),
      memberId: z.string(), // Member Profile ID
      days: z.array(daySchema),
    });

    const data = planSchema.parse(req.body);

    const trainer = await prisma.trainerProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!trainer) {
      return res.status(403).json({ status: 'fail', message: 'Only trainers can build workout plans.' });
    }

    const plan = await prisma.$transaction(async (tx) => {
      const p = await tx.workoutPlan.create({
        data: {
          name: data.name,
          memberId: data.memberId,
          trainerId: trainer.id,
        }
      });

      for (const day of data.days) {
        const d = await tx.workoutDay.create({
          data: {
            planId: p.id,
            dayOfWeek: day.dayOfWeek,
          }
        });

        for (const ex of day.exercises) {
          await tx.exercise.create({
            data: {
              workoutDayId: d.id,
              name: ex.name,
              category: ex.category,
              sets: ex.sets,
              reps: ex.reps,
              restTimeSeconds: ex.restTimeSeconds,
              notes: ex.notes,
            }
          });
        }
      }

      return p;
    });

    return res.status(201).json({ status: 'success', data: { plan } });
  } catch (error) {
    next(error);
  }
};
