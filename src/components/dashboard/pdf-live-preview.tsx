"use client";

import { useDeferredValue, useMemo } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { buildResumeDocument } from "@/lib/pdf/render";
import type { PdfLayout, PdfColorTheme, PdfFontConfig, PdfPageSize, ResumeData } from "@/lib/pdf/types";
import type { ResumeBlock, PageTemplate } from "@/types/database";
import "@/lib/pdf/fonts";

interface PdfLivePreviewProps {
  data: ResumeData;
  layout: PdfLayout;
  colorTheme: PdfColorTheme;
  fontConfig: PdfFontConfig;
  blocks: ResumeBlock[];
  pageTemplate: PageTemplate;
  sidebarWidth: number;
  pageMargin: number;
  pageSize: PdfPageSize;
}

/**
 * Renders the PDF in an iframe live as the user changes settings.
 * Uses useDeferredValue so sliders stay snappy — the preview catches up
 * in a low-priority update.
 */
export default function PdfLivePreview({
  data,
  layout,
  colorTheme,
  fontConfig,
  blocks,
  pageTemplate,
  sidebarWidth,
  pageMargin,
  pageSize,
}: PdfLivePreviewProps) {
  const deferredLayout = useDeferredValue(layout);
  const deferredTheme = useDeferredValue(colorTheme);
  const deferredFont = useDeferredValue(fontConfig);
  const deferredBlocks = useDeferredValue(blocks);
  const deferredPageTemplate = useDeferredValue(pageTemplate);
  const deferredSidebarWidth = useDeferredValue(sidebarWidth);
  const deferredPageMargin = useDeferredValue(pageMargin);
  const deferredPageSize = useDeferredValue(pageSize);

  const doc = useMemo(
    () => buildResumeDocument(
      data,
      deferredLayout,
      deferredTheme,
      deferredFont,
      {
        blocks: deferredBlocks,
        pageTemplate: deferredPageTemplate,
        sidebarWidth: deferredSidebarWidth,
        pageMargin: deferredPageMargin,
        pageSize: deferredPageSize,
      },
    ),
    [data, deferredLayout, deferredTheme, deferredFont, deferredBlocks, deferredPageTemplate, deferredSidebarWidth, deferredPageMargin, deferredPageSize],
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
