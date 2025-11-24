import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryByType, queryItems } from '../utils/dynamodb';

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const allBooks = await queryByType(process.env.CONTENT_TABLE!, 'book');
    
    // Only return books that have successfully completed processing and are not hidden
    const booksWithChapters = await Promise.all(
      allBooks
        .filter(book => book.processingStatus === 'success' && !book.hidden)
        .map(async (book) => {
          const bookId = book.PK?.replace('book#', '') || book.bookId;
          
          // Fetch chapters for this book
          const chapters = await queryItems(
            process.env.CONTENT_TABLE!,
            book.PK!,
            'chapter#'
          );
          
          // Sort by order and extract titles
          const sortedChapters = chapters
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(ch => ch.title || `Chapter ${ch.order}`);
          
          return {
            ...book,
            bookId,
            chapters: sortedChapters,
            chapterCount: sortedChapters.length
          };
        })
    );
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ books: booksWithChapters })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to list books' }) };
  }
};
