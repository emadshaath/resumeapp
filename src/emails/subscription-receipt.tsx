import { Heading, Hr, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, baseStyles } from "./layout";

interface SubscriptionReceiptEmailProps {
  firstName: string;
  planName: string;
  amountFormatted: string;
  invoiceNumber: string | null;
  paidAt: string;
  periodEnd: string;
  portalUrl: string;
}

export function SubscriptionReceiptEmail({
  firstName,
  planName,
  amountFormatted,
  invoiceNumber,
  paidAt,
  periodEnd,
  portalUrl,
}: SubscriptionReceiptEmailProps) {
  return (
    <EmailLayout preview={`Receipt for your rezm.ai ${planName} subscription`}>
      <Heading style={baseStyles.heading}>Payment received</Heading>
      <Text style={baseStyles.text}>
        Hi {firstName}, thanks for your continued support of rezm.ai. Here are
        the details of your payment:
      </Text>

      <Section
        style={{
          backgroundColor: "#f4f4f5",
          borderRadius: "6px",
          padding: "16px",
          margin: "16px 0",
        }}
      >
        <ReceiptRow label="Plan" value={planName} />
        <ReceiptRow label="Amount" value={amountFormatted} />
        <ReceiptRow label="Paid on" value={paidAt} />
        <ReceiptRow label="Next renewal" value={periodEnd} />
        {invoiceNumber && <ReceiptRow label="Invoice" value={invoiceNumber} />}
      </Section>

      <Section style={{ marginBottom: "24px", marginTop: "24px" }}>
        <Link href={portalUrl} style={baseStyles.button}>
          Manage subscription
        </Link>
      </Section>

      <Hr style={baseStyles.hr} />
      <Text style={baseStyles.muted}>
        Need an invoice? Open the customer portal above to download a PDF
        receipt.
      </Text>
    </EmailLayout>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <Text
      style={{
        color: baseStyles.text.color,
        fontSize: "14px",
        margin: "4px 0",
        lineHeight: "1.4",
      }}
    >
      <span style={{ color: baseStyles.muted.color, display: "inline-block", width: "100px" }}>
        {label}
      </span>
      <strong>{value}</strong>
    </Text>
  );
}

export default SubscriptionReceiptEmail;
