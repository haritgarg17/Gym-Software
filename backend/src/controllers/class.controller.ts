import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { ClassCategory, BookingStatus, CheckInMethod } from '../types/enums';

export const getClasses = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { start, end } = req.query;
    
    const where: any = {
      branchId: req.user.branchId
    };

    if (start && end) {
      where.startTime = {
        gte: new Date(String(start)),
        lte: new Date(String(end)),
      };
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        trainer: {
          select: {
            id: true,
            user: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        bookings: {
          include: {
            member: {
              select: {
                id: true,
                user: { select: { firstName: true, lastName: true } }
              }
            }
          }
        }
      },
      orderBy: { startTime: 'asc' },
    });

    return res.status(200).json({ status: 'success', data: { classes } });
  } catch (error) {
    next(error);
  }
};

export const createClass = async (req: any, res: Response, next: NextFunction) => {
  try {
    const classSchema = z.object({
      name: z.string(),
      category: z.nativeEnum(ClassCategory),
      startTime: z.string(),
      endTime: z.string(),
      capacity: z.number().int().positive(),
      trainerId: z.string(), // trainer's Profile ID
    });

    const data = classSchema.parse(req.body);

    const newClass = await prisma.class.create({
      data: {
        name: data.name,
        category: data.category,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        capacity: data.capacity,
        trainerId: data.trainerId,
        branchId: req.user.branchId,
      },
    });

    return res.status(201).json({ status: 'success', data: { class: newClass } });
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const classSchema = z.object({
      name: z.string().optional(),
      category: z.nativeEnum(ClassCategory).optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      capacity: z.number().optional(),
      trainerId: z.string().optional(),
    });

    const data = classSchema.parse(req.body);

    const current = await prisma.class.findFirst({
      where: { id, branchId: req.user.branchId }
    });

    if (!current) {
      return res.status(404).json({ status: 'fail', message: 'Class not found.' });
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        capacity: data.capacity,
        trainerId: data.trainerId,
      },
    });

    return res.status(200).json({ status: 'success', data: { class: updated } });
  } catch (error) {
    next(error);
  }
};

export const deleteClass = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const current = await prisma.class.findFirst({
      where: { id, branchId: req.user.branchId }
    });

    if (!current) {
      return res.status(404).json({ status: 'fail', message: 'Class not found.' });
    }

    await prisma.class.delete({ where: { id } });
    return res.status(200).json({ status: 'success', message: 'Class scheduled deleted.' });
  } catch (error) {
    next(error);
  }
};

// Book class
export const bookClass = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // classId
    const { memberId } = req.body; // member's Profile ID. If self booking, fetch from context.

    let targetMemberId = memberId;
    if (req.user.role === 'MEMBER') {
      const profile = await prisma.memberProfile.findUnique({ where: { userId: req.user.id } });
      if (!profile) {
        return res.status(404).json({ status: 'fail', message: 'Member profile not found.' });
      }
      targetMemberId = profile.id;
    }

    const fitnessClass = await prisma.class.findUnique({
      where: { id },
      include: { bookings: true },
    });

    if (!fitnessClass) {
      return res.status(404).json({ status: 'fail', message: 'Class not found.' });
    }

    // Check capacity
    const activeBookingsCount = fitnessClass.bookings.filter(b => b.status === BookingStatus.BOOKED).length;
    if (activeBookingsCount >= fitnessClass.capacity) {
      return res.status(400).json({ status: 'fail', message: 'Class capacity reached.' });
    }

    // Create booking
    const booking = await prisma.classBooking.upsert({
      where: {
        classId_memberId: {
          classId: id,
          memberId: targetMemberId
        }
      },
      update: { status: BookingStatus.BOOKED },
      create: {
        classId: id,
        memberId: targetMemberId,
        status: BookingStatus.BOOKED,
      }
    });

    return res.status(201).json({ status: 'success', data: { booking } });
  } catch (error) {
    next(error);
  }
};

// Cancel class booking
export const cancelBooking = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // bookingId or classId
    
    let booking = await prisma.classBooking.findFirst({
      where: { id }
    });

    // If ID is classId, try to find booking for current member
    if (!booking && req.user.role === 'MEMBER') {
      const profile = await prisma.memberProfile.findUnique({ where: { userId: req.user.id } });
      if (profile) {
        booking = await prisma.classBooking.findFirst({
          where: { classId: id, memberId: profile.id }
        });
      }
    }

    if (!booking) {
      return res.status(404).json({ status: 'fail', message: 'Booking not found.' });
    }

    await prisma.classBooking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED },
    });

    return res.status(200).json({ status: 'success', message: 'Booking cancelled.' });
  } catch (error) {
    next(error);
  }
};

// Check-in / Attendance Logging (can accept classId or check-in generally at gym)
export const checkIn = async (req: any, res: Response, next: NextFunction) => {
  try {
    const checkinSchema = z.object({
      memberId: z.string(), // Member profile ID or User ID or scan code
      checkInMethod: z.nativeEnum(CheckInMethod),
      classId: z.string().optional(),
    });

    const data = checkinSchema.parse(req.body);

    // Resolve User ID
    let resolvedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: data.memberId },
          { memberProfile: { id: data.memberId } },
        ]
      }
    });

    if (!resolvedUser) {
      return res.status(404).json({ status: 'fail', message: 'Member/User not found.' });
    }

    // Verify membership is active
    let resolvedProfile: any = null;
    if (resolvedUser.role === 'MEMBER') {
      resolvedProfile = await prisma.memberProfile.findUnique({ where: { userId: resolvedUser.id } });
      if (!resolvedProfile || resolvedProfile.status !== 'ACTIVE') {
        return res.status(400).json({ status: 'fail', message: 'Cannot check-in. Membership is inactive or expired.' });
      }
    }

    // Record attendance
    const attendance = await prisma.attendance.create({
      data: {
        userId: resolvedUser.id,
        branchId: req.user.branchId,
        checkInMethod: data.checkInMethod,
        classId: data.classId || null,
      }
    });

    // Update attendance streak for members
    if (resolvedProfile && resolvedUser.role === 'MEMBER') {
      const todayStr = new Date().toISOString().slice(0, 10);
      const lastCheckinStr = resolvedProfile.lastAttendanceDate ? new Date(resolvedProfile.lastAttendanceDate).toISOString().slice(0, 10) : null;
      let newStreak = resolvedProfile.attendanceStreak || 0;

      if (lastCheckinStr !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        if (lastCheckinStr === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }

        await prisma.memberProfile.update({
          where: { id: resolvedProfile.id },
          data: {
            attendanceStreak: newStreak,
            lastAttendanceDate: new Date(),
          }
        });
      }
    }

    // Update booking to ATTENDED if class check-in
    if (data.classId && resolvedUser.role === 'MEMBER') {
      if (resolvedProfile) {
        await prisma.classBooking.updateMany({
          where: { classId: data.classId, memberId: resolvedProfile.id },
          data: { status: BookingStatus.ATTENDED }
        });
      }
    }

    return res.status(201).json({ status: 'success', data: { attendance } });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendanceLogs = await prisma.attendance.findMany({
      where: {
        branchId: req.user.branchId,
        timestamp: { gte: today }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            memberProfile: {
              select: {
                id: true,
                mobile: true,
                attendanceStreak: true,
                status: true
              }
            }
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    return res.status(200).json({ status: 'success', data: { logs: attendanceLogs } });
  } catch (error) {
    next(error);
  }
};
