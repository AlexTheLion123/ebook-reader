/**
 * Chunk LaTeX content for Bedrock Knowledge Base
 * 
 * This tool parses LaTeX content and extracts semantic units (theorems, definitions,
 * examples, sections) that are optimal for vector embeddings and semantic search.
 * 
 * Usage:
 *   npx tsx chunk-latex.ts <book-folder> --book-id <book-id>
 *   npx tsx chunk-latex.ts <latex-file.tex> --book-id <book-id>
 * 
 * Expected folder structure:
 *   <book-folder>/
 *   ├── chapters/
 *   │   ├── chapter-1.tex
 *   │   ├── chapter-2.tex
 *   │   └── ...
 * 
 * Output:
 *   - Uploads JSON chunks to S3 under knowledge-base/{bookId}/
 *   - Each chunk is 200-2000 characters for optimal embeddings
 * 
 * Environment variables:
 *   AWS_REGION - AWS region (default: eu-west-1)
 *   S3_BUCKET - S3 bucket name
 *   DRY_RUN - Set to 'true' to preview without uploading
 */

import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// AWS Configuration
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const S3_BUCKET = process.env.S3_BUCKET || 'textbook-study-buddy-textbookbucket-hevgehlro2tk';
const DRY_RUN = process.env.DRY_RUN === 'true';

// Chunk size limits (characters)
const MIN_CHUNK_SIZE = 200;
const MAX_CHUNK_SIZE = 2000;
const TARGET_CHUNK_SIZE = 1000;

// AWS Client
const s3Client = new S3Client({ region: AWS_REGION });

/**
 * Semantic chunk types found in LaTeX
 */
type ChunkType = 
  | 'theorem' 
  | 'definition' 
  | 'example' 
  | 'proof' 
  | 'lemma' 
  | 'corollary' 
  | 'proposition'
  | 'remark'
  | 'section'
  | 'subsection'
  | 'paragraph'
  | 'equation'
  | 'text';

interface SemanticChunk {
  id: string;
  bookId: string;
  chapterNumber: number;
  chapterTitle: string;
  type: ChunkType;
  title?: string;
  content: string;
  latexContent: string;
  order: number;
  metadata: {
    sourceFile: string;
    startLine?: number;
    endLine?: number;
    parentSection?: string;
  };
}

interface ChunkingStats {
  totalChunks: number;
  byType: Record<ChunkType, number>;
  avgChunkSize: number;
  tooSmall: number;
  tooLarge: number;
}

/**
 * LaTeX environment patterns for semantic extraction
 */
const LATEX_ENVIRONMENTS: { pattern: RegExp; type: ChunkType }[] = [
  { pattern: /\\begin\{theorem\}([\s\S]*?)\\end\{theorem\}/g, type: 'theorem' },
  { pattern: /\\begin\{definition\}([\s\S]*?)\\end\{definition\}/g, type: 'definition' },
  { pattern: /\\begin\{example\}([\s\S]*?)\\end\{example\}/g, type: 'example' },
  { pattern: /\\begin\{proof\}([\s\S]*?)\\end\{proof\}/g, type: 'proof' },
  { pattern: /\\begin\{lemma\}([\s\S]*?)\\end\{lemma\}/g, type: 'lemma' },
  { pattern: /\\begin\{corollary\}([\s\S]*?)\\end\{corollary\}/g, type: 'corollary' },
  { pattern: /\\begin\{proposition\}([\s\S]*?)\\end\{proposition\}/g, type: 'proposition' },
  { pattern: /\\begin\{remark\}([\s\S]*?)\\end\{remark\}/g, type: 'remark' },
  // Equation environments
  { pattern: /\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, type: 'equation' },
  { pattern: /\\begin\{align\}([\s\S]*?)\\end\{align\}/g, type: 'equation' },
  { pattern: /\\begin\{align\*\}([\s\S]*?)\\end\{align\*\}/g, type: 'equation' },
  // Amsthm custom environments (common in textbooks)
  { pattern: /\\begin\{thm\}([\s\S]*?)\\end\{thm\}/g, type: 'theorem' },
  { pattern: /\\begin\{defn\}([\s\S]*?)\\end\{defn\}/g, type: 'definition' },
  { pattern: /\\begin\{ex\}([\s\S]*?)\\end\{ex\}/g, type: 'example' },
  { pattern: /\\begin\{lem\}([\s\S]*?)\\end\{lem\}/g, type: 'lemma' },
  { pattern: /\\begin\{cor\}([\s\S]*?)\\end\{cor\}/g, type: 'corollary' },
  { pattern: /\\begin\{prop\}([\s\S]*?)\\end\{prop\}/g, type: 'proposition' },
];

