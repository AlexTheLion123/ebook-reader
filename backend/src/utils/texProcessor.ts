import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getObject, putObject } from './s3';
import { putItem, updateItem } from './dynamodb';
import { JSDOM } from 'jsdom';

interface ProcessTexResult {
  chaptersProcessed: number;
}

/**
 * Extract plain text and preserve LaTeX math notation from HTML
 * Converts MathML back to LaTeX for AI processing
 */
function extractTextWithLatex(html: string): string {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  
  // Replace math elements with LaTeX notation
  const mathElements = doc.querySelectorAll('math');
  mathElements.forEach(math => {
    const latex = convertMathMLToLatex(math);
    const textNode = doc.createTextNode(`$${latex}$`);
    math.replaceWith(textNode);
  });
  
  // Extract text content
  let text = doc.body.textContent || '';
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Convert MathML to LaTeX notation (simplified)
 * For full conversion, consider using mathjax-node or similar
 */
function convertMathMLToLatex(mathElement: Element): string {
  // This is a simplified converter - for production use a proper MathML->LaTeX library
  const text = mathElement.textContent || '';
  
  // Check for common MathML elements and convert
  if (mathElement.querySelector('mfrac')) {
    const numerator = mathElement.querySelector('mfrac > :first-child')?.textContent || '';
    const denominator = mathElement.querySelector('mfrac > :last-child')?.textContent || '';
    return `\\frac{${numerator}}{${denominator}}`;
  }
  
  if (mathElement.querySelector('msup')) {
    const base = mathElement.querySelector('msup > :first-child')?.textContent || '';
    const exp = mathElement.querySelector('msup > :last-child')?.textContent || '';
    return `${base}^{${exp}}`;
  }
  
  if (mathElement.querySelector('msub')) {
    const base = mathElement.querySelector('msub > :first-child')?.textContent || '';
    const sub = mathElement.querySelector('msub > :last-child')?.textContent || '';
    return `${base}_{${sub}}`;
  }
  
  // Fallback: return text content
  return text;
}

/**
 * Parse LaTeX document structure to identify chapters
 */
function parseTexStructure(texContent: string): Array<{ title: string; level: number; line: number }> {
  const chapters: Array<{ title: string; level: number; line: number }> = [];
  const lines = texContent.split('\n');
  
  lines.forEach((line, index) => {
    // Match \chapter{Title}
    const chapterMatch = line.match(/\\chapter\{([^}]+)\}/);
    if (chapterMatch) {
      chapters.push({ title: chapterMatch[1], level: 0, line: index });
      return;
    }
    
    // Match \section{Title}
    const sectionMatch = line.match(/\\section\{([^}]+)\}/);
    if (sectionMatch) {
      chapters.push({ title: sectionMatch[1], level: 1, line: index });
      return;
    }
  });
  
  return chapters;
}

/**
 * Process TeX/LaTeX file and store in S3 + DynamoDB
 */
