import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import bcrypt from 'bcryptjs';
import { Role } from '../types/enums';

export const getTrainers = async (req: any, res: Response, next: NextFunction) => {
  try {
    const trainers = await prisma.user.findMany({
      where: {
        role: Role.TRAINER,
        branchId: req.user.branchId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        trainerProfile: true,
      },
    });

    return res.status(200).json({ status: 'success', data: { trainers } });
  } catch (error) {
    next(error);
  }
};

export const createTrainer = async (req: any, res: Response, next: NextFunction) => {
  try {
    const trainerSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      firstName: z.string(),
      lastName: z.string(),
      qualifications: z.string(),
      certifications: z.string(),
      specialization: z.string(),
      salary: z.number(),
      availability: z.string(),
    });

    const data = trainerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(400).json({ status: 'fail', message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const trainer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: Role.TRAINER,
          branchId: req.user.branchId,
        },
      });

      await tx.trainerProfile.create({
        data: {
          userId: user.id,
          qualifications: data.qualifications,
          certifications: data.certifications,
          specialization: data.specialization,
          salary: data.salary,
          availability: data.availability,
        },
      });

      return user;
    });

    const { passwordHash: _, ...trainerData } = trainer;
    return res.status(201).json({ status: 'success', data: { trainer: trainerData } });
  } catch (error) {
    next(error);
  }
};

export const updateTrainer = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateSchema = z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      qualifications: z.string().optional(),
      certifications: z.string().optional(),
      specialization: z.string().optional(),
      salary: z.number().optional(),
      availability: z.string().optional(),
    });

    const data = updateSchema.parse(req.body);

    const trainer = await prisma.user.findFirst({
      where: { id, role: Role.TRAINER, branchId: req.user.branchId }
    });

    if (!trainer) {
      return res.status(404).json({ status: 'fail', message: 'Trainer not found.' });
    }

    await prisma.$transaction(async (tx) => {
      if (data.firstName || data.lastName) {
        await tx.user.update({
          where: { id },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
          },
        });
      }

      await tx.trainerProfile.update({
        where: { userId: id },
        data: {
          qualifications: data.qualifications,
          certifications: data.certifications,
          specialization: data.specialization,
          salary: data.salary,
          availability: data.availability,
        },
      });
    });

    return res.status(200).json({ status: 'success', message: 'Trainer updated successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getAssignedMembers = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // trainer userId or self

    const trainer = await prisma.user.findFirst({
      where: { id, role: Role.TRAINER },
      include: { trainerProfile: true },
    });

    if (!trainer || !trainer.trainerProfile) {
      return res.status(404).json({ status: 'fail', message: 'Trainer profile not found.' });
    }

    const members = await prisma.memberProfile.findMany({
      where: { assignedTrainerId: trainer.trainerProfile.id },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        },
        membershipPlan: true,
      },
    });

    return res.status(200).json({ status: 'success', data: { members } });
  } catch (error) {
    next(error);
  }
};
