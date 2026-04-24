import { Font } from "@react-pdf/renderer";

// Register Google Fonts for use in PDF layouts.
// Helvetica, Times-Roman and Courier are built into @react-pdf/renderer — no registration needed.
// This file is imported as a side effect by both the server renderer and the client live-preview.

let registered = false;

export function registerPdfFonts() {
  if (registered) return;
  registered = true;

  Font.register({
    family: "Inter",
    fonts: [
      { src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf", fontWeight: 400 },
      { src: "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf", fontWeight: 700 },
    ],
  });

  Font.register({
    family: "Merriweather",
    fonts: [
      { src: "https://cdn.jsdelivr.net/fontsource/fonts/merriweather@latest/latin-400-normal.ttf", fontWeight: 400 },
      { src: "https://cdn.jsdelivr.net/fontsource/fonts/merriweather@latest/latin-700-normal.ttf", fontWeight: 700 },
    ],
  });

  Font.register({
    family: "Source Sans Pro",
    fonts: [
      { src: "https://cdn.jsdelivr.net/fontsource/fonts/source-sans-pro@latest/latin-400-normal.ttf", fontWeight: 400 },
      { src: "https://cdn.jsdelivr.net/fontsource/fonts/source-sans-pro@latest/latin-700-normal.ttf", fontWeight: 700 },
    ],
  });

  // Disable hyphenation — resumes look cleaner with whole words.
  Font.registerHyphenationCallback((word) => [word]);
}

// Run at module import time so both renderers pick it up.
registerPdfFonts();
