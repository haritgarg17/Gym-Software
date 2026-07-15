import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import bcrypt from 'bcryptjs';
import { MembershipStatus, Role, InvoiceStatus } from '../types/enums';

const memberUpdateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  bloodGroup: z.string().nullable().optional(),
  height: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  fitnessGoals: z.string().nullable().optional(),
  medicalConditions: z.string().nullable().optional(),
  assignedTrainerId: z.string().nullable().optional(),
  membershipPlanId: z.string().nullable().optional(),
  status: z.nativeEnum(MembershipStatus).optional(),
});

export const getMembers = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { search, planId, status, trainerId, gender, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    // Build query conditions
    const where: any = {
      role: Role.MEMBER,
      branchId: req.user.branchId, // Scope by active branch
    };

    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { memberProfile: { mobile: { contains: String(search) } } },
      ];
    }

    const profileWhere: any = {};
    if (planId) profileWhere.membershipPlanId = String(planId);
    if (status) profileWhere.status = status as MembershipStatus;
    if (trainerId) profileWhere.assignedTrainerId = String(trainerId);
    if (gender) profileWhere.gender = String(gender);

    if (Object.keys(profileWhere).length > 0) {
      where.memberProfile = profileWhere;
    }

    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          branchId: true,
          memberProfile: {
            include: {
              membershipPlan: true,
              assignedTrainer: {
                select: {
                  id: true,
                  user: {
                    select: { firstName: true, lastName: true }
                  }
                }
              }
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const updatedMembers = members.map((member: any) => {
      if (member.memberProfile && member.memberProfile.status === MembershipStatus.ACTIVE && member.memberProfile.expiryDate) {
        const today = new Date();
        const expiry = new Date(member.memberProfile.expiryDate);
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7) {
          member.memberProfile.status = 'EXPIRING_SOON';
        }
      }
      return member;
    });

    return res.status(200).json({
      status: 'success',
      results: updatedMembers.length,
      total,
      pages: Math.ceil(total / Number(limit)),
      data: { members: updatedMembers },
    });
  } catch (error) {
    next(error);
  }
};

export const getMemberById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const member = await prisma.user.findFirst({
      where: { id, role: Role.MEMBER },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        branchId: true,
        memberProfile: {
          include: {
            membershipPlan: true,
            assignedTrainer: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, email: true }
                }
              }
            },
            progressLogs: {
              orderBy: { recordedAt: 'desc' }
            },
            payments: {
              orderBy: { createdAt: 'desc' }
            },
            invoices: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!member) {
      return res.status(404).json({ status: 'fail', message: 'Member not found.' });
    }

    return res.status(200).json({ status: 'success', data: { member } });
  } catch (error) {
    next(error);
  }
};

export const createMember = async (req: any, res: Response, next: NextFunction) => {
  try {
    const createSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      firstName: z.string(),
      lastName: z.string(),
      gender: z.string(),
      dob: z.string(),
      mobile: z.string(),
      address: z.string(),
      emergencyContact: z.string(),
      bloodGroup: z.string().optional(),
      height: z.number().optional(),
      weight: z.number().optional(),
      fitnessGoals: z.string().optional(),
      medicalConditions: z.string().optional(),
      assignedTrainerId: z.string().optional(),
      membershipPlanId: z.string().optional(),
    });

    const data = createSchema.parse(req.body);
    
    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(400).json({ status: 'fail', message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    
    const result = await prisma.$transaction(async (tx) => {
      // Calculate initial BMI
      let bmi: number | undefined;
      if (data.height && data.weight) {
        const heightM = data.height / 100;
        bmi = Number((data.weight / (heightM * heightM)).toFixed(2));
      }

      // Check plan
      let planExpiry: Date | undefined;
      if (data.membershipPlanId) {
        const plan = await tx.membershipPlan.findUnique({ where: { id: data.membershipPlanId } });
        if (plan) {
          const exp = new Date();
          exp.setMonth(exp.getMonth() + plan.durationMonths);
          planExpiry = exp;
        }
      }

      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: Role.MEMBER,
          branchId: req.user.branchId,
        }
      });

      const profile = await tx.memberProfile.create({
        data: {
          userId: user.id,
          gender: data.gender,
          dob: new Date(data.dob),
          mobile: data.mobile,
          address: data.address,
          emergencyContact: data.emergencyContact,
          bloodGroup: data.bloodGroup,
          height: data.height,
          weight: data.weight,
          bmi,
          fitnessGoals: data.fitnessGoals,
          medicalConditions: data.medicalConditions,
          assignedTrainerId: data.assignedTrainerId || null,
          membershipPlanId: data.membershipPlanId || null,
          status: data.membershipPlanId ? MembershipStatus.ACTIVE : MembershipStatus.PENDING,
          expiryDate: planExpiry,
        }
      });

      // Add to progress log
      if (data.weight) {
        await tx.memberProgress.create({
          data: {
            memberId: profile.id,
            weight: data.weight,
            bmi,
          }
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'CREATE_MEMBER',
          category: 'MEMBER',
          details: `Registered member ${user.email} by ${req.user.email}`,
          actorId: req.user.id,
        }
      });

      return user;
    });

    const { passwordHash: _, ...memberWithoutPassword } = result;
    return res.status(201).json({ status: 'success', data: { member: memberWithoutPassword } });
  } catch (error) {
    next(error);
  }
};

