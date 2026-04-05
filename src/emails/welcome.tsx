import { Heading, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, baseStyles } from "./layout";

interface WelcomeEmailProps {
  firstName: string;
  slug: string;
  dashboardUrl: string;
  profileUrl: string;
}

export function WelcomeEmail({ firstName, slug, dashboardUrl, profileUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`Welcome to ResumeProfile, ${firstName}!`}>
      <Heading style={baseStyles.heading}>
        Welcome to ResumeProfile!
      </Heading>
      <Text style={baseStyles.text}>
        Hi {firstName}, thanks for joining ResumeProfile. Your professional
        profile is ready to be built.
      </Text>
      <Text style={baseStyles.text}>
        Your profile URL:{" "}
        <Link href={profileUrl} style={baseStyles.link}>
          {slug}.resumeprofile.com
        </Link>
      </Text>
      <Section style={{ marginBottom: "24px", marginTop: "24px" }}>
        <Link href={dashboardUrl} style={baseStyles.button}>
          Go to Dashboard
        </Link>
      </Section>
      <Text style={baseStyles.text}>
        Here&apos;s what to do next:
      </Text>
      <Text style={{ ...baseStyles.text, paddingLeft: "16px" }}>
        1. Add your professional headline and location
        <br />
        2. Create resume sections (experience, education, skills)
        <br />
        3. Publish your profile and share it
      </Text>
      <Text style={baseStyles.text}>
        If you have any questions, just reply to this email.
      </Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;
