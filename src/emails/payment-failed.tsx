import { Heading, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, baseStyles } from "./layout";

interface PaymentFailedEmailProps {
  firstName: string;
  planName: string;
  amountFormatted: string;
  attemptCount: number;
  nextRetryAt: string | null;
  portalUrl: string;
}

export function PaymentFailedEmail({
  firstName,
  planName,
  amountFormatted,
  attemptCount,
  nextRetryAt,
  portalUrl,
}: PaymentFailedEmailProps) {
  const isFirstAttempt = attemptCount <= 1;
  const subject = isFirstAttempt
    ? "We couldn't process your payment"
    : "Action needed: payment is still failing";

  return (
    <EmailLayout preview={subject}>
      <Heading style={baseStyles.heading}>{subject}</Heading>
      <Text style={baseStyles.text}>
        Hi {firstName},{" "}
        {isFirstAttempt ? (
          <>
            we tried to charge {amountFormatted} for your rezm.ai {planName}{" "}
            plan but the payment didn&apos;t go through. This usually means the
            card was declined or expired.
          </>
        ) : (
          <>
            this is the {ordinal(attemptCount)} time we&apos;ve tried to charge{" "}
            {amountFormatted} for your rezm.ai {planName} plan. To keep your
            subscription active, please update your payment method.
          </>
        )}
      </Text>

      {nextRetryAt && (
        <Text style={baseStyles.text}>
          Stripe will automatically retry on{" "}
          <strong>{nextRetryAt}</strong>. If the new attempt fails too, your
          plan will be moved back to Free.
        </Text>
      )}

      <Section style={{ marginBottom: "24px", marginTop: "24px" }}>
        <Link href={portalUrl} style={baseStyles.button}>
          Update payment method
        </Link>
      </Section>

      <Text style={baseStyles.muted}>
        If you&apos;ve already fixed this, you can ignore this email — Stripe
        will reconcile on the next retry.
      </Text>
    </EmailLayout>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default PaymentFailedEmail;
