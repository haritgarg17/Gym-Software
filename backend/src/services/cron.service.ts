import cron from 'node-cron';
import prisma from '../config/db';
import { sendNotification } from './notification.service';

export const checkAndSendReminders = async () => {
  console.log(`[Reminder Job] Executing payment reminder scan at: ${new Date().toISOString()}`);

  try {
    const activeTemplates = await prisma.notificationTemplate.findMany({
      where: { isActive: true }
    });

    if (activeTemplates.length === 0) {
      console.log(`[Reminder Job] No active reminder templates found.`);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const template of activeTemplates) {
      const daysOffset = template.daysOffset;
      
      const targetStart = new Date(today);
      targetStart.setDate(today.getDate() - daysOffset);
      const targetEnd = new Date(targetStart);
      targetEnd.setHours(23, 59, 59, 999);

      console.log(`[Reminder Job] Scanning template ${template.type} (Offset: ${daysOffset} days) for due dates between ${targetStart.toISOString()} and ${targetEnd.toISOString()}`);

      const invoices = await prisma.invoice.findMany({
        where: {
          status: { in: ['UNPAID', 'OVERDUE'] },
          dueDate: {
            gte: targetStart,
            lte: targetEnd
          }
        },
        include: {
          member: {
            include: {
              user: {
                include: {
                  branch: true
                }
              }
            }
          }
        }
      });

      console.log(`[Reminder Job] Found ${invoices.length} matching unpaid invoices for template ${template.type}`);

      for (const invoice of invoices) {
        const member = invoice.member;
        if (!member || !member.user) continue;

        // Prevent duplicate sends for the same due date & invoice & template type
        const existing = await prisma.paymentReminder.findFirst({
          where: {
            invoiceId: invoice.id,
            reminderType: template.type,
            status: 'SENT'
          }
        });

        if (existing) {
          console.log(`[Reminder Job] Skip: Reminder ${template.type} already successfully sent to member ${member.user.firstName} for invoice ${invoice.invoiceNumber}`);
          continue;
        }

        // Add pending placeholder
        const logEntry = await prisma.paymentReminder.create({
          data: {
            memberId: member.id,
            invoiceId: invoice.id,
            reminderType: template.type,
            scheduledDate: new Date(),
            status: 'PENDING'
          }
        });

        const payload = {
          name: `${member.user.firstName} ${member.user.lastName}`,
          amount: invoice.totalAmount,
          date: new Date(invoice.dueDate).toLocaleDateString('en-IN'),
          gym_name: member.user.branch?.name || 'Codebyt Gym',
          mobile: member.mobile || '9999999999'
        };

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

        // Also update invoice status to OVERDUE if target date is past due and current status is UNPAID
        if (daysOffset > 0 && invoice.status === 'UNPAID') {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'OVERDUE' }
          });
        }
      }
    }
    console.log(`[Reminder Job] Scanning completed successfully.`);
  } catch (error) {
    console.error(`[Reminder Job Error]:`, error);
  }
};

export const bootstrapTemplates = async () => {
  const defaults = [
    {
      type: 'BEFORE_DUE_3',
      label: '3 Days Before Due',
      daysOffset: -3,
      messageBody: 'Hi {name}, your gym membership payment of {amount} is due on {date}. Pay now to avoid interruption 💪'
    },
    {
      type: 'ON_DUE',
      label: 'On Due Date',
      daysOffset: 0,
      messageBody: 'Hi {name}, your payment of {amount} is due today. Please complete it to keep your membership active.'
    },
    {
      type: 'OVERDUE_1',
      label: '1 Day Overdue',
      daysOffset: 1,
      messageBody: 'Hi {name}, your payment of {amount} was due yesterday. Please clear it at the earliest.'
    },
    {
      type: 'OVERDUE_3',
      label: '3 Days Overdue',
      daysOffset: 3,
      messageBody: 'Hi {name}, your payment of {amount} is 3 days overdue. Please clear it to avoid access blocks.'
    },
    {
      type: 'OVERDUE_7',
      label: '7 Days Overdue',
      daysOffset: 7,
      messageBody: 'Hi {name}, your membership is now 7 days overdue. Please pay {amount} to avoid suspension.'
    }
  ];

  try {
    for (const item of defaults) {
      await prisma.notificationTemplate.upsert({
        where: { type: item.type },
        update: {},
        create: item
      });
    }
    console.log('[Reminder Job] Default notification templates upserted successfully.');
  } catch (err) {
    console.error('[Reminder Job Error] Failed to bootstrap notification templates:', err);
  }
};

// Scheduler running daily at 9:00 AM
export const initReminderCron = async () => {
  await bootstrapTemplates();
  cron.schedule('0 9 * * *', async () => {
    await checkAndSendReminders();
  });
  console.log('[Reminder Job] Scheduler initialized successfully (runs daily at 9:00 AM).');
};

