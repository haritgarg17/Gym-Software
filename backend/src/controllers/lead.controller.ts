import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';

const leadCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').or(z.string().length(0)),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  status: z.string().default('NEW'),
  source: z.string().default('WALK_IN'),
  notes: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
});

const leadUpdateSchema = leadCreateSchema.partial();

export const getLeads = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { search, status, source } = req.query;

    const where: any = {
      branchId: req.user.branchId,
    };

    if (status) {
      where.status = String(status);
    }

    if (source) {
      where.source = String(source);
    }

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ status: 'success', data: { leads } });
  } catch (error) {
    next(error);
  }
};

export const createLead = async (req: any, res: Response, next: NextFunction) => {
  try {
    const parsedData = leadCreateSchema.parse(req.body);

    const lead = await prisma.lead.create({
      data: {
        name: parsedData.name,
        email: parsedData.email || '',
        phone: parsedData.phone,
        status: parsedData.status,
        source: parsedData.source,
        notes: parsedData.notes,
        followUpDate: parsedData.followUpDate ? new Date(parsedData.followUpDate) : null,
        branchId: req.user.branchId,
      },
    });

    // Audit log lead creation
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_LEAD',
        category: 'MEMBER',
        details: `Created lead ${lead.name} (${lead.phone})`,
        actorId: req.user.id,
      },
    });

    return res.status(201).json({ status: 'success', data: { lead } });
  } catch (error) {
    next(error);
  }
};

export const updateLead = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsedData = leadUpdateSchema.parse(req.body);

    const existingLead = await prisma.lead.findFirst({
      where: { id, branchId: req.user.branchId },
    });

    if (!existingLead) {
      return res.status(404).json({ status: 'fail', message: 'Lead not found in this branch.' });
    }

    const updateData: any = {
      name: parsedData.name,
      email: parsedData.email,
      phone: parsedData.phone,
      status: parsedData.status,
      source: parsedData.source,
      notes: parsedData.notes,
    };

    if (parsedData.followUpDate !== undefined) {
      updateData.followUpDate = parsedData.followUpDate ? new Date(parsedData.followUpDate) : null;
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
    });

    // Audit log status transition or update
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_LEAD',
        category: 'MEMBER',
        details: `Updated lead ${lead.name} to status ${lead.status}`,
        actorId: req.user.id,
      },
    });

    return res.status(200).json({ status: 'success', data: { lead } });
  } catch (error) {
    next(error);
  }
};

export const deleteLead = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existingLead = await prisma.lead.findFirst({
      where: { id, branchId: req.user.branchId },
    });

    if (!existingLead) {
      return res.status(404).json({ status: 'fail', message: 'Lead not found in this branch.' });
    }

    await prisma.lead.delete({
      where: { id },
    });

    // Audit log deletion
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_LEAD',
        category: 'MEMBER',
        details: `Deleted lead ${existingLead.name}`,
        actorId: req.user.id,
      },
    });

    return res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
