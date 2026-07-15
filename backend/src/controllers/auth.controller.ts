import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/db';
import { Role } from '../types/enums';

const JWT_SECRET = process.env.JWT_SECRET || 'gms_jwt_secret_key_2026_super_secure_98765';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'gms_jwt_refresh_secret_key_2026_super_secure_12345';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

const generateTokens = (user: { id: string; email: string; role: string; branchId: string }) => {
  const payload = { id: user.id, email: user.email, role: user.role as Role, branchId: user.branchId };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY as any });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY as any });
  
  return { accessToken, refreshToken };
};

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string(),
  lastName: z.string(),
  role: z.nativeEnum(Role),
  branchId: z.string(),
  // For MEMBER
  gender: z.string().optional(),
  dob: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  bloodGroup: z.string().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  fitnessGoals: z.string().optional(),
  assignedTrainerId: z.string().optional(),
  membershipPlanId: z.string().optional(),
  // For TRAINER
  qualifications: z.string().optional(),
  certifications: z.string().optional(),
  specialization: z.string().optional(),
  salary: z.number().optional(),
  availability: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    
    if (existingUser) {
      return res.status(400).json({ status: 'fail', message: 'Email already registered.' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);
    
    // Use transaction to create user and profile
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          branchId: data.branchId,
        },
      });
      
      if (data.role === Role.MEMBER) {
        let bmi: number | undefined;
        if (data.height && data.weight) {
          const heightM = data.height / 100;
          bmi = Number((data.weight / (heightM * heightM)).toFixed(2));
        }

        await tx.memberProfile.create({
          data: {
            userId: user.id,
            gender: data.gender || 'Other',
            dob: data.dob ? new Date(data.dob) : new Date(),
            mobile: data.mobile || '',
            address: data.address || '',
            emergencyContact: data.emergencyContact || '',
            bloodGroup: data.bloodGroup,
            height: data.height,
            weight: data.weight,
            bmi: bmi,
            fitnessGoals: data.fitnessGoals,
            assignedTrainerId: data.assignedTrainerId,
            membershipPlanId: data.membershipPlanId,
            status: data.membershipPlanId ? 'ACTIVE' : 'PENDING',
          },
        });
      } else if (data.role === Role.TRAINER) {
        await tx.trainerProfile.create({
          data: {
            userId: user.id,
            qualifications: data.qualifications || 'N/A',
            certifications: data.certifications || 'N/A',
            specialization: data.specialization || 'General',
            salary: data.salary || 0,
            availability: data.availability || '09:00-17:00',
          },
        });
      }
      
      // Log event
      await tx.auditLog.create({
        data: {
          action: 'REGISTER_USER',
          category: 'SECURITY',
          details: `Registered new user ${user.email} as ${user.role}`,
          actorId: user.id,
        },
      });
      
      return user;
    });
    
    const { passwordHash: _, ...userWithoutPassword } = result;
    const tokens = generateTokens(result);
    
    return res.status(201).json({
      status: 'success',
      data: {
        user: userWithoutPassword,
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ status: 'fail', message: 'Incorrect email or password.' });
    }
    
    const tokens = generateTokens(user);
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        category: 'SECURITY',
        details: `User ${user.email} successfully logged in`,
        actorId: user.id,
      },
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        user: userWithoutPassword,
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ status: 'fail', message: 'Refresh token is required.' });
    }
    
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string; email: string; role: Role; branchId: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });
    
    if (!user) {
      return res.status(401).json({ status: 'fail', message: 'The user no longer exists.' });
    }
    
    const tokens = generateTokens(user);
    
    return res.status(200).json({
      status: 'success',
      data: tokens,
    });
  } catch (error) {
    return res.status(401).json({ status: 'fail', message: 'Invalid or expired refresh token.' });
  }
};

export const getMe = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        memberProfile: {
          include: {
            membershipPlan: true,
            assignedTrainer: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, email: true }
                }
              }
            }
          }
        },
        trainerProfile: true,
        branch: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found.' });
    }
    
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    return res.status(200).json({
      status: 'success',
      data: { user: userWithoutPassword },
    });
  } catch (error) {
    next(error);
  }
};