/**
 * Extract title from LaTeX environment
 */
function extractEnvTitle(latex: string): string | undefined {
  // Match [title] or {title} after environment begin
  const bracketMatch = latex.match(/^\s*\[([^\]]+)\]/);
  if (bracketMatch) return bracketMatch[1].trim();
  
  const braceMatch = latex.match(/^\s*\{([^}]+)\}/);
  if (braceMatch) return braceMatch[1].trim();
  
  // Match \label{...} to use as fallback title
  const labelMatch = latex.match(/\\label\{([^}]+)\}/);
  if (labelMatch) return labelMatch[1].replace(/_/g, ' ');
  
  return undefined;
}

/**
 * Clean LaTeX to extract readable text while preserving math
 */
function cleanLatex(latex: string): string {
  let text = latex;
  
  // Remove comments
  text = text.replace(/%.*$/gm, '');
  
  // Remove \label{...}
  text = text.replace(/\\label\{[^}]*\}/g, '');
  
  // Convert \textbf, \textit, \emph to plain text
  text = text.replace(/\\textbf\{([^}]*)\}/g, '$1');
  text = text.replace(/\\textit\{([^}]*)\}/g, '$1');
  text = text.replace(/\\emph\{([^}]*)\}/g, '$1');
  
  // Convert \section, \subsection commands to text
  text = text.replace(/\\section\*?\{([^}]*)\}/g, '\n\n$1\n\n');
  text = text.replace(/\\subsection\*?\{([^}]*)\}/g, '\n\n$1\n\n');
  text = text.replace(/\\subsubsection\*?\{([^}]*)\}/g, '\n\n$1\n\n');
  
  // Keep math notation but clean up
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => `\n[MATH: ${math.trim()}]\n`);
  text = text.replace(/\$([^$]+)\$/g, (_, math) => `[${math.trim()}]`);
  
  // Remove remaining LaTeX commands but keep content
  text = text.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');
  text = text.replace(/\\[a-zA-Z]+/g, '');
  
  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  
  return text;
}

/**
 * Extract section titles from LaTeX
 */
function extractSectionTitle(latex: string): string | undefined {
  const sectionMatch = latex.match(/\\section\*?\{([^}]+)\}/);
  if (sectionMatch) return sectionMatch[1];
  
  const subsectionMatch = latex.match(/\\subsection\*?\{([^}]+)\}/);
  if (subsectionMatch) return subsectionMatch[1];
  
  return undefined;
}

/**
 * Extract chapter title from LaTeX content
 */
function extractChapterTitle(latex: string, defaultTitle: string): string {
  const chapterMatch = latex.match(/\\chapter\*?\{([^}]+)\}/);
  if (chapterMatch) return chapterMatch[1];
  
  const titleMatch = latex.match(/\\title\{([^}]+)\}/);
  if (titleMatch) return titleMatch[1];
  
  return defaultTitle;
}

