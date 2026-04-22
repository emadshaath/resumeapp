"use client";

import { useDeferredValue, useMemo } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { buildResumeDocument } from "@/lib/pdf/render";
import type { PdfLayout, PdfColorTheme, PdfFontConfig, ResumeData } from "@/lib/pdf/types";
import "@/lib/pdf/fonts";

interface PdfLivePreviewProps {
  data: ResumeData;
  layout: PdfLayout;
  colorTheme: PdfColorTheme;
  fontConfig: PdfFontConfig;
}

/**
 * Renders the PDF in an iframe live as the user changes settings.
 * Uses useDeferredValue so sliders stay snappy — the preview catches up
 * in a low-priority update.
 */
export default function PdfLivePreview({ data, layout, colorTheme, fontConfig }: PdfLivePreviewProps) {
  const deferredLayout = useDeferredValue(layout);
  const deferredTheme = useDeferredValue(colorTheme);
  const deferredFont = useDeferredValue(fontConfig);

  const doc = useMemo(
    () => buildResumeDocument(data, deferredLayout, deferredTheme, deferredFont),
    [data, deferredLayout, deferredTheme, deferredFont],
  );

  return (
    <PDFViewer
      showToolbar={false}
      style={{ width: "100%", height: "100%", border: "none", backgroundColor: "transparent" }}
    >
      {doc as React.ReactElement<import("@react-pdf/renderer").DocumentProps>}
    </PDFViewer>
  );
}
