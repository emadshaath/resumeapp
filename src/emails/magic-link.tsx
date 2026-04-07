import { Heading, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, baseStyles } from "./layout";

interface MagicLinkEmailProps {
  email: string;
  magicLinkUrl: string;
}

export function MagicLinkEmail({ email, magicLinkUrl }: MagicLinkEmailProps) {
  return (
    <EmailLayout preview="Your sign-in link">
      <Heading style={baseStyles.heading}>
        Sign in to rezm.ai
      </Heading>
      <Text style={baseStyles.text}>
        Click the button below to sign in to your account ({email}).
      </Text>
      <Section style={{ marginBottom: "24px", marginTop: "24px", textAlign: "center" as const }}>
        <Link href={magicLinkUrl} style={baseStyles.button}>
          Sign In
        </Link>
      </Section>
      <Text style={baseStyles.text}>
        Or copy and paste this URL into your browser:
      </Text>
      <Text style={{ ...baseStyles.text, ...baseStyles.urlText }}>
        {magicLinkUrl}
      </Text>
      <Text style={{ ...baseStyles.text, ...baseStyles.muted }}>
        This link expires in 10 minutes and can only be used once. If you
        didn&apos;t request this link, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}

export default MagicLinkEmail;