interface ExtractedChunk {
  type: ChunkType;
  latex: string;
  title?: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Extract semantic chunks from LaTeX content
 */
function extractSemanticChunks(latex: string): ExtractedChunk[] {
  const chunks: ExtractedChunk[] = [];
  const usedRanges: Array<[number, number]> = [];
  
  // Extract all environment-based chunks
  for (const { pattern, type } of LATEX_ENVIRONMENTS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match;
    
    while ((match = pattern.exec(latex)) !== null) {
      const startIndex = match.index;
      const endIndex = match.index + match[0].length;
      
      // Check if this range overlaps with already extracted chunks
      const overlaps = usedRanges.some(
        ([start, end]) => (startIndex >= start && startIndex < end) || (endIndex > start && endIndex <= end)
      );
      
      if (!overlaps) {
        const content = match[1];
        const title = extractEnvTitle(content);
        
        chunks.push({
          type,
          latex: match[0],
          title,
          startIndex,
          endIndex,
        });
        
        usedRanges.push([startIndex, endIndex]);
      }
    }
  }
  
  // Extract section-based chunks for remaining text
  const sectionPattern = /\\(section|subsection|subsubsection)\*?\{([^}]+)\}([\s\S]*?)(?=\\(section|subsection|subsubsection|chapter)\*?\{|$)/g;
  let sectionMatch;
  
  while ((sectionMatch = sectionPattern.exec(latex)) !== null) {
    const sectionType = sectionMatch[1] as 'section' | 'subsection';
    const sectionTitle = sectionMatch[2];
    const sectionContent = sectionMatch[3];
    const startIndex = sectionMatch.index;
    const endIndex = startIndex + sectionMatch[0].length;
    
    // Only add if not overlapping with environment chunks
    const overlaps = usedRanges.some(
      ([start, end]) => (startIndex >= start && startIndex < end)
    );
    
    if (!overlaps && sectionContent.trim().length > MIN_CHUNK_SIZE) {
      // Check if the section content is mostly covered by extracted chunks
      const contentCoverage = usedRanges.reduce((acc, [start, end]) => {
        if (start >= startIndex && end <= endIndex) {
          return acc + (end - start);
        }
        return acc;
      }, 0);
      
      // Only add section if less than 70% is covered by other chunks
      if (contentCoverage < (endIndex - startIndex) * 0.7) {
        chunks.push({
          type: sectionType,
          latex: sectionMatch[0],
          title: sectionTitle,
          startIndex,
          endIndex,
        });
      }
    }
  }
  
  // Sort by position in document
  chunks.sort((a, b) => a.startIndex - b.startIndex);
  
  return chunks;
}

/**
 * Split a large chunk into smaller pieces while respecting sentence boundaries
 */
function splitLargeChunk(chunk: ExtractedChunk): ExtractedChunk[] {
  const cleanedContent = cleanLatex(chunk.latex);
  
  if (cleanedContent.length <= MAX_CHUNK_SIZE) {
    return [chunk];
  }
  
  const result: ExtractedChunk[] = [];
  
  // Split by sentences or paragraphs
  const paragraphs = chunk.latex.split(/\n\n+/);
  let currentChunk = '';
  let partNumber = 1;
  
  for (const paragraph of paragraphs) {
    const cleanedPara = cleanLatex(paragraph);
    
    if (cleanLatex(currentChunk + paragraph).length > MAX_CHUNK_SIZE && currentChunk) {
      // Save current chunk
      result.push({
        type: chunk.type,
        latex: currentChunk,
        title: chunk.title ? `${chunk.title} (Part ${partNumber})` : undefined,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
      });
      currentChunk = paragraph;
      partNumber++;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
    }
  }
  
  // Add remaining content
  if (currentChunk.trim()) {
    result.push({
      type: chunk.type,
      latex: currentChunk,
      title: chunk.title && result.length > 0 ? `${chunk.title} (Part ${partNumber})` : chunk.title,
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex,
    });
  }
  
  return result;
}

/**
 * Process a LaTeX file and extract semantic chunks
 */
function processLatexFile(
  filePath: string,
  bookId: string,
  chapterNumber: number,
  chapterTitle: string
): SemanticChunk[] {
  const latex = fs.readFileSync(filePath, 'utf-8');
  const extractedChunks = extractSemanticChunks(latex);
  
  // Split large chunks
  const splitChunks = extractedChunks.flatMap(chunk => splitLargeChunk(chunk));
  
  // Convert to SemanticChunk format
  const semanticChunks: SemanticChunk[] = [];
  let currentSection: string | undefined;
  
  for (let i = 0; i < splitChunks.length; i++) {
    const chunk = splitChunks[i];
    const cleanedContent = cleanLatex(chunk.latex);
    
    // Skip chunks that are too small after cleaning
    if (cleanedContent.length < MIN_CHUNK_SIZE) {
      continue;
    }
    
    // Track current section for context
    if (chunk.type === 'section' || chunk.type === 'subsection') {
      currentSection = chunk.title;
    }
    
    semanticChunks.push({
      id: uuidv4(),
      bookId,
      chapterNumber,
      chapterTitle,
      type: chunk.type,
      title: chunk.title,
      content: cleanedContent,
      latexContent: chunk.latex,
      order: semanticChunks.length + 1,
      metadata: {
        sourceFile: path.basename(filePath),
        parentSection: currentSection,
      },
    });
  }
  
  // If no semantic chunks were found, create paragraph-based chunks
  if (semanticChunks.length === 0) {
    const paragraphs = latex.split(/\n\n+/).filter(p => p.trim().length > MIN_CHUNK_SIZE);
    
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      const cleanedContent = cleanLatex(para);
      
      if (cleanedContent.length >= MIN_CHUNK_SIZE) {
        semanticChunks.push({
          id: uuidv4(),
          bookId,
          chapterNumber,
          chapterTitle,
          type: 'paragraph',
          content: cleanedContent,
          latexContent: para,
          order: i + 1,
          metadata: {
            sourceFile: path.basename(filePath),
          },
        });
      }
    }
  }
  
