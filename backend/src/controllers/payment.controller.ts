import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../config/db';
import { InvoiceStatus, PaymentStatus, MembershipStatus } from '../types/enums';

export const getInvoices = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { status, search } = req.query;

    const where: any = {
      member: {
        user: { branchId: req.user.branchId }
      }
    };

    if (status) {
      where.status = status as InvoiceStatus;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: String(search), mode: 'insensitive' } },
        { member: { user: { firstName: { contains: String(search), mode: 'insensitive' } } } },
        { member: { user: { lastName: { contains: String(search), mode: 'insensitive' } } } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true, email: true } },
            mobile: true,
          }
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ status: 'success', data: { invoices } });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req: any, res: Response, next: NextFunction) => {
  try {
    const invoiceSchema = z.object({
      memberId: z.string(), // member Profile ID
      amount: z.number().positive(),
      discount: z.number().nonnegative().default(0),
      dueDate: z.string(),
    });

    const data = invoiceSchema.parse(req.body);

    // Calculate GST (18% for gym service)
    const base = data.amount - data.discount;
    const gst = Number((base * 0.18).toFixed(2));
    const totalAmount = Number((base + gst).toFixed(2));

    const invoiceNumber = `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        amount: data.amount,
        discount: data.discount,
        gst,
        totalAmount,
        status: InvoiceStatus.UNPAID,
        memberId: data.memberId,
        dueDate: new Date(data.dueDate),
      },
      include: {
        member: {
          include: { user: true }
        }
      }
    });

    return res.status(201).json({ status: 'success', data: { invoice } });
  } catch (error) {
    next(error);
  }
};

export const checkoutPayment = async (req: any, res: Response, next: NextFunction) => {
  try {
    const checkoutSchema = z.object({
      invoiceId: z.string(),
      method: z.string(), // CASH, UPI, CARD, BANK_TRANSFER
      transactionId: z.string().optional(),
    });

    const data = checkoutSchema.parse(req.body);

    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { member: true }
    });

    if (!invoice) {
      return res.status(404).json({ status: 'fail', message: 'Invoice not found.' });
    }

    if (invoice.status === InvoiceStatus.PAID) {
      return res.status(400).json({ status: 'fail', message: 'Invoice is already paid.' });
    }

    const transactionId = data.transactionId || `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Create payment
      const p = await tx.payment.create({
        data: {
          amount: invoice.totalAmount,
          gst: invoice.gst,
          discount: invoice.discount,
          method: data.method,
          transactionId,
          status: PaymentStatus.PAID,
          invoiceId: invoice.id,
          memberId: invoice.memberId,
        }
      });

      // 2. Update invoice status
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.PAID }
      });

      // 3. Renew / Update member profile status and extend expiry date if this is linked to their membershipPlan
      if (invoice.member.membershipPlanId) {
        const plan = await tx.membershipPlan.findUnique({
          where: { id: invoice.member.membershipPlanId }
        });

        if (plan) {
          const newExpiry = new Date();
          newExpiry.setMonth(newExpiry.getMonth() + plan.durationMonths);

          await tx.memberProfile.update({
            where: { id: invoice.memberId },
            data: {
              status: MembershipStatus.ACTIVE,
              expiryDate: newExpiry,
            }
          });
        }
      }

      // 4. Log audit log
      await tx.auditLog.create({
        data: {
          action: 'PROCESS_PAYMENT',
          category: 'BILLING',
          details: `Processed payment of ${invoice.totalAmount} for Invoice ${invoice.invoiceNumber}`,
          actorId: req.user.id,
        }
      });

      return p;
    });

    return res.status(200).json({ status: 'success', data: { payment } });
  } catch (error) {
    next(error);
  }
};