export const updateMember = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = memberUpdateSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { id, role: Role.MEMBER, branchId: req.user.branchId }
    });

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'Member not found in your branch.' });
    }

    await prisma.$transaction(async (tx) => {
      // Update core user data if provided
      if (updates.firstName || updates.lastName) {
        await tx.user.update({
          where: { id },
          data: {
            firstName: updates.firstName,
            lastName: updates.lastName,
          }
        });
      }

      // Read current profile
      const profile = await tx.memberProfile.findUnique({ where: { userId: id } });
      if (!profile) return;

      // Handle BMI changes
      let updatedBmi = profile.bmi || undefined;
      const newHeight = updates.height !== undefined ? updates.height : profile.height;
      const newWeight = updates.weight !== undefined ? updates.weight : profile.weight;
      if (newHeight && newWeight) {
        const heightM = newHeight / 100;
        updatedBmi = Number((newWeight / (heightM * heightM)).toFixed(2));
      }

      // Handle plan changes expiry dates
      let planExpiry = profile.expiryDate;
      if (updates.membershipPlanId && updates.membershipPlanId !== profile.membershipPlanId) {
        const plan = await tx.membershipPlan.findUnique({ where: { id: updates.membershipPlanId } });
        if (plan) {
          const exp = new Date();
          exp.setMonth(exp.getMonth() + plan.durationMonths);
          planExpiry = exp;
        }
      }

      // Update Member Profile
      await tx.memberProfile.update({
        where: { userId: id },
        data: {
          gender: updates.gender,
          dob: updates.dob ? new Date(updates.dob) : undefined,
          mobile: updates.mobile,
          address: updates.address,
          emergencyContact: updates.emergencyContact,
          bloodGroup: updates.bloodGroup,
          height: updates.height,
          weight: updates.weight,
          bmi: updatedBmi,
          fitnessGoals: updates.fitnessGoals,
          medicalConditions: updates.medicalConditions,
          assignedTrainerId: updates.assignedTrainerId === null ? null : updates.assignedTrainerId,
          membershipPlanId: updates.membershipPlanId === null ? null : updates.membershipPlanId,
          status: updates.status,
          expiryDate: planExpiry,
        }
      });

      // Record progress log if weight changed
      if (updates.weight && updates.weight !== profile.weight) {
        await tx.memberProgress.create({
          data: {
            memberId: profile.id,
            weight: updates.weight,
            bmi: updatedBmi,
          }
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_MEMBER',
          category: 'MEMBER',
          details: `Updated member profile details for ${user.email}`,
          actorId: req.user.id,
        }
      });
    });

    return res.status(200).json({ status: 'success', message: 'Member profile updated successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deleteMember = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findFirst({
      where: { id, role: Role.MEMBER, branchId: req.user.branchId }
    });

    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'Member not found in your branch.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          action: 'DELETE_MEMBER',
          category: 'MEMBER',
          details: `Deleted member account: ${user.email}`,
          actorId: req.user.id,
        }
      });
    });

    return res.status(200).json({ status: 'success', message: 'Member profile deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Add Progress Logs (Weight and Body details)
export const logProgress = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // userId
    const logSchema = z.object({
      weight: z.number(),
      bodyFat: z.number().optional(),
      chest: z.number().optional(),
      waist: z.number().optional(),
      hips: z.number().optional(),
      arms: z.number().optional(),
      photoUrl: z.string().optional(),
    });

    const data = logSchema.parse(req.body);
    const profile = await prisma.memberProfile.findUnique({ where: { userId: id } });
    if (!profile) {
      return res.status(404).json({ status: 'fail', message: 'Member profile not found.' });
    }

    let bmi: number | undefined;
    if (profile.height) {
      const heightM = profile.height / 100;
      bmi = Number((data.weight / (heightM * heightM)).toFixed(2));
    }

    const progress = await prisma.$transaction(async (tx) => {
      // update current profile
      await tx.memberProfile.update({
        where: { id: profile.id },
        data: { weight: data.weight, bmi }
      });

      return await tx.memberProgress.create({
        data: {
          memberId: profile.id,
          weight: data.weight,
          bmi,
          bodyFat: data.bodyFat,
          chest: data.chest,
          waist: data.waist,
          hips: data.hips,
          arms: data.arms,
          photoUrl: data.photoUrl,
        }
      });
    });

    return res.status(201).json({ status: 'success', data: { progress } });
  } catch (error) {
    next(error);
  }
};

