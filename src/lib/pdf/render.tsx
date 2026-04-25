import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { PdfLayout, PdfColorTheme, PdfFontConfig, PdfPageSize, ResumeData } from "./types";
import { COLOR_THEMES, DEFAULT_FONT_CONFIG } from "./types";
import type { PageTemplate, ResumeBlock } from "@/types/database";
import { CustomLayout } from "./layouts/custom";
import "./fonts";

export interface CustomLayoutInputs {
  blocks: ResumeBlock[];
  pageTemplate: PageTemplate;
  sidebarWidth: number;
  pageMargin: number;
  pageSize: PdfPageSize;
}

const DEFAULT_CUSTOM_INPUTS: CustomLayoutInputs = {
  blocks: [],
  pageTemplate: "single-column",
  sidebarWidth: 180,
  pageMargin: 40,
  pageSize: "A4",
};

export async function renderResumePdf(
  data: ResumeData,
  // `layout` is preserved as an argument for back-compat with callers that
  // still pass the old preset values, but only "custom" is rendered now —
  // everything routes through CustomLayout. See migration 00027.
  layout: PdfLayout = "custom",
  colorTheme: PdfColorTheme = "navy",
  fontConfig: PdfFontConfig = DEFAULT_FONT_CONFIG,
  customInputs: CustomLayoutInputs = DEFAULT_CUSTOM_INPUTS,
): Promise<Uint8Array> {
  const doc = buildResumeDocument(data, layout, colorTheme, fontConfig, customInputs);
  const buffer = await renderToBuffer(doc as React.ReactElement<import("@react-pdf/renderer").DocumentProps>);
  return new Uint8Array(buffer);
}

export function buildResumeDocument(
  data: ResumeData,
  // see renderResumePdf — argument retained for signature compatibility.
  layout: PdfLayout = "custom",
  colorTheme: PdfColorTheme = "navy",
  fontConfig: PdfFontConfig = DEFAULT_FONT_CONFIG,
  customInputs: CustomLayoutInputs = DEFAULT_CUSTOM_INPUTS,
): React.JSX.Element {
  void layout; // signature-compat only — every render flows through CustomLayout
  const palette = COLOR_THEMES[colorTheme].palette;
  return (
    <CustomLayout
      data={data}
      palette={palette}
      font={fontConfig}
      blocks={customInputs.blocks}
      pageTemplate={customInputs.pageTemplate}
      sidebarWidth={customInputs.sidebarWidth}
      pageMargin={customInputs.pageMargin}
      pageSize={customInputs.pageSize}
    />
  );
}
