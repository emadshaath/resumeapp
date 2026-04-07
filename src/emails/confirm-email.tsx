import { Heading, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, baseStyles } from "./layout";

interface ConfirmEmailProps {
  firstName: string;
  confirmUrl: string;
}

export function ConfirmEmail({ firstName, confirmUrl }: ConfirmEmailProps) {
  return (
    <EmailLayout preview="Confirm your email address">
      <Heading style={baseStyles.heading}>
        Confirm your email
      </Heading>
      <Text style={baseStyles.text}>
        Hi {firstName}, please confirm your email address by clicking the button
        below to complete your registration.
      </Text>
      <Section style={{ marginBottom: "24px", marginTop: "24px", textAlign: "center" as const }}>
        <Link href={confirmUrl} style={baseStyles.button}>
          Confirm Email Address
        </Link>
      </Section>
      <Text style={baseStyles.text}>
        Or copy and paste this URL into your browser:
      </Text>
      <Text style={{ ...baseStyles.text, ...baseStyles.urlText }}>
        {confirmUrl}
      </Text>
      <Text style={{ ...baseStyles.text, ...baseStyles.muted }}>
        This link expires in 24 hours. If you didn&apos;t create an account on
        rezm.ai, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}

export default ConfirmEmail;