export const freezeMember = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const freezeSchema = z.object({
      freezeStartDate: z.string(),
      freezeEndDate: z.string(),
    });

    const data = freezeSchema.parse(req.body);

    const member = await prisma.user.findFirst({
      where: { id, role: Role.MEMBER, branchId: req.user.branchId },
      include: { memberProfile: true }
    });

    if (!member || !member.memberProfile) {
      return res.status(404).json({ status: 'fail', message: 'Member profile not found.' });
    }

    if (member.memberProfile.status === MembershipStatus.FROZEN) {
      return res.status(400).json({ status: 'fail', message: 'Membership is already frozen.' });
    }

    const start = new Date(data.freezeStartDate);
    const end = new Date(data.freezeEndDate);

    if (start >= end) {
      return res.status(400).json({ status: 'fail', message: 'Freeze start date must be before end date.' });
    }

    await prisma.memberProfile.update({
      where: { id: member.memberProfile.id },
      data: {
        status: MembershipStatus.FROZEN,
        freezeStartDate: start,
        freezeEndDate: end,
        originalExpiryDate: member.memberProfile.expiryDate,
        expiryDate: null
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'FREEZE_MEMBERSHIP',
        category: 'MEMBER',
        details: `Froze membership for member ${member.firstName} ${member.lastName} from ${data.freezeStartDate} to ${data.freezeEndDate}`,
        actorId: req.user.id
      }
    });

    return res.status(200).json({ status: 'success', message: 'Membership has been frozen successfully.' });
  } catch (error) {
    next(error);
  }
};

export const resumeMember = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const member = await prisma.user.findFirst({
      where: { id, role: Role.MEMBER, branchId: req.user.branchId },
      include: { memberProfile: true }
    });

    if (!member || !member.memberProfile) {
      return res.status(404).json({ status: 'fail', message: 'Member profile not found.' });
    }

    if (member.memberProfile.status !== MembershipStatus.FROZEN) {
      return res.status(400).json({ status: 'fail', message: 'Membership is not frozen.' });
    }

    const freezeStart = member.memberProfile.freezeStartDate ? new Date(member.memberProfile.freezeStartDate) : new Date();
    const today = new Date();
    const freezeDurationMs = Math.max(0, today.getTime() - freezeStart.getTime());
    const freezeDays = Math.ceil(freezeDurationMs / (1000 * 60 * 60 * 24));

    let newExpiry = member.memberProfile.originalExpiryDate ? new Date(member.memberProfile.originalExpiryDate) : new Date();
    newExpiry.setDate(newExpiry.getDate() + freezeDays);

    await prisma.memberProfile.update({
      where: { id: member.memberProfile.id },
      data: {
        status: MembershipStatus.ACTIVE,
        expiryDate: newExpiry,
        freezeStartDate: null,
        freezeEndDate: null,
        originalExpiryDate: null,
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'RESUME_MEMBERSHIP',
        category: 'MEMBER',
        details: `Resumed membership for ${member.firstName} ${member.lastName}. Extended plan expiry date by ${freezeDays} days.`,
        actorId: req.user.id
      }
    });

    return res.status(200).json({ status: 'success', message: 'Membership resumed successfully.' });
  } catch (error) {
    next(error);
  }
};

export const renewMember = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const renewSchema = z.object({
      membershipPlanId: z.string(),
    });

    const data = renewSchema.parse(req.body);

    const [member, plan] = await Promise.all([
      prisma.user.findFirst({
        where: { id, role: Role.MEMBER, branchId: req.user.branchId },
        include: { memberProfile: true }
      }),
      prisma.membershipPlan.findUnique({
        where: { id: data.membershipPlanId }
      })
    ]);

    if (!member || !member.memberProfile) {
      return res.status(404).json({ status: 'fail', message: 'Member profile not found.' });
    }

    if (!plan) {
      return res.status(404).json({ status: 'fail', message: 'Membership plan not found.' });
    }

    let baseDate = new Date();
    if (member.memberProfile.status === MembershipStatus.ACTIVE && member.memberProfile.expiryDate && new Date(member.memberProfile.expiryDate) > new Date()) {
      baseDate = new Date(member.memberProfile.expiryDate);
    }

    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + plan.durationMonths);

    const baseAmount = plan.price;
    const gstAmount = Number((baseAmount * 0.18).toFixed(2));
    const totalAmount = Number((baseAmount + gstAmount).toFixed(2));
    const invoiceNumber = `INV-REN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    await prisma.$transaction(async (tx) => {
      await tx.invoice.create({
        data: {
          invoiceNumber,
          amount: baseAmount,
          discount: 0,
          gst: gstAmount,
          totalAmount,
          status: InvoiceStatus.UNPAID,
          memberId: member.memberProfile!.id,
          dueDate: new Date(Date.now() + 86400000 * 3)
        }
      });

      await tx.memberProfile.update({
        where: { id: member.memberProfile!.id },
        data: {
          status: MembershipStatus.ACTIVE,
          membershipPlanId: plan.id,
          expiryDate: newExpiry,
          freezeStartDate: null,
          freezeEndDate: null,
          originalExpiryDate: null,
        }
      });

      await tx.auditLog.create({
        data: {
          action: 'RENEW_MEMBERSHIP',
          category: 'BILLING',
          details: `Renewed membership for ${member.firstName} ${member.lastName} to plan ${plan.name}. Generated invoice ${invoiceNumber}`,
          actorId: req.user.id
        }
      });
    });

    return res.status(200).json({ status: 'success', message: 'Membership renewed successfully. Renewal invoice generated.' });
  } catch (error) {
    next(error);
  }
};
