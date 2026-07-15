import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  GYM_ADMIN: 'GYM_ADMIN',
  TRAINER: 'TRAINER',
  RECEPTIONIST: 'RECEPTIONIST',
  MEMBER: 'MEMBER',
};

const MembershipStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
  FROZEN: 'FROZEN',
  EXPIRED: 'EXPIRED',
};

const ClassCategory = {
  YOGA: 'YOGA',
  ZUMBA: 'ZUMBA',
  HIIT: 'HIIT',
  STRENGTH: 'STRENGTH',
  CARDIO: 'CARDIO',
  CROSSFIT: 'CROSSFIT',
  PILATES: 'PILATES',
  FUNCTIONAL: 'FUNCTIONAL',
  PERSONAL_TRAINING: 'PERSONAL_TRAINING',
};

const CheckInMethod = {
  QR: 'QR',
  RFID: 'RFID',
  MANUAL: 'MANUAL',
  FACE: 'FACE',
};

const BookingStatus = {
  BOOKED: 'BOOKED',
  CANCELLED: 'CANCELLED',
  ATTENDED: 'ATTENDED',
};

const InvoiceStatus = {
  PAID: 'PAID',
  UNPAID: 'UNPAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
};

const PaymentStatus = {
  PAID: 'PAID',
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
};

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Clean existing records
  await prisma.auditLog.deleteMany({});
  await prisma.meal.deleteMany({});
  await prisma.dietPlan.deleteMany({});
  await prisma.exercise.deleteMany({});
  await prisma.workoutDay.deleteMany({});
  await prisma.workoutPlan.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.classBooking.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.memberProfile.deleteMany({});
  await prisma.trainerProfile.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.membershipPlan.deleteMany({});
  await prisma.branch.deleteMany({});

  console.log('Cleared existing records.');

  // 2. Create Branches
  const branch1 = await prisma.branch.create({
    data: {
      name: 'Codebyt Elite - Downtown',
      address: '101 Fitness Boulevard, Suite A, New York, NY',
      phone: '+1 555-0199',
      email: 'downtown@codebyt.com',
      status: 'ACTIVE',
    }
  });

  const branch2 = await prisma.branch.create({
    data: {
      name: 'Codebyt Platinum - Westside',
      address: '202 Athletic Road, Westside, NY',
      phone: '+1 555-0299',
      email: 'westside@codebyt.com',
      status: 'ACTIVE',
    }
  });

  console.log('Created branches.');

  // Common password hash for test accounts
  const passwordHash = await bcrypt.hash('admin123', 12);

  // 3. Create Users
  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      email: 'super@codebyt.com',
      passwordHash,
      firstName: 'John',
      lastName: 'SaaS',
      role: Role.SUPER_ADMIN,
      branchId: branch1.id,
    }
  });

  // Gym Admin
  const gymAdmin = await prisma.user.create({
    data: {
      email: 'admin@codebyt.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Manager',
      role: Role.GYM_ADMIN,
      branchId: branch1.id,
    }
  });

  // Receptionist
  const receptionist = await prisma.user.create({
    data: {
      email: 'reception@codebyt.com',
      passwordHash,
      firstName: 'Emily',
      lastName: 'Desk',
      role: Role.RECEPTIONIST,
      branchId: branch1.id,
    }
  });

  // Trainers
  const trainerUser1 = await prisma.user.create({
    data: {
      email: 'trainer1@codebyt.com',
      passwordHash,
      firstName: 'Marcus',
      lastName: 'Iron',
      role: Role.TRAINER,
      branchId: branch1.id,
    }
  });

  const trainerUser2 = await prisma.user.create({
    data: {
      email: 'trainer2@codebyt.com',
      passwordHash,
      firstName: 'Elena',
      lastName: 'Flex',
      role: Role.TRAINER,
      branchId: branch1.id,
    }
  });

  // Members
  const memberUser1 = await prisma.user.create({
    data: {
      email: 'member1@codebyt.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Active',
      role: Role.MEMBER,
      branchId: branch1.id,
    }
  });

  const memberUser2 = await prisma.user.create({
    data: {
      email: 'member2@codebyt.com',
      passwordHash,
      firstName: 'Sophia',
      lastName: 'Runner',
      role: Role.MEMBER,
      branchId: branch1.id,
    }
  });

  console.log('Created accounts.');

  // 4. Create Profiles
  // Trainer Profiles
  const trainer1 = await prisma.trainerProfile.create({
    data: {
      userId: trainerUser1.id,
      qualifications: 'B.Sc. Exercise Science, NSCA-CPT',
      certifications: 'NASM Corrective Exercise Specialist, CPR/AED',
      specialization: 'Strength Training & Hypertrophy',
      salary: 4500,
      availability: '06:00-14:00',
    }
  });

  const trainer2 = await prisma.trainerProfile.create({
    data: {
      userId: trainerUser2.id,
      qualifications: 'Certified Yoga Instructor 500-RYT, Pilates Masters',
      certifications: 'FMS Level 1, Precision Nutrition Coach',
      specialization: 'Yoga, Pilates, Functional Rehabilitation',
      salary: 4200,
      availability: '12:00-20:00',
    }
  });

  console.log('Created trainer profiles.');

  // 5. Create Membership Plans
  const planMonthly = await prisma.membershipPlan.create({
    data: {
      name: 'Monthly Basic Plan',
      durationMonths: 1,
      price: 1499,
      branchId: branch1.id,
    }
  });

  const planQuarterly = await prisma.membershipPlan.create({
    data: {
      name: 'Quarterly Executive Plan',
      durationMonths: 3,
      price: 3999,
      branchId: branch1.id,
    }
  });

  const planAnnual = await prisma.membershipPlan.create({
    data: {
      name: 'Annual Elite VIP Plan',
      durationMonths: 12,
      price: 12999,
      branchId: branch1.id,
    }
  });

  console.log('Created plans.');

  // 6. Create Member Profiles
  const dob1 = new Date();
  dob1.setFullYear(dob1.getFullYear() - 25);
  const expiry1 = new Date();
  expiry1.setMonth(expiry1.getMonth() + 3); // quarterly plan

  const memberProfile1 = await prisma.memberProfile.create({
    data: {
      userId: memberUser1.id,
      gender: 'Male',
      dob: dob1,
      mobile: '+91 98765 43210',
      address: '456 Broadway, New York, NY',
      emergencyContact: 'Jane Active (+91 98765 43211)',
      bloodGroup: 'O+',
      height: 180,
      weight: 78,
      bmi: 24.07,
      fitnessGoals: 'Increase muscle mass and core stability.',
      status: MembershipStatus.ACTIVE,
      joiningDate: new Date(),
      expiryDate: expiry1,
      assignedTrainerId: trainer1.id,
      membershipPlanId: planQuarterly.id,
    }
  });

  const dob2 = new Date();
  dob2.setFullYear(dob2.getFullYear() - 28);
  const expiry2 = new Date();
  expiry2.setDate(expiry2.getDate() - 1); // expired yesterday

  const memberProfile2 = await prisma.memberProfile.create({
    data: {
      userId: memberUser2.id,
      gender: 'Female',
      dob: dob2,
      mobile: '+91 99887 76655',
      address: '789 Park Avenue, New York, NY',
      emergencyContact: 'David Runner (+91 99887 76656)',
      bloodGroup: 'A-',
      height: 165,
      weight: 60,
      bmi: 22.04,
      fitnessGoals: 'Improve cardiorespiratory endurance.',
      status: MembershipStatus.EXPIRED,
      joiningDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      expiryDate: expiry2,
      assignedTrainerId: trainer2.id,
      membershipPlanId: planMonthly.id,
    }
  });

  console.log('Created member profiles.');

  // Seeding Member Progress
  await prisma.memberProgress.create({
    data: {
      memberId: memberProfile1.id,
      weight: 80,
      bmi: 24.69,
      bodyFat: 15,
      recordedAt: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    }
  });

  await prisma.memberProgress.create({
    data: {
      memberId: memberProfile1.id,
      weight: 78,
      bmi: 24.07,
      bodyFat: 13.5,
      recordedAt: new Date(),
    }
  });

  // 7. Create Classes
  const classTime1 = new Date();
  classTime1.setDate(classTime1.getDate() + 1);
  classTime1.setHours(9, 0, 0, 0); // Tomorrow 9:00 AM
  const classEndTime1 = new Date(classTime1);
  classEndTime1.setHours(10, 0, 0, 0);

  const classTime2 = new Date();
  classTime2.setDate(classTime2.getDate() + 1);
  classTime2.setHours(18, 0, 0, 0); // Tomorrow 6:00 PM
  const classEndTime2 = new Date(classTime2);
  classEndTime2.setHours(19, 0, 0, 0);

  const class1 = await prisma.class.create({
    data: {
      name: 'HIIT Cardio Blast',
      category: ClassCategory.HIIT,
      startTime: classTime1,
      endTime: classEndTime1,
      capacity: 15,
      trainerId: trainer1.id,
      branchId: branch1.id,
    }
  });

  const class2 = await prisma.class.create({
    data: {
      name: 'Sunset Power Yoga',
      category: ClassCategory.YOGA,
      startTime: classTime2,
      endTime: classEndTime2,
      capacity: 20,
      trainerId: trainer2.id,
      branchId: branch1.id,
    }
  });

  console.log('Created schedules.');

  // 8. Bookings
  await prisma.classBooking.create({
    data: {
      classId: class1.id,
      memberId: memberProfile1.id,
      status: BookingStatus.BOOKED,
    }
  });

  // 9. Attendance
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 3);
  await prisma.attendance.create({
    data: {
      userId: memberUser1.id,
      branchId: branch1.id,
      timestamp: lastWeek,
      checkInMethod: CheckInMethod.QR,
    }
  });

  await prisma.attendance.create({
    data: {
      userId: memberUser1.id,
      branchId: branch1.id,
      timestamp: new Date(),
      checkInMethod: CheckInMethod.MANUAL,
    }
  });

  console.log('Created attendance.');

  // 10. Financials (Invoices and Payments)
  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0001',
      amount: 3999,
      gst: 719.82,
      discount: 0,
      totalAmount: 4718.82,
      status: InvoiceStatus.PAID,
      memberId: memberProfile1.id,
      dueDate: new Date(),
    }
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0002',
      amount: 1499,
      gst: 269.82,
      discount: 0,
      totalAmount: 1768.82,
      status: InvoiceStatus.UNPAID,
      memberId: memberProfile2.id,
      dueDate: new Date(),
    }
  });

  // Payments
  await prisma.payment.create({
    data: {
      amount: 4718.82,
      gst: 719.82,
      discount: 0,
      method: 'CARD',
      transactionId: 'PAY-1122334455',
      status: PaymentStatus.PAID,
      invoiceId: invoice1.id,
      memberId: memberProfile1.id,
      createdAt: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    }
  });

  console.log('Created financials.');

  // 11. Inventory
  await prisma.inventory.create({
    data: {
      name: 'LifeFitness T5 Treadmills',
      category: 'EQUIPMENT',
      quantity: 5,
      status: 'FUNCTIONAL',
      branchId: branch1.id,
    }
  });

  await prisma.inventory.create({
    data: {
      name: 'Premium Whey Protein (Vanilla)',
      category: 'SUPPLEMENTS',
      quantity: 24,
      status: 'FUNCTIONAL',
      branchId: branch1.id,
    }
  });

  console.log('Created inventory.');

  // 12. Workout & Diet Plans
  const workoutPlan = await prisma.workoutPlan.create({
    data: {
      name: '3-Day Hypertrophy Program',
      memberId: memberProfile1.id,
      trainerId: trainer1.id,
    }
  });

  const workoutDay = await prisma.workoutDay.create({
    data: {
      planId: workoutPlan.id,
      dayOfWeek: 'MONDAY',
    }
  });

  await prisma.exercise.create({
    data: {
      workoutDayId: workoutDay.id,
      name: 'Barbell Bench Press',
      category: 'Chest',
      sets: 4,
      reps: '8-10',
      restTimeSeconds: 90,
      notes: 'Focus on progressive overload. Keep shoulder blades retracted.',
    }
  });

  const dietPlan = await prisma.dietPlan.create({
    data: {
      name: 'Lean Bulk Diet (2800 kcal)',
      memberId: memberProfile1.id,
      trainerId: trainer1.id,
    }
  });

  await prisma.meal.create({
    data: {
      dietPlanId: dietPlan.id,
      mealType: 'BREAKFAST',
      time: '08:00 AM',
      items: '4 Whole Eggs, 75g Oatmeal with milk, 1 Banana',
      calories: 750,
      protein: 42,
      carbs: 85,
      fat: 25,
      waterIntakeMl: 500,
    }
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