  return semanticChunks;
}

/**
 * Upload chunk to S3 in Bedrock Knowledge Base format
 */
async function uploadChunkToS3(chunk: SemanticChunk): Promise<void> {
  // Format for Bedrock Knowledge Base
  // See: https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-ds.html
  const document = {
    // Main content for embedding
    content: chunk.content,
    // Metadata for filtering
    metadata: {
      bookId: chunk.bookId,
      chapterNumber: chunk.chapterNumber,
      chapterTitle: chunk.chapterTitle,
      type: chunk.type,
      title: chunk.title || '',
      order: chunk.order,
      sourceFile: chunk.metadata.sourceFile,
      parentSection: chunk.metadata.parentSection || '',
      // Include LaTeX for AI context
      latexContent: chunk.latexContent.substring(0, 5000),
    },
  };
  
  const s3Key = `knowledge-base/${chunk.bookId}/chunk-${chunk.chapterNumber}-${chunk.order}.json`;
  
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would upload chunk: ${s3Key} (${chunk.content.length} chars, type: ${chunk.type})`);
    return;
  }
  
  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: JSON.stringify(document, null, 2),
    ContentType: 'application/json',
  }));
}

/**
 * Parse command line arguments
 */
function parseArgs(): { inputPath: string; bookId: string } {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: npx tsx chunk-latex.ts <book-folder-or-tex-file> --book-id <book-id>

Examples:
  npx tsx chunk-latex.ts ../sandbox/calculus-chapters --book-id abc123
  npx tsx chunk-latex.ts ../sandbox/chapter.tex --book-id abc123

Options:
  --book-id    The book ID to associate chunks with (required)
  --dry-run    Preview chunks without uploading (or set DRY_RUN=true)
`);
    process.exit(0);
  }
  
  const inputPath = args[0];
  let bookId = '';
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--book-id' && args[i + 1]) {
      bookId = args[++i];
    } else if (args[i] === '--dry-run') {
      process.env.DRY_RUN = 'true';
    }
  }
  
  if (!bookId) {
    console.error('Error: --book-id is required');
    process.exit(1);
  }
  
  return { inputPath, bookId };
}

/**
 * Process a book folder or single file
 */
