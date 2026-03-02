import { sms } from "../services/africasTalking.js";

export const sendSMS = async ({ to, message }) => {
  try {
    // Ensure 'to' is in array format for Africa's Talking
    const recipients = Array.isArray(to) ? to : [to];
    
    // Validate phone numbers
    const validRecipients = recipients.filter(phone => {
      if (!phone || typeof phone !== 'string') return false;
      return phone.replace(/[^0-9+]/g, '').length >= 9;
    });
    
    if (validRecipients.length === 0) {
      throw new Error(`Invalid phone number(s): ${recipients.join(', ')}. Must be in international format (e.g., +256700123456)`);
    }
    
    console.log("Sending SMS to recipients:", validRecipients);
    
    const response = await sms.send({
      to: validRecipients,
      message,
    });

    console.log("SMS API Response:", JSON.stringify(response, null, 2));
    
    // Check if messages were actually sent
    if (response.SMSMessageData && response.SMSMessageData.Recipients) {
      const successCount = response.SMSMessageData.Recipients.filter(r => r.statusCode === 0).length;
      console.log(`Successfully sent to ${successCount}/${response.SMSMessageData.Recipients.length} recipients`);
      
      if (successCount === 0) {
        console.warn("Warning: SMS API returned 0 successful sends. Check recipient details:", response.SMSMessageData.Recipients);
      }
    }
    
    return response;
  } catch (error) {
    console.error("SMS error:", error.message || error);
    throw error;
  }
};
