import prisma from '../config/db';

export interface ReminderPayload {
  name: string;
  amount: number;
  date: string;
  gym_name: string;
  mobile: string;
}

export const formatTemplate = (templateBody: string, variables: ReminderPayload): string => {
  return templateBody
    .replace(/{name}/g, variables.name)
    .replace(/{amount}/g, `₹${variables.amount}`)
    .replace(/{date}/g, variables.date)
    .replace(/{gym_name}/g, variables.gym_name);
};

export const sendNotification = async (
  payload: ReminderPayload,
  messageBody: string
): Promise<{ success: boolean; channel: 'WHATSAPP' | 'SMS'; error?: string }> => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER || '+15017122661';

  const formattedMsg = formatTemplate(messageBody, payload);

  // If using mock credentials, print a log block and succeed
  if (!accountSid || accountSid.includes('mock') || !authToken || authToken.includes('mock')) {
    console.log(`\n======================================================`);
    console.log(`[MOCK NOTIFICATION DISPATCH]`);
    console.log(`To Mobile: ${payload.mobile}`);
    console.log(`Primary Channel: WHATSAPP (Resolved: Success)`);
    console.log(`Message Body:\n"${formattedMsg}"`);
    console.log(`======================================================\n`);
    return { success: true, channel: 'WHATSAPP' };
  }

  // Real Twilio implementation:
  try {
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);

    // Twilio WhatsApp prefix format
    const whatsappFrom = `whatsapp:${fromPhone}`;
    const whatsappTo = `whatsapp:${payload.mobile.startsWith('+') ? payload.mobile : '+91' + payload.mobile}`;

    const waResponse = await client.messages.create({
      from: whatsappFrom,
      to: whatsappTo,
      body: formattedMsg,
    });

    console.log(`[Twilio WhatsApp Dispatch Success] Message SID: ${waResponse.sid}`);
    return { success: true, channel: 'WHATSAPP' };
  } catch (waError: any) {
    console.warn(`[Twilio WhatsApp Failed] falling back to SMS:`, waError.message || waError);

    // Fallback to SMS
    try {
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);
      const smsTo = payload.mobile.startsWith('+') ? payload.mobile : `+91${payload.mobile}`;

      const smsResponse = await client.messages.create({
        from: fromPhone,
        to: smsTo,
        body: formattedMsg,
      });

      console.log(`[Twilio SMS Fallback Dispatch Success] Message SID: ${smsResponse.sid}`);
      return { success: true, channel: 'SMS' };
    } catch (smsError: any) {
      console.error(`[Twilio SMS Fallback Failed]:`, smsError.message || smsError);
      return { 
        success: false, 
        channel: 'SMS', 
        error: `WhatsApp failed (${waError.message || waError}). SMS failed (${smsError.message || smsError}).` 
      };
    }
  }
};
