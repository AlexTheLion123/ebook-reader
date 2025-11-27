/**
 * Step 1: Pre-process TeX files to make them LaTeXML-compatible
 *
 * This script converts custom macros and environments (particularly from
 * Project Gutenberg texts) to standard LaTeX that LaTeXML can handle.
 *
 * Usage: npx tsx preprocess-tex.ts [input-file.tex]
 *
 * If no input file is specified, processes all .tex files in the input/ folder.
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_DIR = './input';
const OUTPUT_DIR = './output';

/**
 * Convert custom Project Gutenberg macros to standard LaTeX
 * NOTE: Keep this minimal! The sandbox version worked with less preprocessing.
 */
function preprocessTex(content: string): string {
  let result = content;

  // Remove the entire custom DPalign/DPgather macro definitions block
  // This block starts around line 750 and ends at \makeatother
  // It defines balancedlrint, lintertext, rintertext, DPalign*, DPgather*, etc.
  result = result.replace(
    /%+\s*Balance intertext[^]*?\\makeatother\s*\n/,
    `% Custom DPalign/DPgather removed for LaTeXML compatibility
\\makeatletter
\\let\\lintertext\\intertext
\\let\\rintertext\\intertext
\\makeatother

`
  );

  // Replace DPalign* with align*
  result = result.replace(/\\begin\{DPalign\*\}(\[[^\]]*\])?/g, '\\begin{align*}');
  result = result.replace(/\\end\{DPalign\*\}/g, '\\end{align*}');

  // Replace DPgather* with gather*
  result = result.replace(/\\begin\{DPgather\*\}(\[[^\]]*\])?/g, '\\begin{gather*}');
  result = result.replace(/\\end\{DPgather\*\}/g, '\\end{gather*}');

  // Replace lintertext and rintertext with intertext
  result = result.replace(/\\lintertext\{/g, '\\intertext{');
  result = result.replace(/\\rintertext\{/g, '\\intertext{');

  // Remove the perpage package (LaTeXML doesn't have it)
  result = result.replace(
    /\\usepackage\{perpage\}/g,
    '% \\usepackage{perpage} % Removed for LaTeXML'
  );
  result = result.replace(
    /\\MakePerPage\{footnote\}/g,
    '% \\MakePerPage{footnote} % Removed for LaTeXML'
  );

  // Handle alignat* which may have different column counts
  result = result.replace(/\\begin\{alignat\*\}\{(\d+)\}/g, '\\begin{align*}');
  result = result.replace(/\\end\{alignat\*\}/g, '\\end{align*}');

  return result;
}

/**
 * Extract metadata from LaTeX source
 */
function extractMetadata(content: string): { title: string; author: string } {
  let title = 'Untitled';
  let author = 'Unknown';

  // Look for \title{...}
  const titleMatch = content.match(/\\title\{([^}]+)\}/);
  if (titleMatch) {
    title = titleMatch[1].replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1').trim();
  }

  // Look for \author{...}
  const authorMatch = content.match(/\\author\{([^}]+)\}/);
  if (authorMatch) {
    author = authorMatch[1].replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1').trim();
  }

  return { title, author };
}

async function processFile(inputPath: string): Promise<void> {
  const filename = path.basename(inputPath, '.tex');
  const outputPath = path.join(OUTPUT_DIR, `${filename}-cleaned.tex`);

  console.log(`\nProcessing: ${inputPath}`);
  const content = fs.readFileSync(inputPath, 'utf-8');
  console.log(`  Original size: ${content.length} bytes`);

  // Extract metadata before preprocessing
  const metadata = extractMetadata(content);
  console.log(`  Title: ${metadata.title}`);
  console.log(`  Author: ${metadata.author}`);

  // Preprocess the content
  const cleaned = preprocessTex(content);
  console.log(`  Cleaned size: ${cleaned.length} bytes`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write cleaned file
  fs.writeFileSync(outputPath, cleaned);
  console.log(`  Output: ${outputPath}`);

  // Save metadata
  const metadataPath = path.join(OUTPUT_DIR, `${filename}-metadata.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`  Metadata: ${metadataPath}`);

  // Count remaining custom environments (should be 0)
  const dpAlignCount = (cleaned.match(/\\begin\{DPalign\*\}/g) || []).length;
  const dpGatherCount = (cleaned.match(/\\begin\{DPgather\*\}/g) || []).length;

  if (dpAlignCount > 0 || dpGatherCount > 0) {
    console.warn(`  WARNING: ${dpAlignCount} DPalign* and ${dpGatherCount} DPgather* environments remaining!`);
  } else {
    console.log(`  ✓ All custom environments converted`);
  }
}

async function main(): Promise<void> {
  console.log('=== TeX Preprocessor ===');
  console.log('Converts Project Gutenberg custom macros to standard LaTeX\n');

  // Get input files
  const args = process.argv.slice(2);
  let inputFiles: string[] = [];

  if (args.length > 0) {
    // Process specified files
    inputFiles = args;
  } else {
    // Process all .tex files in input directory
    if (!fs.existsSync(INPUT_DIR)) {
      console.error(`Error: Input directory "${INPUT_DIR}" does not exist.`);
      console.log('Create the directory and place your .tex files there.');
      process.exit(1);
    }

    const files = fs.readdirSync(INPUT_DIR);
    inputFiles = files
      .filter((f) => f.endsWith('.tex'))
      .map((f) => path.join(INPUT_DIR, f));

    if (inputFiles.length === 0) {
      console.log(`No .tex files found in ${INPUT_DIR}`);
      console.log('Place your LaTeX files in the input/ directory.');
      process.exit(0);
    }
  }

  console.log(`Found ${inputFiles.length} file(s) to process`);

  for (const file of inputFiles) {
    try {
      await processFile(file);
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }

  console.log('\n=== Preprocessing Complete ===');
  console.log('Next step: Run "npm run convert" to convert to HTML');
}

main().catch(console.error);
