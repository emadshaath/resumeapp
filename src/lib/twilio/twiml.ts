import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * Generate TwiML for call screening:
 * Announce the caller, ask the owner to press 1 to accept or 2 to send to voicemail.
 */
export function generateScreeningTwiml(callerNumber: string, callSid: string): string {
  const twiml = new VoiceResponse();

  twiml.say(
    { voice: "Polly.Joanna" },
    `You have an incoming call from ${formatPhoneForSpeech(callerNumber)}. Press 1 to accept, or press 2 to send to voicemail.`
  );

  const gather = twiml.gather({
    numDigits: 1,
    action: `${getBaseUrl()}/api/webhooks/twilio/screen-result?callSid=${callSid}`,
    method: "POST",
    timeout: 10,
  });
  gather.say({ voice: "Polly.Joanna" }, "Press 1 to accept, or 2 for voicemail.");

  // If no input, go to voicemail
  twiml.redirect(`${getBaseUrl()}/api/webhooks/twilio/voicemail?callSid=${callSid}`);

  return twiml.toString();
}

/**
 * Generate TwiML for voicemail recording.
 */
export function generateVoicemailTwiml(callSid: string, customGreetingUrl?: string | null): string {
  const twiml = new VoiceResponse();

  if (customGreetingUrl) {
    twiml.play(customGreetingUrl);
  } else {
    twiml.say(
      { voice: "Polly.Joanna" },
      "The person you are trying to reach is not available. Please leave a message after the beep. Press pound when you are finished."
    );
  }

  twiml.record({
    action: `${getBaseUrl()}/api/webhooks/twilio/recording-complete?callSid=${callSid}`,
    method: "POST",
    maxLength: 120,
    finishOnKey: "#",
    transcribe: true,
    transcribeCallback: `${getBaseUrl()}/api/webhooks/twilio/transcription?callSid=${callSid}`,
    playBeep: true,
  });

  // If they don't record, hang up
  twiml.say({ voice: "Polly.Joanna" }, "No message was recorded. Goodbye." );
  twiml.hangup();

  return twiml.toString();
}

/**
 * Generate TwiML to connect (dial) the call to the owner's personal number.
 * Falls back to voicemail on no answer.
 */
export function generateForwardTwiml(
  forwardTo: string,
  callSid: string,
  screenCall: boolean = true
): string {
  const twiml = new VoiceResponse();

  const dial = twiml.dial({
    action: `${getBaseUrl()}/api/webhooks/twilio/dial-result?callSid=${callSid}`,
    method: "POST",
    timeout: 25,
    callerId: process.env.TWILIO_CALLER_ID || undefined,
  });

  if (screenCall) {
    dial.number(
      {
        url: `${getBaseUrl()}/api/webhooks/twilio/screen?callSid=${callSid}`,
        method: "POST",
      },
      forwardTo
    );
  } else {
    dial.number(forwardTo);
  }

  return twiml.toString();
}

/**
 * Generate simple TwiML to reject a call.
 */
export function generateRejectTwiml(reason: "rejected" | "busy" = "busy"): string {
  const twiml = new VoiceResponse();
  twiml.reject({ reason });
  return twiml.toString();
}

function formatPhoneForSpeech(phone: string): string {
  // Strip + prefix and format digits with pauses for readability
  const digits = phone.replace(/\D/g, "");
  return digits.split("").join(" ");
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";
}
