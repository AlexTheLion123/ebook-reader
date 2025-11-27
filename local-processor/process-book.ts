#!/usr/bin/env npx tsx
/**
 * Unified Book Processing Pipeline
 * 
 * This script handles the complete pipeline for processing a book:
 * 1. Setup book directory structure
 * 2. Convert TeX to HTML via LaTeXML
 * 3. Split into chapters
 * 4. Create knowledge base chunks
 * 5. Upload to AWS (S3 + DynamoDB)
 * 
 * Usage:
 *   npx tsx process-book.ts <book-slug> [--step=<step>] [--dry-run]
 * 
 * Book folder structure:
 *   books/<book-slug>/
 *     book.json           - Book metadata and config
 *     source/             - Original source files (tex, images)
 *     converted/          - LaTeXML output (xml, html)
 *     chapters/           - Split chapter HTML files
 *     chunks/             - Knowledge base chunks (JSON)
 *     manifest.json       - Generated chapter manifest
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn } from 'child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Configuration
// ============================================================================

const AWS_REGION = 'eu-west-1';
const S3_BUCKET = 'textbook-study-buddy-textbookbucket-hevgehlro2tk';
const DYNAMODB_TABLE = 'textbook-study-buddy-TextbookContentTable-PD2FT7ZOQ572';

const BOOKS_DIR = path.join(process.cwd(), 'books');

interface BookConfig {
  slug: string;
  title: string;
  author: string;
  sourceType: 'tex' | 'epub';
  sourceFile: string;
  chapterPattern?: {
    // Regex pattern to find chapter boundaries in HTML
    sectionSelector: string;
    titlePattern: string;
  };
  // Optional: predefined chapter titles if auto-detection doesn't work well
  chapterTitles?: Record<string, string>;
}

interface ChapterInfo {
  number: number;
  title: string;
  filename: string;
  htmlFile: string;
}

interface ProcessingState {
  bookDir: string;
  config: BookConfig;
  dryRun: boolean;
}

// ============================================================================
// Book Directory Setup
// ============================================================================

function getBookDir(slug: string): string {
  return path.join(BOOKS_DIR, slug);
}

function initBookDirectory(slug: string): string {
  const bookDir = getBookDir(slug);
  
  // Create directory structure
  const dirs = ['source', 'source/images', 'converted', 'chapters', 'chunks'];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(bookDir, dir), { recursive: true });
  }
  
  return bookDir;
}

function loadBookConfig(bookDir: string): BookConfig {
  const configPath = path.join(bookDir, 'book.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Book config not found: ${configPath}\nRun 'npm run book:init <slug>' first.`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function saveBookConfig(bookDir: string, config: BookConfig): void {
  const configPath = path.join(bookDir, 'book.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// ============================================================================
// Step 1: Convert TeX to HTML
// ============================================================================

async function convertTexToHtml(state: ProcessingState): Promise<void> {
  const { bookDir, config, dryRun } = state;
  
  console.log('\n📄 Step 1: Converting TeX to HTML...');
  
  const sourceFile = path.join(bookDir, 'source', config.sourceFile);
  const xmlOutput = path.join(bookDir, 'converted', 'book.xml');
  const htmlOutput = path.join(bookDir, 'converted', 'book.html');
  
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Source file not found: ${sourceFile}`);
  }
  
  if (dryRun) {
    console.log(`  [DRY RUN] Would convert ${sourceFile} -> ${htmlOutput}`);
    return;
  }
  
  // Check if already converted
  if (fs.existsSync(htmlOutput)) {
    console.log(`  HTML already exists: ${htmlOutput}`);
    const stats = fs.statSync(htmlOutput);
    console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    return;
  }
  
  // Step 1a: TeX -> XML
  console.log('  Running latexml...');
  try {
    execSync(`latexml --destination="${xmlOutput}" "${sourceFile}"`, {
      cwd: path.join(bookDir, 'source'),
      stdio: ['inherit', 'pipe', 'pipe'],
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
    });
  } catch (err: any) {
    // LaTeXML often has warnings but still produces output
    if (!fs.existsSync(xmlOutput)) {
      throw new Error(`LaTeXML failed: ${err.message}`);
    }
    console.log('  LaTeXML completed with warnings (check logs)');
  }
  
  // Step 1b: XML -> HTML with MathJax
  console.log('  Running latexmlpost...');
  try {
    execSync(
      `latexmlpost --destination="${htmlOutput}" --format=html5 ` +
      `--javascript='https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js' ` +
      `--navigationtoc=context "${xmlOutput}"`,
      {
        cwd: path.join(bookDir, 'converted'),
        stdio: ['inherit', 'pipe', 'pipe'],
        maxBuffer: 50 * 1024 * 1024
      }
    );
  } catch (err: any) {
    if (!fs.existsSync(htmlOutput)) {
      throw new Error(`latexmlpost failed: ${err.message}`);
    }
    console.log('  latexmlpost completed with warnings');
  }
  
  const stats = fs.statSync(htmlOutput);
  console.log(`  ✓ Generated ${htmlOutput} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

// ============================================================================
// Step 2: Split into Chapters
// ============================================================================

async function splitIntoChapters(state: ProcessingState): Promise<ChapterInfo[]> {
  const { bookDir, config, dryRun } = state;
  
  console.log('\n📚 Step 2: Splitting into chapters...');
  
  const htmlPath = path.join(bookDir, 'converted', 'book.html');
  const chaptersDir = path.join(bookDir, 'chapters');
  
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`HTML file not found: ${htmlPath}\nRun conversion step first.`);
  }
  
  const html = fs.readFileSync(htmlPath, 'utf-8');
  
  // Extract <head> for reuse
  const headMatch = html.match(/<head[^>]*>[\s\S]*?<\/head>/i);
  const head = headMatch ? headMatch[0] : '<head><meta charset="UTF-8"></head>';
  
  // Find chapter boundaries using configurable pattern
  const chapters = findChapterBoundaries(html, config);
  
  if (chapters.length === 0) {
    console.log('  ⚠️  No chapters found, treating entire document as single chapter');
    chapters.push({
      number: 1,
      title: config.title,
      startIndex: html.indexOf('<body'),
      endIndex: html.indexOf('</body>')
    });
  }
  
  console.log(`  Found ${chapters.length} chapters`);
  
  const chapterInfos: ChapterInfo[] = [];
  
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const nextChapter = chapters[i + 1];
    
    const content = html.substring(
      chapter.startIndex,
      nextChapter?.startIndex || html.indexOf('</body>')
    );
    
    const filename = `chapter-${chapter.number.toString().padStart(2, '0')}.html`;
    const filepath = path.join(chaptersDir, filename);
    
    if (!dryRun) {
      const chapterHtml = createStandaloneChapter(head, content, chapter.title);
      fs.writeFileSync(filepath, chapterHtml);
    }
    
    chapterInfos.push({
      number: chapter.number,
      title: chapter.title,
      filename,
      htmlFile: filepath
    });
    
    console.log(`  ${dryRun ? '[DRY RUN] ' : ''}Chapter ${chapter.number}: ${chapter.title}`);
  }
  
  // Save manifest
  const manifest = {
    bookSlug: config.slug,
    title: config.title,
    author: config.author,
    chapters: chapterInfos.map(c => ({
      number: c.number,
      title: c.title,
      filename: c.filename
    })),
    generatedAt: new Date().toISOString()
  };
  
  if (!dryRun) {
    fs.writeFileSync(
      path.join(bookDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
  }
  
  console.log(`  ✓ Generated ${chapters.length} chapter files`);
  
  return chapterInfos;
}

interface ChapterBoundary {
  number: number;
  title: string;
  startIndex: number;
  endIndex?: number;
}

function findChapterBoundaries(html: string, config: BookConfig): ChapterBoundary[] {
  const boundaries: ChapterBoundary[] = [];
  
  // Default patterns for LaTeXML output
  const sectionPattern = /<section id="([^"]+)"[^>]*>/g;
  const titlePatterns = [
    /<h2 class="ltx_title[^"]*"[^>]*>(CHAPTER\s+[IVXLC]+\.?)[^<]*<\/h2>/i,
    /<h2 class="ltx_title[^"]*"[^>]*>(PREFACE[^<]*)<\/h2>/i,
    /<h2 class="ltx_title[^"]*"[^>]*>(PROLOGUE[^<]*)<\/h2>/i,
    /<h2 class="ltx_title[^"]*"[^>]*>(EPILOGUE[^<]*)<\/h2>/i,
    /<h2 class="ltx_title[^"]*"[^>]*>(INTRODUCTION[^<]*)<\/h2>/i,
    /<h2 class="ltx_title[^"]*"[^>]*>(APPENDIX[^<]*)<\/h2>/i,
  ];
  
  let match;
  while ((match = sectionPattern.exec(html)) !== null) {
    const sectionStart = match.index;
    const searchArea = html.substring(sectionStart, sectionStart + 1000);
    
    for (const pattern of titlePatterns) {
      const titleMatch = searchArea.match(pattern);
      if (titleMatch) {
        const rawTitle = titleMatch[1].replace(/\.?$/, '').trim();
        
        // Get full title from config - try multiple key formats
        const titleKey = rawTitle.toUpperCase();
        const fullTitle = config.chapterTitles?.[rawTitle] || 
                         config.chapterTitles?.[titleKey] ||
                         config.chapterTitles?.[rawTitle.replace(/\s+/g, ' ')] ||
                         rawTitle;
        
        boundaries.push({
          number: -1, // Will be assigned later
          title: fullTitle,
          startIndex: sectionStart
        });
        break;
      }
    }
  }
  
  // Sort by position in document
  boundaries.sort((a, b) => a.startIndex - b.startIndex);
  
  // Assign chapter numbers sequentially
  // Front matter (preface, prologue, etc.) gets negative numbers or 0
  // Main chapters get 1, 2, 3...
  // Back matter (epilogue, appendix) gets numbers after main chapters
  let mainChapterCount = 0;
  let frontMatterCount = 0;
  
  for (const b of boundaries) {
    const upperTitle = b.title.toUpperCase();
    const isChapter = upperTitle.includes('CHAPTER') || /^[IVXLC]+\./.test(upperTitle);
    const isFrontMatter = upperTitle.includes('PREFACE') || 
                          upperTitle.includes('PROLOGUE') || 
                          upperTitle.includes('INTRODUCTION') ||
                          upperTitle.includes('FOREWORD');
    const isBackMatter = upperTitle.includes('EPILOGUE') || 
                         upperTitle.includes('APPENDIX') ||
                         upperTitle.includes('INDEX') ||
                         upperTitle.includes('BIBLIOGRAPHY');
    
    if (isChapter) {
      // Extract Roman numeral if present
      const romanMatch = upperTitle.match(/CHAPTER\s+([IVXLC]+)/i) || upperTitle.match(/^([IVXLC]+)\./);
      if (romanMatch) {
        b.number = romanToInt(romanMatch[1]);
      } else {
        mainChapterCount++;
        b.number = mainChapterCount;
      }
    } else if (isFrontMatter) {
      b.number = frontMatterCount;
      frontMatterCount++;
    } else if (isBackMatter) {
      b.number = 90 + boundaries.filter(x => x.number >= 90).length;
    } else {
      mainChapterCount++;
      b.number = mainChapterCount;
    }
  }
  
  return boundaries;
}

function createStandaloneChapter(head: string, content: string, title: string): string {
  const enhancedHead = head.replace('</head>', `
  <style>
    body {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
    }
    .ltx_page_content { padding: 0; }
    img { max-width: 100%; height: auto; }
    .ltx_equation { overflow-x: auto; }
    pre { background: #f5f5f5; padding: 1rem; overflow-x: auto; }
  </style>
  </head>`);
  
  return `<!DOCTYPE html>
<html lang="en">
${enhancedHead}
<body>
<article class="ltx_document">
${content}
</article>
</body>
</html>`;
}

function romanToInt(roman: string): number {
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const curr = values[roman[i]] || 0;
    const next = values[roman[i + 1]] || 0;
    result += curr < next ? -curr : curr;
  }
  return result;
}

// ============================================================================
// Step 3: Create Knowledge Base Chunks
// ============================================================================

async function createChunks(state: ProcessingState): Promise<void> {
  const { bookDir, config, dryRun } = state;
  
  console.log('\n🧩 Step 3: Creating knowledge base chunks from LaTeX source...');
  
  const sourceFile = path.join(bookDir, 'source', config.sourceFile);
  const chunksDir = path.join(bookDir, 'chunks');
  
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Source file not found: ${sourceFile}`);
  }
  
  const latex = fs.readFileSync(sourceFile, 'utf-8');
  
  // Extract semantic chunks from LaTeX
  const chunks = extractLatexChunks(latex, config.slug);
  
  if (!dryRun) {
    // Clear existing chunks
    if (fs.existsSync(chunksDir)) {
      fs.rmSync(chunksDir, { recursive: true });
    }
    fs.mkdirSync(chunksDir, { recursive: true });
    
    // Save each chunk as a separate .txt file with raw LaTeX
    // This is the format Bedrock Knowledge Base expects
    for (const chunk of chunks) {
      const filename = `${chunk.id}.txt`;
      const filepath = path.join(chunksDir, filename);
      
      // Write raw LaTeX content - Claude understands this natively
      fs.writeFileSync(filepath, chunk.latexContent);
    }
    
    // Also save a manifest for reference
    const manifest = {
      bookSlug: config.slug,
      totalChunks: chunks.length,
      chunksByType: chunks.reduce((acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      generatedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(chunksDir, '_manifest.json'), JSON.stringify(manifest, null, 2));
  }
  
  // Print stats
  const byType = chunks.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`  ✓ Created ${chunks.length} LaTeX chunks`);
  console.log(`    By type: ${Object.entries(byType).map(([t, n]) => `${t}:${n}`).join(', ')}`);
}

/**
 * Semantic chunk types found in LaTeX
 */
