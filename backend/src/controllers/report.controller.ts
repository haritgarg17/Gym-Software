import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Role, MembershipStatus, InvoiceStatus } from '../types/enums';

export const getDashboardStats = async (req: any, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user.branchId;

    // 1. Core Card Metrics
    const totalMembers = await prisma.user.count({
      where: { role: Role.MEMBER, branchId }
    });

    const activeMembers = await prisma.memberProfile.count({
      where: {
        user: { branchId },
        status: MembershipStatus.ACTIVE
      }
    });

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await prisma.attendance.count({
      where: {
        branchId,
        timestamp: { gte: today }
      }
    });

    // Revenue Today
    const todayPayments = await prisma.payment.findMany({
      where: {
        member: { user: { branchId } },
        createdAt: { gte: today },
        status: 'PAID'
      },
      select: { amount: true }
    });
    const revenueToday = todayPayments.reduce((acc, p) => acc + p.amount, 0);

    // Monthly Revenue
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyPayments = await prisma.payment.findMany({
      where: {
        member: { user: { branchId } },
        createdAt: { gte: firstDayOfMonth },
        status: 'PAID'
      },
      select: { amount: true }
    });
    const monthlyRevenue = monthlyPayments.reduce((acc, p) => acc + p.amount, 0);

    // Pending payments count
    const pendingPaymentsCount = await prisma.invoice.count({
      where: {
        member: { user: { branchId } },
        status: InvoiceStatus.UNPAID
      }
    });

    // Expiring Memberships in next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const expiringMemberships = await prisma.memberProfile.count({
      where: {
        user: { branchId },
        status: MembershipStatus.ACTIVE,
        expiryDate: { gte: today, lte: nextWeek }
      }
    });

    // 2. Charts Data Generation
    // Monthly Revenue (Last 6 months)
    const monthlyRevenueChart = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(today.getMonth() - i);
      const startMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const pays = await prisma.payment.findMany({
        where: {
          member: { user: { branchId } },
          createdAt: { gte: startMonth, lte: endMonth },
          status: 'PAID'
        },
        select: { amount: true }
      });
      const rev = pays.reduce((sum, p) => sum + p.amount, 0);
      monthlyRevenueChart.push({
        month: d.toLocaleString('default', { month: 'short' }),
        revenue: rev
      });
    }

    // Attendance Trends (Last 7 days)
    const attendanceTrends = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const endDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const count = await prisma.attendance.count({
        where: {
          branchId,
          timestamp: { gte: startDay, lte: endDay }
        }
      });

      attendanceTrends.push({
        day: d.toLocaleString('default', { weekday: 'short' }),
        count
      });
    }

    // Class Popularity
    const classes = await prisma.class.findMany({
      where: { branchId },
      include: { _count: { select: { bookings: true } } },
      take: 5
    });
    const classPopularity = classes.map(c => ({
      name: c.name,
      bookings: c._count.bookings
    }));

    // Recent activities feed (from audit logs)
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        OR: [
          { actor: { branchId } },
          { actorId: null }
        ]
      },
      take: 8,
      orderBy: { timestamp: 'desc' }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        cards: {
          totalMembers,
          activeMembers,
          todayAttendance,
          revenueToday,
          monthlyRevenue,
          pendingPaymentsCount,
          expiringMemberships
        },
        charts: {
          monthlyRevenueChart,
          attendanceTrends,
          classPopularity
        },
        recentActivity
      }
    });
  } catch (error) {
    next(error);
  }
};

// Export customized high-quality GST Invoice PDF
export const exportInvoicePDF = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // Invoice ID

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        member: {
          include: { user: true }
        }
      }
    });

    if (!invoice) {
      return res.status(404).json({ status: 'fail', message: 'Invoice not found.' });
    }

    const doc = new jsPDF() as any;

    // Header Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text('CODEBYT GYM NETWORK', 14, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('Commercial Fitness Hub & Training Center', 14, 25);
    doc.text('GSTIN: 27AAAAA1111A1Z1', 14, 30);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text('TAX INVOICE', 140, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 140, 26);
    doc.text(`Date: ${invoice.createdAt.toLocaleDateString()}`, 140, 31);
    doc.text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, 140, 36);

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 42, 196, 42);

    // Bill To
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 14, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`${invoice.member.user.firstName} ${invoice.member.user.lastName}`, 14, 55);
    doc.text(`Phone: ${invoice.member.mobile}`, 14, 60);
    doc.text(`Email: ${invoice.member.user.email}`, 14, 65);

    // Table Content
    const tableData = [
      [
        'Gym Membership Services',
        `Rs. ${invoice.amount}`,
        `Rs. ${invoice.discount}`,
        '18%',
        `Rs. ${invoice.gst}`,
        `Rs. ${invoice.totalAmount}`
      ]
    ];

    doc.autoTable({
      startY: 75,
      head: [['Description', 'Base Amount', 'Discount', 'GST Rate', 'GST Amount', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    // Summary Details
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFont('helvetica', 'normal');
    doc.text(`Subtotal: Rs. ${invoice.amount}`, 140, finalY);
    doc.text(`Discount Applied: -Rs. ${invoice.discount}`, 140, finalY + 5);
    doc.text(`GST (18%): Rs. ${invoice.gst}`, 140, finalY + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Grand Total: Rs. ${invoice.totalAmount}`, 140, finalY + 17);

    // Payment Status Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    if (invoice.status === InvoiceStatus.PAID) {
      doc.setTextColor(22, 163, 74); // Green-600
      doc.text('PAID / RECEIPT ATTACHED', 14, finalY + 5);
    } else {
      doc.setTextColor(220, 38, 38); // Red-600
      doc.text('PAYMENT OUTSTANDING', 14, finalY + 5);
    }

    // Terms
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Terms & Conditions: Fees once paid are non-refundable. Auto-renewal policies apply.', 14, 275);

    const pdfBuffer = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.invoiceNumber}.pdf`);
    return res.end(Buffer.from(pdfBuffer));
  } catch (error) {
    next(error);
  }
};

// Export CSV of Payment Receipts
export const exportPaymentsCSV = async (req: any, res: Response, next: NextFunction) => {
  try {
    const branchId = req.user.branchId;
    const payments = await prisma.payment.findMany({
      where: { member: { user: { branchId } } },
      include: {
        member: { include: { user: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    let csvContent = 'Payment ID,Member Name,Email,Method,Txn ID,Base Amount,GST,Total,Status,Date\n';
    
    payments.forEach((p) => {
      const name = `"${p.member.user.firstName} ${p.member.user.lastName}"`;
      const date = p.createdAt.toISOString();
      csvContent += `${p.id},${name},${p.member.user.email},${p.method},${p.transactionId || 'N/A'},${p.amount - p.gst},${p.gst},${p.amount},${p.status},${date}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=payments-report.csv');
    return res.send(csvContent);
  } catch (error) {
    next(error);
  }
};