// Simulate auto-billing check for members whose plans are about to expire (or have expired)
export const simulateAutoBilling = async (req: any, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    const alertThreshold = new Date();
    alertThreshold.setDate(today.getDate() + 3); // 3 days alert

    // 1. Expiries: Find active members with past expiry dates
    const expiredMembers = await prisma.memberProfile.findMany({
      where: {
        status: MembershipStatus.ACTIVE,
        expiryDate: { lte: today },
      },
      include: { user: true }
    });

    for (const member of expiredMembers) {
      await prisma.$transaction(async (tx) => {
        await tx.memberProfile.update({
          where: { id: member.id },
          data: { status: MembershipStatus.EXPIRED }
        });

        await tx.auditLog.create({
          data: {
            action: 'AUTO_EXPIRE_MEMBERSHIP',
            category: 'SECURITY',
            details: `Auto expired membership for ${member.user.email}`,
          }
        });
      });
    }

    // 2. Billing: Auto-generate unpaid invoices for members expiring in the next 3 days
    const upcomingExpiries = await prisma.memberProfile.findMany({
      where: {
        status: MembershipStatus.ACTIVE,
        expiryDate: {
          gte: today,
          lte: alertThreshold,
        },
        membershipPlanId: { not: null },
      },
      include: {
        membershipPlan: true,
        user: true,
        invoices: {
          where: {
            status: InvoiceStatus.UNPAID,
            dueDate: { gte: today }
          }
        }
      }
    });

    let generatedCount = 0;
    for (const member of upcomingExpiries) {
      // If no outstanding invoice exists for this member
      if (member.invoices.length === 0 && member.membershipPlan) {
        const amount = member.membershipPlan.price;
        const gst = Number((amount * 0.18).toFixed(2));
        const totalAmount = Number((amount + gst).toFixed(2));
        const invoiceNumber = `AUTO-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

        await prisma.invoice.create({
          data: {
            invoiceNumber,
            amount,
            gst,
            totalAmount,
            status: InvoiceStatus.UNPAID,
            memberId: member.id,
            dueDate: member.expiryDate || new Date(),
          }
        });
        generatedCount++;
      }
    }

    return res.status(200).json({
      status: 'success',
      message: `Auto-billing simulation completed. Expired: ${expiredMembers.length}. New invoices generated: ${generatedCount}.`
    });
  } catch (error) {
    next(error);
  }
};

export const getReminderSettings = async (req: any, res: Response, next: NextFunction) => {
  try {
    const templates = await prisma.notificationTemplate.findMany({
      orderBy: { daysOffset: 'asc' }
    });
    return res.status(200).json({ status: 'success', data: { templates } });
  } catch (error) {
    next(error);
  }
};

export const updateReminderSettings = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id, isActive, messageBody, daysOffset } = req.body;
    
    if (!id) {
      return res.status(400).json({ status: 'fail', message: 'Template ID is required' });
    }

    const updated = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        messageBody: messageBody !== undefined ? String(messageBody) : undefined,
        daysOffset: daysOffset !== undefined ? Number(daysOffset) : undefined
      }
    });

    return res.status(200).json({ status: 'success', data: { template: updated } });
  } catch (error) {
    next(error);
  }
};

export const getReminderLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.paymentReminder.findMany({
      include: {
        member: {
          select: {
            user: {
              select: { firstName: true, lastName: true }
            }
          }
        },
        invoice: {
          select: { invoiceNumber: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return res.status(200).json({ status: 'success', data: { logs } });
  } catch (error) {
    next(error);
  }
};

export const sendManualReminder = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { invoiceId, memberId, templateType } = req.body;
    
    if (!invoiceId && !memberId) {
      return res.status(400).json({ status: 'fail', message: 'Invoice ID or Member ID is required' });
    }

    let invoice;
    if (invoiceId) {
      invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          member: {
            include: {
              user: {
                include: { branch: true }
              }
            }
          }
        }
      });
    } else if (memberId) {
      invoice = await prisma.invoice.findFirst({
        where: { 
          memberId: memberId,
          status: { in: ['UNPAID', 'OVERDUE'] }
        },
        include: {
          member: {
            include: {
              user: {
                include: { branch: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!invoice) {
      return res.status(404).json({ status: 'fail', message: 'No matching unpaid/overdue invoice found for reminder dispatch.' });
    }

    const type = templateType || 'BEFORE_DUE_3';
    const template = await prisma.notificationTemplate.findUnique({
      where: { type }
    });

    if (!template) {
      return res.status(404).json({ status: 'fail', message: `Reminder template '${type}' not found.` });
    }

    const member = invoice.member;
    const payload = {
      name: `${member.user.firstName} ${member.user.lastName}`,
      amount: invoice.totalAmount,
      date: new Date(invoice.dueDate).toLocaleDateString('en-IN'),
      gym_name: member.user.branch?.name || 'Codebyt Gym',
      mobile: member.mobile || '9999999999'
    };

    const logEntry = await prisma.paymentReminder.create({
      data: {
        memberId: member.id,
        invoiceId: invoice.id,
        reminderType: template.type,
        scheduledDate: new Date(),
        status: 'PENDING'
      }
    });

    const { sendNotification } = require('../services/notification.service');
    const result = await sendNotification(payload, template.messageBody);

    await prisma.paymentReminder.update({
      where: { id: logEntry.id },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        channel: result.channel,
        errorMessage: result.error || null,
        sentAt: result.success ? new Date() : null
      }
    });

    if (!result.success) {
      return res.status(500).json({ status: 'fail', message: `Failed to dispatch reminder: ${result.error}` });
    }

    return res.status(200).json({ 
      status: 'success', 
      message: `Manual reminder successfully sent to ${payload.name} via ${result.channel}.` 
    });

  } catch (error) {
    next(error);
  }
};