type ChunkType = 
  | 'theorem' | 'definition' | 'example' | 'proof' | 'lemma' 
  | 'corollary' | 'proposition' | 'remark' | 'section' | 'paragraph' | 'equation';

interface LatexChunk {
  id: string;
  bookSlug: string;
  chapterNumber: number;
  type: ChunkType;
  title?: string;
  latexContent: string;
  order: number;
}

/**
 * Extract semantic chunks from LaTeX content
 */
function extractLatexChunks(latex: string, bookSlug: string): LatexChunk[] {
  const chunks: LatexChunk[] = [];
  let chunkOrder = 0;
  
  // LaTeX environment patterns for semantic extraction
  const environments: { pattern: RegExp; type: ChunkType }[] = [
    { pattern: /\\begin\{theorem\}([\s\S]*?)\\end\{theorem\}/g, type: 'theorem' },
    { pattern: /\\begin\{definition\}([\s\S]*?)\\end\{definition\}/g, type: 'definition' },
    { pattern: /\\begin\{example\}([\s\S]*?)\\end\{example\}/g, type: 'example' },
    { pattern: /\\begin\{proof\}([\s\S]*?)\\end\{proof\}/g, type: 'proof' },
    { pattern: /\\begin\{lemma\}([\s\S]*?)\\end\{lemma\}/g, type: 'lemma' },
    { pattern: /\\begin\{corollary\}([\s\S]*?)\\end\{corollary\}/g, type: 'corollary' },
    { pattern: /\\begin\{proposition\}([\s\S]*?)\\end\{proposition\}/g, type: 'proposition' },
    { pattern: /\\begin\{remark\}([\s\S]*?)\\end\{remark\}/g, type: 'remark' },
    { pattern: /\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, type: 'equation' },
    { pattern: /\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, type: 'equation' },
  ];
  
  const usedRanges: Array<[number, number]> = [];
  
  // First pass: find all chapter boundaries
  // Support both standard \chapter and custom \Chapter commands
  const chapterPatterns = [
    /\\chapter\*?\{([^}]+)\}/g,
    /\\Chapter\{([IVXLC]+)\}\{([^}]+)\}/g,  // \Chapter{I}{Title}
    /\\Chapter\[[^\]]*\]\s*\{([IVXLC]+)\}\{([^}]+)\}/g,  // \Chapter[Running Head]{I}{Title}
    /\\ChapterStar\{([^}]+)\}/g,  // \ChapterStar{Title}
  ];
  
  const chapterPositions: Array<{ title: string; position: number; number: number }> = [];
  
  for (const pattern of chapterPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(latex)) !== null) {
      let title: string;
      let chapterNum: number;
      
      if (match[2]) {
        // \Chapter{I}{Title} format - extract Roman numeral
        const roman = match[1];
        chapterNum = romanToInt(roman);
        title = match[2];
      } else {
        // Standard format or \ChapterStar
        title = match[1];
        // Try to extract chapter number from title
        const numMatch = title.match(/^([IVXLC]+)\./);
        if (numMatch) {
          chapterNum = romanToInt(numMatch[1]);
        } else {
          chapterNum = chapterPositions.length + 1;
        }
      }
      
      // Avoid duplicates
      const exists = chapterPositions.some(p => Math.abs(p.position - match!.index) < 50);
      if (!exists) {
        chapterPositions.push({
          title,
          position: match.index,
          number: chapterNum
        });
      }
    }
  }
  
  // Sort by position
  chapterPositions.sort((a, b) => a.position - b.position);
  
  // Re-number sequentially if needed
  for (let i = 0; i < chapterPositions.length; i++) {
    if (chapterPositions[i].number === 0 || i === 0) {
      chapterPositions[i].number = i + 1;
    }
  }
  
  console.log(`    Found ${chapterPositions.length} chapters in LaTeX source`);
  
  // Helper to get chapter number for a position
  const getChapterForPosition = (pos: number): number => {
    for (let i = chapterPositions.length - 1; i >= 0; i--) {
      if (pos >= chapterPositions[i].position) {
        return chapterPositions[i].number;
      }
    }
    return 0;
  };
  
  // Extract environment-based chunks
  for (const { pattern, type } of environments) {
    pattern.lastIndex = 0;
    let match;
    
    while ((match = pattern.exec(latex)) !== null) {
      const startIndex = match.index;
      const endIndex = match.index + match[0].length;
      
      // Skip content before first chapter (preamble/macros)
      if (chapterPositions.length > 0 && startIndex < chapterPositions[0].position) {
        continue;
      }
      
      // Check for overlap with existing chunks
      const overlaps = usedRanges.some(
        ([start, end]) => (startIndex >= start && startIndex < end) || (endIndex > start && endIndex <= end)
      );
      
      if (!overlaps && match[0].length >= 50 && match[0].length <= 3000) {
        const chapterNum = getChapterForPosition(startIndex);
        
        chunks.push({
          id: `${bookSlug}-ch${chapterNum}-${type}-${chunkOrder}`,
          bookSlug,
          chapterNumber: chapterNum,
          type,
          latexContent: match[0],
          order: chunkOrder++
        });
        
        usedRanges.push([startIndex, endIndex]);
      }
    }
  }
  
  // Extract section-based chunks - support custom \Section commands too
  const sectionPatterns = [
    /\\(section|subsection)\*?\{([^}]+)\}([\s\S]*?)(?=\\(section|subsection|chapter|Chapter|Section)\*?\{|\\end\{document\}|$)/g,
    /\\Section\{([^}]+)\}([\s\S]*?)(?=\\Section|\\Chapter|\\end\{document\}|$)/g,
  ];
  
  for (const sectionPattern of sectionPatterns) {
    sectionPattern.lastIndex = 0;
    let sectionMatch;
    
    while ((sectionMatch = sectionPattern.exec(latex)) !== null) {
      const sectionTitle = sectionMatch[2] || sectionMatch[1];
      const startIndex = sectionMatch.index;
      const fullMatch = sectionMatch[0];
      
      // Skip preamble content
      if (chapterPositions.length > 0 && startIndex < chapterPositions[0].position) {
        continue;
      }
      
      // Skip if too short or already covered
      if (fullMatch.length < 100) continue;
      
      const overlaps = usedRanges.some(
        ([start, end]) => (startIndex >= start && startIndex < end)
      );
      
      if (!overlaps) {
        const chapterNum = getChapterForPosition(startIndex);
        
        // If section is large, split into paragraphs
        if (fullMatch.length > 2000) {
          const paragraphs = splitIntoParagraphs(fullMatch, 1500);
          for (let i = 0; i < paragraphs.length; i++) {
            if (paragraphs[i].length >= 100) {
              chunks.push({
                id: `${bookSlug}-ch${chapterNum}-section-${chunkOrder}`,
                bookSlug,
                chapterNumber: chapterNum,
                type: 'section',
                title: sectionTitle,
                latexContent: paragraphs[i],
                order: chunkOrder++
              });
            }
          }
        } else {
          chunks.push({
            id: `${bookSlug}-ch${chapterNum}-section-${chunkOrder}`,
            bookSlug,
            chapterNumber: chapterNum,
            type: 'section',
            title: sectionTitle,
            latexContent: fullMatch,
            order: chunkOrder++
          });
        }
        
        usedRanges.push([startIndex, startIndex + fullMatch.length]);
      }
    }
  }
  
  // Sort by order
  chunks.sort((a, b) => a.order - b.order);
  
  return chunks;
}

