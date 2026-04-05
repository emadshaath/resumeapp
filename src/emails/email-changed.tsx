import { Heading, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, baseStyles } from "./layout";

interface EmailChangedProps {
  firstName: string;
  newEmail: string;
  confirmUrl: string;
}

export function EmailChangedEmail({ firstName, newEmail, confirmUrl }: EmailChangedProps) {
  return (
    <EmailLayout preview="Confirm your new email address">
      <Heading style={baseStyles.heading}>
        Confirm your new email
      </Heading>
      <Text style={baseStyles.text}>
        Hi {firstName}, you requested to change your email address to{" "}
        <strong>{newEmail}</strong>. Please confirm by clicking below.
      </Text>
      <Section style={{ marginBottom: "24px", marginTop: "24px", textAlign: "center" as const }}>
        <Link href={confirmUrl} style={baseStyles.button}>
          Confirm New Email
        </Link>
      </Section>
      <Text style={{ ...baseStyles.text, color: "#a1a1aa", fontSize: "13px" }}>
        If you didn&apos;t request this change, please secure your account immediately
        by resetting your password.
      </Text>
    </EmailLayout>
  );
}

export default EmailChangedEmail;
