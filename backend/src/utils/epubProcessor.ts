import { initEpubFile } from '@lingo-reader/epub-parser';
import * as fs from 'fs';
import * as path from 'path';
import { getObject, putObject } from './s3';
import { putItem, updateItem } from './dynamodb';

interface ProcessEpubResult {
  chaptersProcessed: number;
}

export async function processEpubAndStore(
  bucket: string,
  s3Key: string,
  bookId: string,
  tableName: string
): Promise<ProcessEpubResult> {
  try {
    console.log(`Starting EPUB processing for ${bookId}`);

    // Update status to processing
    await updateItem(
      tableName,
      { PK: `book#${bookId}`, SK: 'metadata' },
      'SET processingStatus = :status, processingStartedAt = :time',
      { ':status': 'processing', ':time': Date.now() }
    );

    // Download EPUB from S3
    console.log('Downloading EPUB from S3...');
    const epubBuffer = await getObject(bucket, s3Key);
    const tempFilePath = path.join('/tmp', `${bookId}.epub`);
    fs.writeFileSync(tempFilePath, epubBuffer);
    console.log('EPUB downloaded to temp file');

    // Parse EPUB
    console.log('Parsing EPUB...');
    // We can specify a directory for images, though we aren't uploading them yet.
    // This prevents the parser from cluttering the root /tmp or failing.
    const imageDir = path.join('/tmp', bookId, 'images');
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }
    
    const epub = await initEpubFile(tempFilePath, imageDir);

    // Extract Metadata
    const metadata = epub.getMetadata();
    console.log('Metadata extracted:', metadata);
    
    // Helper to extract author name from Contributor[] or string
    const getAuthor = (creators: any): string => {
      if (Array.isArray(creators) && creators.length > 0) {
        return creators[0].contributor || 'Unknown Author';
      }
      return 'Unknown Author';
    };

    // Update Book Metadata
    await updateItem(
      tableName,
      { PK: `book#${bookId}`, SK: 'metadata' },
      'SET title = :title, author = :author, publisher = :publisher, #language = :language, processingStatus = :status',
      {
        ':title': metadata.title || 'Unknown Title',
        ':author': getAuthor(metadata.creator),
        ':publisher': metadata.publisher || '',
        ':language': metadata.language || 'en',
        ':status': 'processing_chapters'
      },
      { '#language': 'language' }
    );

    // Process Chapters
    console.log('Processing chapters...');
    let chaptersProcessed = 0;
    const spine = epub.getSpine();
    const toc = epub.getToc();
    
    console.log(`Found ${spine.length} spine items and ${toc.length} TOC entries`);
    
    // Create a map of spine IDs to TOC entries for proper chapter titles and filtering
    const tocMap = new Map();
    toc.forEach(tocEntry => {
      // Find matching spine item by checking if the href matches
      const matchingSpine = spine.find(s => {
        // Remove the epub: prefix and compare
        const tocHref = tocEntry.href?.replace('epub:', '') || '';
        const spineHref = s.href?.replace('epub:', '') || '';
        return tocHref.includes(spineHref) || spineHref.includes(tocHref);
      });
      if (matchingSpine) {
        tocMap.set(matchingSpine.id, {
          label: tocEntry.label,
          playOrder: tocEntry.playOrder
        });
      }
    });

    console.log(`Mapped ${tocMap.size} spine items to TOC entries`);

    // Process only spine items that are in the TOC (skip cover, htmltoc, etc.)
    let chapterNumber = 0;
    for (let i = 0; i < spine.length; i++) {
      const item = spine[i];
      const chapterId = item.id;
      
      // Skip items not in TOC (like cover pages, htmltoc, etc.)
      if (!tocMap.has(chapterId)) {
        console.log(`Skipping non-chapter spine item: ${chapterId} (${item.href})`);
        continue;
      }

      chapterNumber++;
      const tocInfo = tocMap.get(chapterId);
      
      // Get chapter content
      const { html } = await epub.loadChapter(chapterId);

      // Store content in S3
      const chapterS3Key = `books/${bookId}/chapters/${chapterId}.html`;
      await putObject(bucket, chapterS3Key, html, 'text/html');

      await putItem(tableName, {
        PK: `book#${bookId}`,
        SK: `chapter#${chapterNumber}`,
        type: 'content',
        chapterId: chapterId,
        title: tocInfo?.label || `Chapter ${chapterNumber}`,
        order: chapterNumber,
        s3Key: chapterS3Key, 
        href: item.href
      });
      
      chaptersProcessed++;
    }
    console.log(`Processed ${chaptersProcessed} chapters`);

    // Cleanup
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    // Cleanup images dir if created
    if (fs.existsSync(imageDir)) {
      fs.rmSync(imageDir, { recursive: true, force: true });
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
    console.error('EPUB Processing Error:', error);
    
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
