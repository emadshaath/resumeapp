import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { PdfLayout, PdfColorTheme, PdfFontConfig, ResumeData } from "./types";
import { COLOR_THEMES, DEFAULT_FONT_CONFIG } from "./types";
import { ClassicLayout } from "./layouts/classic";
import { ModernLayout } from "./layouts/modern";
import { MinimalLayout } from "./layouts/minimal";
import { ExecutiveLayout } from "./layouts/executive";
import "./fonts";

export async function renderResumePdf(
  data: ResumeData,
  layout: PdfLayout = "classic",
  colorTheme: PdfColorTheme = "navy",
  fontConfig: PdfFontConfig = DEFAULT_FONT_CONFIG,
): Promise<Uint8Array> {
  const palette = COLOR_THEMES[colorTheme].palette;

  let doc: React.JSX.Element;
  switch (layout) {
    case "modern":
      doc = <ModernLayout data={data} palette={palette} font={fontConfig} />;
      break;
    case "minimal":
      doc = <MinimalLayout data={data} palette={palette} font={fontConfig} />;
      break;
    case "executive":
      doc = <ExecutiveLayout data={data} palette={palette} font={fontConfig} />;
      break;
    case "classic":
    default:
      doc = <ClassicLayout data={data} palette={palette} font={fontConfig} />;
      break;
  }

  // renderToBuffer expects a Document element; cast to satisfy strict typing
  const buffer = await renderToBuffer(doc as React.ReactElement<import("@react-pdf/renderer").DocumentProps>);
  return new Uint8Array(buffer);
}

export function buildResumeDocument(
  data: ResumeData,
  layout: PdfLayout = "classic",
  colorTheme: PdfColorTheme = "navy",
  fontConfig: PdfFontConfig = DEFAULT_FONT_CONFIG,
): React.JSX.Element {
  const palette = COLOR_THEMES[colorTheme].palette;
  switch (layout) {
    case "modern":
      return <ModernLayout data={data} palette={palette} font={fontConfig} />;
    case "minimal":
      return <MinimalLayout data={data} palette={palette} font={fontConfig} />;
    case "executive":
      return <ExecutiveLayout data={data} palette={palette} font={fontConfig} />;
    case "classic":
    default:
      return <ClassicLayout data={data} palette={palette} font={fontConfig} />;
  }
}
