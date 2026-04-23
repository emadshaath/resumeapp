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
}

/**
 * Block-driven PDF layout. Takes an arbitrary list of ResumeBlocks and renders
 * them into the page's zones. The header zone always occupies the full page
 * width at the top. Main + sidebar zones are split side-by-side when
 * pageTemplate is "sidebar-left"; otherwise sidebar blocks are appended below
 * main blocks so nothing silently disappears when the user switches templates.
 */
export function CustomLayout({
  data,
  palette,
  font,
  blocks,
  pageTemplate,
  sidebarWidth,
}: CustomLayoutProps) {
  const styles = createCustomStyles(palette, font);

  const sorted = [...blocks].sort((a, b) => a.display_order - b.display_order);
  const headerBlocks = sorted.filter((b) => b.zone === "header");
  const mainBlocks = sorted.filter((b) => b.zone === "main");
  const sidebarBlocks = sorted.filter((b) => b.zone === "sidebar");

  const ctxMain = { s: styles, data, inSidebar: false };
  const ctxSidebar = { s: styles, data, inSidebar: true };

  const isSidebarTemplate = pageTemplate === "sidebar-left";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.pageBody}>
          {headerBlocks.map((b) => renderBlock(b, ctxMain))}

          {isSidebarTemplate ? (
            <View style={styles.columns}>
              <View style={[styles.sidebarCol, { width: sidebarWidth }]}>
                {sidebarBlocks.map((b) => renderBlock(b, ctxSidebar))}
              </View>
              <View style={styles.mainCol}>
                {mainBlocks.map((b) => renderBlock(b, ctxMain))}
              </View>
            </View>
          ) : (
            <View>
              {mainBlocks.map((b) => renderBlock(b, ctxMain))}
              {/* Fallback: render sidebar-zoned blocks inline so switching
                  templates never silently drops content. */}
              {sidebarBlocks.map((b) => renderBlock(b, ctxMain))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