/**
 * Split large text into paragraph-sized chunks
 */
function splitIntoParagraphs(text: string, maxSize: number): string[] {
  const paragraphs: string[] = [];
  
  // Split on double newlines (paragraph boundaries in LaTeX)
  const parts = text.split(/\n\n+/);
  let current = '';
  
  for (const part of parts) {
    if (current.length + part.length > maxSize && current.length > 0) {
      paragraphs.push(current.trim());
      current = part;
    } else {
      current += (current ? '\n\n' : '') + part;
    }
  }
  
  if (current.trim().length > 0) {
    paragraphs.push(current.trim());
  }
  
  return paragraphs;
}

// ============================================================================
// Step 4: Upload to AWS
// ============================================================================

async function uploadToAws(state: ProcessingState): Promise<void> {
  const { bookDir, config, dryRun } = state;
  
  console.log('\n☁️  Step 4: Uploading to AWS...');
  
  if (dryRun) {
    console.log('  [DRY RUN] Would upload to S3 and DynamoDB');
    return;
  }
  
  const s3 = new S3Client({ region: AWS_REGION });
  const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: AWS_REGION }));
  
  const bookId = uuidv4();
  const manifestPath = path.join(bookDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  
  // Upload chapter HTML files to S3
  console.log('  Uploading chapters to S3...');
  const chaptersDir = path.join(bookDir, 'chapters');
  
  for (const chapter of manifest.chapters) {
    const htmlPath = path.join(chaptersDir, chapter.filename);
    const s3Key = `books/${config.slug}/chapters/${chapter.filename}`;
    
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: fs.readFileSync(htmlPath),
      ContentType: 'text/html'
    }));
    
    console.log(`    ✓ ${chapter.filename}`);
  }
  
  // Upload images to S3
  const imagesDir = path.join(bookDir, 'source', 'images');
  if (fs.existsSync(imagesDir)) {
    console.log('  Uploading images to S3...');
    const images = fs.readdirSync(imagesDir);
    
    for (const img of images) {
      const imgPath = path.join(imagesDir, img);
      const s3Key = `books/${config.slug}/images/${img}`;
      
      const contentType = img.endsWith('.png') ? 'image/png' :
                         img.endsWith('.jpg') || img.endsWith('.jpeg') ? 'image/jpeg' :
                         img.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
      
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: fs.readFileSync(imgPath),
        ContentType: contentType
      }));
    }
    console.log(`    ✓ ${images.length} images`);
  }
  
  // Upload LaTeX chunks to knowledge-base/ prefix for Bedrock KB ingestion
  // These are .txt files containing raw LaTeX that Claude understands natively
  console.log('  Uploading LaTeX chunks for Knowledge Base...');
  const chunksDir = path.join(bookDir, 'chunks');
  
  if (fs.existsSync(chunksDir)) {
    const chunkFiles = fs.readdirSync(chunksDir).filter(f => f.endsWith('.txt'));
    
    for (const file of chunkFiles) {
      const s3Key = `knowledge-base/${config.slug}/${file}`;
      
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: fs.readFileSync(path.join(chunksDir, file)),
        ContentType: 'text/plain'
      }));
    }
    console.log(`    ✓ ${chunkFiles.length} LaTeX chunks for KB`);
  } else {
    console.log('    ⚠️  No chunks directory found - run chunk step first');
  }
  
  // Create DynamoDB entries for book and chapters
  console.log('  Creating DynamoDB entries...');
  
  // Book metadata entry
  await dynamodb.send(new PutCommand({
    TableName: DYNAMODB_TABLE,
    Item: {
      PK: `BOOK#${bookId}`,
      SK: 'METADATA',
      bookId,
      slug: config.slug,
      title: config.title,
      author: config.author,
      totalChapters: manifest.chapters.length,
      sourceType: config.sourceType,
      createdAt: new Date().toISOString(),
      status: 'ready'
    }
  }));
  
  // Chapter entries
  for (const chapter of manifest.chapters) {
    await dynamodb.send(new PutCommand({
      TableName: DYNAMODB_TABLE,
      Item: {
        PK: `BOOK#${bookId}`,
        SK: `CHAPTER#${chapter.number.toString().padStart(3, '0')}`,
        bookId,
        chapterNumber: chapter.number,
        title: chapter.title,
        s3Key: `books/${config.slug}/chapters/${chapter.filename}`,
        createdAt: new Date().toISOString()
      }
    }));
  }
  
  console.log(`  ✓ Created book entry: ${bookId}`);
  console.log(`  ✓ Created ${manifest.chapters.length} chapter entries`);
  
  // Save book ID to manifest
  manifest.bookId = bookId;
  manifest.uploadedAt = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

