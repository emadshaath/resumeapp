import React from "react";
import { Document, Page, View } from "@react-pdf/renderer";
import type { PdfColorPalette, PdfFontConfig, ResumeData } from "../../types";
import type { PageTemplate, ResumeBlock } from "@/types/database";
import { createCustomStyles } from "./styles";
import { renderBlock } from "./blocks";

export interface CustomLayoutProps {
  data: ResumeData;
  palette: PdfColorPalette;
  font: PdfFontConfig;
  blocks: ResumeBlock[];
  pageTemplate: PageTemplate;
  sidebarWidth: number;
  /** Outer page margin in pixels at default scale (40 = previous default).
   *  Multiplied through font.spacingScale at render time. */
  pageMargin: number;
}

/**
 * Block-driven PDF layout. Takes an arbitrary list of ResumeBlocks and renders
 * them into the page's zones.
 *
 * Two page shapes:
 *   - single-column: header block at the top (full width), main + sidebar
 *     blocks stacked below in a single column. (Sidebar-zoned blocks fall
 *     through here so switching templates never silently drops content.)
 *   - sidebar-left: the Page itself is a flex row so the coloured sidebar
 *     extends to full page height, matching the Modern preset. The header
 *     block lives inside the sidebar (Modern-style: name + headline +
 *     contact stacked at the top of the sidebar).
 */
export function CustomLayout({
  data,
  palette,
  font,
  blocks,
  pageTemplate,
  sidebarWidth,
  pageMargin,
}: CustomLayoutProps) {
  const styles = createCustomStyles(palette, font);
  // Apply spacing scale so the margin slider feels consistent with the
  // section-spacing slider.
  const sp = font.spacingScale;
  const outerPad = pageMargin * sp;
  // Sidebar uses ~55% of the page margin so the colored area stays visually
  // distinct from the main column without feeling cramped.
  const sidebarPad = Math.round(pageMargin * 0.55) * sp;

  const sorted = [...blocks].sort((a, b) => a.display_order - b.display_order);
  const headerBlocks = sorted.filter((b) => b.zone === "header");
  const mainBlocks = sorted.filter((b) => b.zone === "main");
  const sidebarBlocks = sorted.filter((b) => b.zone === "sidebar");

  const ctxMain = { s: styles, data, inSidebar: false };
  const ctxSidebar = { s: styles, data, inSidebar: true };

  if (pageTemplate === "sidebar-left") {
    return (
      <Document>
        <Page size="A4" style={styles.pageRow}>
          <View
            style={[
              styles.sidebarColFull,
              { width: sidebarWidth, paddingHorizontal: sidebarPad, paddingVertical: outerPad },
            ]}
          >
            {headerBlocks.map((b) => renderBlock(b, ctxSidebar))}
            {sidebarBlocks.map((b) => renderBlock(b, ctxSidebar))}
          </View>
          <View style={[styles.mainColPad, { paddingHorizontal: outerPad, paddingVertical: outerPad }]}>
            {mainBlocks.map((b) => renderBlock(b, ctxMain))}
          </View>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.pageBody, { padding: outerPad }]}>
          {headerBlocks.map((b) => renderBlock(b, ctxMain))}
          {mainBlocks.map((b) => renderBlock(b, ctxMain))}
          {/* Fallback: render sidebar-zoned blocks inline so switching
              templates never silently drops content. */}
          {sidebarBlocks.map((b) => renderBlock(b, ctxMain))}
        </View>
      </Page>
    </Document>
  );
}
