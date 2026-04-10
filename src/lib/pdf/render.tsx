import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { PdfLayout, PdfColorTheme, ResumeData } from "./types";
import { COLOR_THEMES } from "./types";
import { ClassicLayout } from "./layouts/classic";
import { ModernLayout } from "./layouts/modern";
import { MinimalLayout } from "./layouts/minimal";
import { ExecutiveLayout } from "./layouts/executive";

export async function renderResumePdf(
  data: ResumeData,
  layout: PdfLayout = "classic",
  colorTheme: PdfColorTheme = "navy",
  singlePage = false
): Promise<Uint8Array> {
  const palette = COLOR_THEMES[colorTheme].palette;

  let doc: React.JSX.Element;
  switch (layout) {
    case "modern":
      doc = <ModernLayout data={data} palette={palette} singlePage={singlePage} />;
      break;
    case "minimal":
      doc = <MinimalLayout data={data} palette={palette} singlePage={singlePage} />;
      break;
    case "executive":
      doc = <ExecutiveLayout data={data} palette={palette} singlePage={singlePage} />;
      break;
    case "classic":
    default:
      doc = <ClassicLayout data={data} palette={palette} singlePage={singlePage} />;
      break;
  }

  // renderToBuffer expects a Document element; cast to satisfy strict typing
  const buffer = await renderToBuffer(doc as React.ReactElement<import("@react-pdf/renderer").DocumentProps>);
  return new Uint8Array(buffer);
}
