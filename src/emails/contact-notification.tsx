import { Heading, Hr, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, baseStyles } from "./layout";

interface ContactNotificationEmailProps {
  profileFirstName: string;
  senderName: string;
  senderEmail: string;
  subject?: string;
  message: string;
  dashboardUrl: string;
}

export function ContactNotificationEmail({
  profileFirstName,
  senderName,
  senderEmail,
  subject,
  message,
  dashboardUrl,
}: ContactNotificationEmailProps) {
  return (
    <EmailLayout preview={`New message from ${senderName}`}>
      <Heading style={baseStyles.heading}>
        New message received
      </Heading>
      <Text style={baseStyles.text}>
        Hi {profileFirstName}, someone sent you a message through your profile.
      </Text>

      <Section
        style={{
          backgroundColor: "#f4f4f5",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <Text style={{ ...baseStyles.text, margin: "0 0 8px", fontWeight: "600" as const, color: "#18181b" }}>
          From: {senderName} ({senderEmail})
        </Text>
        {subject && (
          <Text style={{ ...baseStyles.text, margin: "0 0 8px", fontWeight: "500" as const }}>
            Subject: {subject}
          </Text>
        )}
        <Hr style={{ ...baseStyles.hr, margin: "12px 0" }} />
        <Text style={{ ...baseStyles.text, margin: "0", whiteSpace: "pre-wrap" as const }}>
          {message}
        </Text>
      </Section>

      <Section style={{ marginBottom: "24px" }}>
        <Link href={dashboardUrl} style={baseStyles.button}>
          View in Dashboard
        </Link>
      </Section>

      <Text style={{ ...baseStyles.text, fontSize: "13px", color: "#a1a1aa" }}>
        You can reply directly to {senderName} at{" "}
        <Link href={`mailto:${senderEmail}`} style={{ ...baseStyles.link, fontSize: "13px", color: "#71717a" }}>
          {senderEmail}
        </Link>
      </Text>
    </EmailLayout>
  );
}

export default ContactNotificationEmail;
