import { GoogleGenAI, Type } from "@google/genai";
import { BookRecommendation, BookDetails } from "../types";

// Mock Data
const MOCK_BOOKS: BookDetails[] = [
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    rating: 4.8,
    description: "A classic novel of manners, love, and class in early 19th-century England, following the tumultuous relationship between Elizabeth Bennet and Mr. Darcy.",
    longDescription: "Jane Austen's timeless novel, \"Pride and Prejudice,\" immerses readers in the intricate world of early 19th-century England, exploring societal pressures, class distinctions, and the complexities of love. The story centers on Elizabeth Bennet, a spirited and intelligent young woman, whose sharp wit often clashes with the haughty demeanor of the wealthy Mr. Darcy. Their initial disdain is fueled by his pride and her prejudice, leading to a series of misunderstandings and social skirmishes. As their paths repeatedly cross amidst charming country estates and bustling social gatherings, the novel masterfully unpacks themes of reputation, family duty, and the true meaning of a compatible marriage. Austen cleverly critiques social snobbery and celebrates the power of genuine affection to overcome superficial barriers, culminating in Elizabeth's journey towards self-awareness and one of literature's most enduring romantic conclusions.",
    chapters: [
      "Introduction to the Bennet Family and Mr. Bingley's Arrival",
      "Elizabeth Bennet's First Encounters with Mr. Darcy",
      "Mr. Collins's Proposal and Charlotte Lucas's Pragmatism",
      "Darcy's First Proposal and Elizabeth's Rejection",
      "Wickham's Deceptions and Darcy's Revelation",
      "Lydia's Elopement and the Family Crisis",
      "Lady Catherine de Bourgh's Confrontation with Elizabeth",
      "Elizabeth and Darcy's Reconciliation and Second Proposal",
      "The Double Wedding and Future Prospects"
    ]
  },
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    rating: 4.7,
    description: "A Pulitzer Prize-winning novel depicting racial injustice in the American South through the eyes of young Scout Finch, whose lawyer father defends a black man falsely accused of rape.",
    longDescription: "Harper Lee's To Kill a Mockingbird is a powerful and moving novel set in the 1930s in the fictional town of Maycomb, Alabama. Through the innocent eyes of Scout Finch, the story explores the serious issues of racial injustice and the destruction of innocence. Her father, Atticus Finch, a lawyer of profound integrity, defends Tom Robinson, a black man falsely accused of raping a white woman. The novel captures the warmth and humor of childhood while dealing with the dark realities of prejudice and hatred. It is a story about courage, compassion, and the importance of doing what is right, even when the odds are against you.",
    chapters: [
        "The Finch Family and Dill's Arrival",
        "Scout's First Day of School",
        "The Gifts in the Knothole",
        "The Fire at Miss Maudie's",
        "Atticus Takes the Case",
        "Christmas at Finch's Landing",
        "The Mad Dog",
        "Mrs. Dubose's Camellias",
        "The Trial Begins",
        "Tom Robinson's Testimony",
        "The Verdict",
        "Bob Ewell's Revenge",
        "Boo Radley Saves the Children"
    ]
  },
  {
    title: "1984",
    author: "George Orwell",
    rating: 4.6,
    description: "A dystopian social science fiction novel and cautionary tale about totalitarianism, mass surveillance, and the manipulation of truth.",
    longDescription: "George Orwell's 1984 is a chilling dystopian novel set in a totalitarian society ruled by the Party and its leader, Big Brother. The story follows Winston Smith, a low-ranking member of the Party who works at the Ministry of Truth, where he alters historical records to fit the Party's propaganda. Winston secretly hates the Party and dreams of rebellion. He begins a forbidden affair with Julia, a fellow party member, and they attempt to join the Brotherhood, a resistance group. The novel explores themes of government surveillance, psychological manipulation, and the destruction of truth and individuality. It is a stark warning about the dangers of totalitarianism.",
    chapters: [
        "The Clocks Strike Thirteen",
        "Big Brother Is Watching You",
        "The Two Minutes Hate",
        "The Golden Country",
        "The Ministry of Love",
        "Room 101",
        "The Principles of Newspeak"
    ]
  }
];

// Helper to get API key safely
const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API Key is missing");
    return "";
  }
  return key;
};

export const getBookRecommendations = async (query: string): Promise<BookRecommendation[]> => {
  // Return mock data immediately for now
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_BOOKS.map(({ title, author, description, rating }) => ({
        title, author, description, rating
      })));
    }, 800); // Simulate network delay
  });

  /* 
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Using gemini-2.5-flash for speed and efficiency
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Recommend 3 books related to "${query}". If the query is vague, recommend 3 popular classics.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              description: { type: Type.STRING },
              rating: { type: Type.NUMBER, description: "Rating out of 5 stars" }
            },
            required: ["title", "author", "description", "rating"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    return JSON.parse(text) as BookRecommendation[];
  } catch (error) {
    console.error("Error fetching book recommendations:", error);
    return [];
  }
  */
};

export const getBookDetails = async (book: BookRecommendation): Promise<BookDetails | null> => {
  // Return mock data immediately for now
  return new Promise((resolve) => {
    setTimeout(() => {
      const foundBook = MOCK_BOOKS.find(b => b.title === book.title);
      if (foundBook) {
        resolve(foundBook);
      } else {
        // Fallback if book not found in mock data (shouldn't happen with current flow)
        resolve({
          ...book,
          longDescription: "Detailed description not available in mock data.",
          chapters: ["Chapter 1", "Chapter 2", "Chapter 3"]
        });
      }
    }, 800); // Simulate network delay
  });
};

export const getChapterContent = async (bookTitle: string, author: string, chapterTitle: string): Promise<string> => {
  // Mock content for now
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`
# ${chapterTitle}

This is a mock chapter content for **${bookTitle}** by *${author}*.

In a real application, this content would be fetched from an API or a database. Since we are currently running in a mock environment, here is some placeholder text to demonstrate the reader functionality.

## Section 1

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

> "This is a blockquote to show how markdown rendering works in the reader view."

## Section 2

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

*   List item 1
*   List item 2
*   List item 3

Enjoy reading!
      `);
    }, 1000);
  });
};