// ============================================================================
// Main CLI
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
📖 QuickBook - Book Processing Pipeline

Usage:
  npx tsx process-book.ts <command> [options]

Commands:
  init <slug>              Initialize a new book directory
  process <slug>           Run full processing pipeline
  convert <slug>           Convert TeX to HTML only
  split <slug>             Split HTML into chapters only
  chunk <slug>             Create KB chunks only  
  upload <slug>            Upload to AWS only
  status <slug>            Show book processing status

Options:
  --dry-run               Preview actions without executing
  --step=<n>              Start from specific step (1-4)

Examples:
  npx tsx process-book.ts init calculus-made-easy
  npx tsx process-book.ts process calculus-made-easy
  npx tsx process-book.ts process calculus-made-easy --dry-run
`);
    return;
  }
  
  const command = args[0];
  const slug = args[1];
  const dryRun = args.includes('--dry-run');
  
  if (command === 'init') {
    if (!slug) {
      console.error('Usage: npx tsx process-book.ts init <slug>');
      process.exit(1);
    }
    
    const bookDir = initBookDirectory(slug);
    
    // Create template config
    const config: BookConfig = {
      slug,
      title: 'Book Title',
      author: 'Author Name',
      sourceType: 'tex',
      sourceFile: 'book.tex',
      chapterTitles: {}
    };
    
    saveBookConfig(bookDir, config);
    
    console.log(`
