export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  GYM_ADMIN = 'GYM_ADMIN',
  TRAINER = 'TRAINER',
  RECEPTIONIST = 'RECEPTIONIST',
  MEMBER = 'MEMBER',
}

export enum CheckInMethod {
  QR = 'QR',
  RFID = 'RFID',
  MANUAL = 'MANUAL',
  FACE = 'FACE',
}

export enum ClassCategory {
  YOGA = 'YOGA',
  ZUMBA = 'ZUMBA',
  HIIT = 'HIIT',
  STRENGTH = 'STRENGTH',
  CARDIO = 'CARDIO',
  CROSSFIT = 'CROSSFIT',
  PILATES = 'PILATES',
  FUNCTIONAL = 'FUNCTIONAL',
  PERSONAL_TRAINING = 'PERSONAL_TRAINING',
}

export enum PaymentStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum InvoiceStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  FROZEN = 'FROZEN',
  EXPIRED = 'EXPIRED',
}

export enum BookingStatus {
  BOOKED = 'BOOKED',
  CANCELLED = 'CANCELLED',
  ATTENDED = 'ATTENDED',
}
