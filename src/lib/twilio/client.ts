import twilio from "twilio";

let client: twilio.Twilio | null = null;

export function getTwilioClient(): twilio.Twilio {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
    }

    client = twilio(accountSid, authToken);
  }
  return client;
}

export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}