✅ Initialized book directory: ${bookDir}

Next steps:
1. Edit ${path.join(bookDir, 'book.json')} with book metadata
2. Copy source files to ${path.join(bookDir, 'source/')}
3. Copy images to ${path.join(bookDir, 'source/images/')}
4. Run: npx tsx process-book.ts process ${slug}
`);
    return;
  }
  
  if (command === 'status') {
    if (!slug) {
      // List all books
      if (!fs.existsSync(BOOKS_DIR)) {
        console.log('No books directory found.');
        return;
      }
      
      const books = fs.readdirSync(BOOKS_DIR).filter(f => 
        fs.statSync(path.join(BOOKS_DIR, f)).isDirectory()
      );
      
      console.log('\n📚 Books:');
      for (const book of books) {
        const configPath = path.join(BOOKS_DIR, book, 'book.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          console.log(`  ${book}: ${config.title} by ${config.author}`);
        } else {
          console.log(`  ${book}: (no config)`);
        }
      }
      return;
    }
    
    const bookDir = getBookDir(slug);
    if (!fs.existsSync(bookDir)) {
      console.error(`Book not found: ${slug}`);
      process.exit(1);
    }
    
    const config = loadBookConfig(bookDir);
    console.log(`\n📖 ${config.title} by ${config.author}`);
    console.log(`   Slug: ${config.slug}`);
    console.log(`   Source: ${config.sourceType}`);
    
    const checks = [
      { name: 'Source file', path: path.join(bookDir, 'source', config.sourceFile) },
      { name: 'Converted HTML', path: path.join(bookDir, 'converted', 'book.html') },
      { name: 'Manifest', path: path.join(bookDir, 'manifest.json') },
    ];
    
    console.log('\n   Status:');
    for (const check of checks) {
      const exists = fs.existsSync(check.path);
      console.log(`   ${exists ? '✓' : '○'} ${check.name}`);
    }
    
    const chaptersDir = path.join(bookDir, 'chapters');
    if (fs.existsSync(chaptersDir)) {
      const chapters = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.html'));
      console.log(`   ✓ ${chapters.length} chapters`);
    }
    
    const chunksDir = path.join(bookDir, 'chunks');
    if (fs.existsSync(chunksDir)) {
      const chunks = fs.readdirSync(chunksDir).filter(f => f.endsWith('.txt'));
      console.log(`   ✓ ${chunks.length} LaTeX chunks`);
    }
    
    return;
  }
  
  // All other commands need a slug
  if (!slug) {
    console.error(`Usage: npx tsx process-book.ts ${command} <slug>`);
    process.exit(1);
  }
  
  const bookDir = getBookDir(slug);
  
  if (!fs.existsSync(bookDir)) {
    console.error(`Book not found: ${slug}`);
    console.error(`Run 'npx tsx process-book.ts init ${slug}' first.`);
    process.exit(1);
  }
  
  const config = loadBookConfig(bookDir);
  const state: ProcessingState = { bookDir, config, dryRun };
  
  console.log(`\n📖 Processing: ${config.title}`);
  console.log(`   Author: ${config.author}`);
  console.log(`   Source: ${config.sourceType}`);
  if (dryRun) console.log('   Mode: DRY RUN');
  
  try {
    switch (command) {
      case 'convert':
        await convertTexToHtml(state);
        break;
        
      case 'split':
        await splitIntoChapters(state);
        break;
        
      case 'chunk':
        await createChunks(state);
        break;
        
      case 'upload':
        await uploadToAws(state);
        break;
        
      case 'process':
        await convertTexToHtml(state);
        await splitIntoChapters(state);
        await createChunks(state);
        await uploadToAws(state);
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
    
    console.log('\n✅ Done!');
  } catch (err) {
    console.error('\n❌ Error:', err);
    process.exit(1);
  }
}

main();