export async function processTexAndStore(
  bucket: string,
  s3Key: string,
  bookId: string,
  tableName: string
): Promise<ProcessTexResult> {
  try {
    console.log(`Starting TeX processing for ${bookId}`);

    // Update status to processing
    await updateItem(
      tableName,
      { PK: `book#${bookId}`, SK: 'metadata' },
      'SET processingStatus = :status, processingStartedAt = :time',
      { ':status': 'processing', ':time': Date.now() }
    );

    // Download TeX file from S3
    console.log('Downloading TeX file from S3...');
    const texBuffer = await getObject(bucket, s3Key);
    const texContent = texBuffer.toString('utf-8');
    
    const tempDir = path.join('/tmp', bookId);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const texFilePath = path.join(tempDir, 'main.tex');
    fs.writeFileSync(texFilePath, texContent);
    console.log('TeX file written to temp directory');

    // Extract metadata from TeX preamble
    const titleMatch = texContent.match(/\\title\{([^}]+)\}/);
    const authorMatch = texContent.match(/\\author\{([^}]+)\}/);
    
    const title = titleMatch ? titleMatch[1] : 'Unknown Title';
    const author = authorMatch ? authorMatch[1] : 'Unknown Author';

    // Update Book Metadata
    await updateItem(
      tableName,
      { PK: `book#${bookId}`, SK: 'metadata' },
      'SET title = :title, author = :author, #language = :language, processingStatus = :status, sourceFormat = :format',
      {
        ':title': title,
        ':author': author,
        ':language': 'en',
        ':status': 'processing_chapters',
        ':format': 'tex'
      },
      { '#language': 'language' }
    );

    // Convert TeX to HTML5 + MathML using LaTeXML
    console.log('Converting TeX to HTML with LaTeXML...');
    const outputHtml = path.join(tempDir, 'output.html');
    
    try {
      // Run LaTeXML conversion
      execSync(
        `latexml --dest=${tempDir}/output.xml ${texFilePath} && ` +
        `latexmlpost --dest=${outputHtml} --format=html5 --mathml ${tempDir}/output.xml`,
        { cwd: tempDir, stdio: 'pipe' }
      );
    } catch (error) {
      console.error('LaTeXML conversion failed:', error);
      throw new Error('Failed to convert TeX to HTML');
    }

    // Read the converted HTML
    const fullHtml = fs.readFileSync(outputHtml, 'utf-8');
    
    // Parse chapter structure from original TeX
    const structure = parseTexStructure(texContent);
    console.log(`Found ${structure.length} chapters/sections`);

    // If no explicit chapters, treat entire document as one chapter
    if (structure.length === 0) {
      structure.push({ title: title, level: 0, line: 0 });
    }

    // Process chapters
    let chaptersProcessed = 0;
    const dom = new JSDOM(fullHtml);
    const doc = dom.window.document;
    
    // Find all section elements in the HTML output
    const sections = doc.querySelectorAll('section, div.chapter, div.section');
    
    for (let i = 0; i < Math.min(structure.length, sections.length || 1); i++) {
      const chapterNumber = i + 1;
      const chapterInfo = structure[i];
      const sectionElement = sections[i] || doc.body;
      
      const chapterHtml = sectionElement.outerHTML || fullHtml;
      const chapterId = `chapter-${chapterNumber}`;
      
      // Store HTML + MathML in S3 for rendering
      const chapterS3Key = `books/${bookId}/chapters/${chapterId}.html`;
      await putObject(bucket, chapterS3Key, chapterHtml, 'text/html');
      
      // Extract text with LaTeX for AI processing
      const textWithLatex = extractTextWithLatex(chapterHtml);
      
      // Store chapter metadata in DynamoDB
      await putItem(tableName, {
        PK: `book#${bookId}`,
        SK: `chapter#${chapterNumber}`,
        type: 'content',
        chapterId: chapterId,
        title: chapterInfo.title,
        order: chapterNumber,
        s3Key: chapterS3Key,
        textContent: textWithLatex.substring(0, 50000), // Store first 50K chars for AI
        sourceFormat: 'tex'
      });
      
      chaptersProcessed++;
    }
    
    console.log(`Processed ${chaptersProcessed} chapters`);

    // Cleanup
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Update status to success
    await updateItem(
      tableName,
      { PK: `book#${bookId}`, SK: 'metadata' },
      'SET processingStatus = :status, processingCompletedAt = :time, chaptersProcessed = :cp',
      {
        ':status': 'success',
        ':time': Date.now(),
        ':cp': chaptersProcessed
      }
    );

    return { chaptersProcessed };

  } catch (error) {
    console.error('TeX Processing Error:', error);
    
    // Update status to failed
    await updateItem(
      tableName,
      { PK: `book#${bookId}`, SK: 'metadata' },
      'SET processingStatus = :status, #error = :error',
      { ':status': 'failed', ':error': String(error) },
      { '#error': 'error' }
    );
    
    throw error;
  }
}
