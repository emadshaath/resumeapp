import { Heading, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, baseStyles } from "./layout";

interface SubscriptionCanceledEmailProps {
  firstName: string;
  previousPlan: string;
  reactivateUrl: string;
}

export function SubscriptionCanceledEmail({
  firstName,
  previousPlan,
  reactivateUrl,
}: SubscriptionCanceledEmailProps) {
  return (
    <EmailLayout preview="Your rezm.ai subscription has ended">
      <Heading style={baseStyles.heading}>Your subscription has ended</Heading>
      <Text style={baseStyles.text}>
        Hi {firstName}, your {previousPlan} plan has been canceled and your
        account is back on the Free plan. Your profile, resume sections, and
        data are all preserved — only premium features are paused.
      </Text>

      <Text style={baseStyles.text}>
        Here&apos;s what changes on Free:
      </Text>
      <Text style={{ ...baseStyles.text, paddingLeft: "16px" }}>
        • AI reviews limited to 1 per month
        <br />
        • Resume sections capped at 3
        <br />
        • Platform email and phone are paused
        <br />• Custom domain support is paused
      </Text>

      <Section style={{ marginBottom: "24px", marginTop: "24px" }}>
        <Link href={reactivateUrl} style={baseStyles.button}>
          Reactivate subscription
        </Link>
      </Section>

      <Text style={baseStyles.muted}>
        We&apos;d love to hear what could&apos;ve gone better. Just reply to
        this email — every message goes to a human.
      </Text>
    </EmailLayout>
  );
}

export default SubscriptionCanceledEmail;
