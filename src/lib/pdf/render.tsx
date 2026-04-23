import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { PdfLayout, PdfColorTheme, PdfFontConfig, ResumeData } from "./types";
import { COLOR_THEMES, DEFAULT_FONT_CONFIG } from "./types";
import type { PageTemplate, ResumeBlock } from "@/types/database";
import { ClassicLayout } from "./layouts/classic";
import { ModernLayout } from "./layouts/modern";
import { MinimalLayout } from "./layouts/minimal";
import { ExecutiveLayout } from "./layouts/executive";
import { CustomLayout } from "./layouts/custom";
import "./fonts";

export interface CustomLayoutInputs {
  blocks: ResumeBlock[];
  pageTemplate: PageTemplate;
  sidebarWidth: number;
}

const DEFAULT_CUSTOM_INPUTS: CustomLayoutInputs = {
  blocks: [],
  pageTemplate: "single-column",
  sidebarWidth: 180,
};

export async function renderResumePdf(
  data: ResumeData,
  layout: PdfLayout = "classic",
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
  layout: PdfLayout = "classic",
  colorTheme: PdfColorTheme = "navy",
  fontConfig: PdfFontConfig = DEFAULT_FONT_CONFIG,
  customInputs: CustomLayoutInputs = DEFAULT_CUSTOM_INPUTS,
): React.JSX.Element {
  const palette = COLOR_THEMES[colorTheme].palette;
  switch (layout) {
    case "modern":
      return <ModernLayout data={data} palette={palette} font={fontConfig} />;
    case "minimal":
      return <MinimalLayout data={data} palette={palette} font={fontConfig} />;
    case "executive":
      return <ExecutiveLayout data={data} palette={palette} font={fontConfig} />;
    case "custom":
      return (
        <CustomLayout
          data={data}
          palette={palette}
          font={fontConfig}
          blocks={customInputs.blocks}
          pageTemplate={customInputs.pageTemplate}
          sidebarWidth={customInputs.sidebarWidth}
        />
      );
    case "classic":
    default:
      return <ClassicLayout data={data} palette={palette} font={fontConfig} />;
  }
}