async function processBook(inputPath: string, bookId: string): Promise<ChunkingStats> {
  const stats: ChunkingStats = {
    totalChunks: 0,
    byType: {} as Record<ChunkType, number>,
    avgChunkSize: 0,
    tooSmall: 0,
    tooLarge: 0,
  };
  
  const allChunks: SemanticChunk[] = [];
  const fullPath = path.resolve(inputPath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Path not found: ${fullPath}`);
  }
  
  const isDirectory = fs.statSync(fullPath).isDirectory();
  
  if (isDirectory) {
    // Look for chapters directory or .tex files in root
    const chaptersDir = path.join(fullPath, 'chapters');
    const searchDir = fs.existsSync(chaptersDir) ? chaptersDir : fullPath;
    
    const texFiles = fs.readdirSync(searchDir)
      .filter(f => f.endsWith('.tex'))
      .sort();
    
    if (texFiles.length === 0) {
      throw new Error(`No .tex files found in ${searchDir}`);
    }
    
    console.log(`Found ${texFiles.length} LaTeX files`);
    
    for (let i = 0; i < texFiles.length; i++) {
      const texFile = texFiles[i];
      const texPath = path.join(searchDir, texFile);
      const latex = fs.readFileSync(texPath, 'utf-8');
      const chapterTitle = extractChapterTitle(latex, `Chapter ${i + 1}`);
      
      console.log(`\nProcessing: ${texFile}`);
      const chunks = processLatexFile(texPath, bookId, i + 1, chapterTitle);
      
      console.log(`  Found ${chunks.length} chunks`);
      allChunks.push(...chunks);
    }
  } else {
    // Single file
    const latex = fs.readFileSync(fullPath, 'utf-8');
    const chapterTitle = extractChapterTitle(latex, 'Chapter 1');
    
    console.log(`Processing single file: ${path.basename(fullPath)}`);
    const chunks = processLatexFile(fullPath, bookId, 1, chapterTitle);
    
    console.log(`Found ${chunks.length} chunks`);
    allChunks.push(...chunks);
  }
  
  // Calculate stats
  let totalSize = 0;
  for (const chunk of allChunks) {
    stats.byType[chunk.type] = (stats.byType[chunk.type] || 0) + 1;
    totalSize += chunk.content.length;
    
    if (chunk.content.length < MIN_CHUNK_SIZE) stats.tooSmall++;
    if (chunk.content.length > MAX_CHUNK_SIZE) stats.tooLarge++;
  }
  
  stats.totalChunks = allChunks.length;
  stats.avgChunkSize = Math.round(totalSize / allChunks.length) || 0;
  
  // Upload chunks to S3
  console.log(`\nUploading ${allChunks.length} chunks to S3...`);
  
  for (let i = 0; i < allChunks.length; i++) {
    await uploadChunkToS3(allChunks[i]);
    
    // Progress indicator
    if ((i + 1) % 10 === 0 || i === allChunks.length - 1) {
      console.log(`  Progress: ${i + 1}/${allChunks.length}`);
    }
  }
  
  return stats;
}

async function main(): Promise<void> {
  console.log('=== QuickBook LaTeX Chunker ===');
  console.log(`Region: ${AWS_REGION}`);
  console.log(`S3 Bucket: ${S3_BUCKET}`);
  console.log(`Target chunk size: ${TARGET_CHUNK_SIZE} chars`);
  
  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE - No actual uploads will occur\n');
  }
  
  const { inputPath, bookId } = parseArgs();
  
  console.log(`\nBook ID: ${bookId}`);
  console.log(`Input: ${inputPath}`);
  
  const stats = await processBook(inputPath, bookId);
  
  console.log('\n=== Chunking Statistics ===');
  console.log(`Total chunks: ${stats.totalChunks}`);
  console.log(`Average chunk size: ${stats.avgChunkSize} chars`);
  console.log(`Chunks by type:`);
  
  for (const [type, count] of Object.entries(stats.byType)) {
    console.log(`  ${type}: ${count}`);
  }
  
  if (stats.tooSmall > 0) {
    console.log(`\n⚠ Warning: ${stats.tooSmall} chunks smaller than ${MIN_CHUNK_SIZE} chars`);
  }
  if (stats.tooLarge > 0) {
    console.log(`⚠ Warning: ${stats.tooLarge} chunks larger than ${MAX_CHUNK_SIZE} chars`);
  }
  
  console.log('\n✓ Chunking complete!');
  console.log(`Chunks uploaded to: s3://${S3_BUCKET}/knowledge-base/${bookId}/`);
  console.log('\nNext step: Sync the Knowledge Base to ingest these chunks:');
  console.log('  aws bedrock-agent start-ingestion-job --knowledge-base-id <KB_ID> --data-source-id <DS_ID>');
}

main().catch((error: Error) => {
  console.error('\n❌ Chunking failed:', error.message);
  process.exit(1);
});
