/**
 * Predefined topics for the synthetic social network.
 *
 * Topics are broad categories that posts are classified into.
 * They map to persona interests and drive the ranking engine's
 * topic-relevance scoring and user preference weights.
 *
 * Why static? These are platform-level categories, not user-generated.
 * Adding/removing topics is an operational decision, not a runtime one.
 */

export interface TopicDefinition {
  name: string;
  slug: string;
  description: string;
}

/**
 * Master list of topics. Slugs are URL-safe and used as stable identifiers.
 * Each topic is designed to cover content from multiple persona archetypes.
 */
export const TOPICS: TopicDefinition[] = [
  {
    name: "Technology",
    slug: "technology",
    description: "Software, hardware, gadgets, and tech industry news",
  },
  {
    name: "AI & Machine Learning",
    slug: "ai-ml",
    description: "Artificial intelligence, deep learning, LLMs, and automation",
  },
  {
    name: "Startups & Business",
    slug: "startups-business",
    description: "Entrepreneurship, venture capital, product launches, and company building",
  },
  {
    name: "Finance & Markets",
    slug: "finance-markets",
    description: "Stock markets, crypto, trading strategies, and economic analysis",
  },
  {
    name: "Politics & Government",
    slug: "politics-government",
    description: "Elections, policy, legislation, and political commentary",
  },
  {
    name: "Science & Research",
    slug: "science-research",
    description: "Scientific discoveries, research papers, and academic discussions",
  },
  {
    name: "Islam & Spirituality",
    slug: "islam-spirituality",
    description: "Islamic knowledge, Quran, hadith, spirituality, and dawah",
  },
  {
    name: "Sports",
    slug: "sports",
    description: "Football, basketball, cricket, and competitive sports coverage",
  },
  {
    name: "Health & Fitness",
    slug: "health-fitness",
    description: "Exercise, nutrition, mental health, and wellness",
  },
  {
    name: "Art & Design",
    slug: "art-design",
    description: "Visual art, graphic design, photography, and creative expression",
  },
  {
    name: "Music",
    slug: "music",
    description: "Music production, releases, industry news, and artist culture",
  },
  {
    name: "Entertainment",
    slug: "entertainment",
    description: "Movies, TV, streaming, pop culture, and celebrity news",
  },
  {
    name: "News & Current Events",
    slug: "news-current-events",
    description: "Breaking news, world events, and journalism",
  },
  {
    name: "Social Justice",
    slug: "social-justice",
    description: "Human rights, activism, equality, and social movements",
  },
  {
    name: "Humor & Memes",
    slug: "humor-memes",
    description: "Comedy, memes, satire, and internet culture",
  },
  {
    name: "Education",
    slug: "education",
    description: "Learning, teaching, academia, and educational resources",
  },
  {
    name: "Crypto & Web3",
    slug: "crypto-web3",
    description: "Blockchain, DeFi, NFTs, and decentralized technology",
  },
  {
    name: "Gaming",
    slug: "gaming",
    description: "Video games, esports, game development, and gaming culture",
  },
  {
    name: "Environment & Climate",
    slug: "environment-climate",
    description: "Climate change, sustainability, conservation, and green energy",
  },
  {
    name: "Lifestyle & Culture",
    slug: "lifestyle-culture",
    description: "Travel, food, fashion, relationships, and cultural trends",
  },
];

/**
 * Maps persona interest keywords to topic slugs.
 *
 * Persona interests (from personaConfig.interests) are free-form strings
 * like "AI", "startups", "basketball". This map normalizes them to our
 * predefined topic slugs for classification.
 *
 * Keys are lowercase for case-insensitive matching.
 */
export const INTEREST_TO_TOPIC_MAP: Record<string, string[]> = {
  // Technology
  "ai": ["ai-ml", "technology"],
  "artificial intelligence": ["ai-ml", "technology"],
  "machine learning": ["ai-ml", "technology"],
  "llm": ["ai-ml", "technology"],
  "llms": ["ai-ml", "technology"],
  "deep learning": ["ai-ml", "technology"],
  "software": ["technology"],
  "programming": ["technology"],
  "coding": ["technology"],
  "functional programming": ["technology"],
  "web development": ["technology"],
  "open source": ["technology"],
  "devops": ["technology"],
  "cybersecurity": ["technology"],
  "tech": ["technology"],
  "saas": ["technology", "startups-business"],

  // Startups & Business
  "startups": ["startups-business"],
  "entrepreneurship": ["startups-business"],
  "venture capital": ["startups-business", "finance-markets"],
  "product management": ["startups-business", "technology"],
  "business": ["startups-business"],
  "leadership": ["startups-business"],
  "marketing": ["startups-business"],

  // Finance
  "trading": ["finance-markets"],
  "stocks": ["finance-markets"],
  "investing": ["finance-markets"],
  "economics": ["finance-markets"],
  "personal finance": ["finance-markets"],
  "fintech": ["finance-markets", "technology"],

  // Crypto
  "crypto": ["crypto-web3", "finance-markets"],
  "cryptocurrency": ["crypto-web3", "finance-markets"],
  "bitcoin": ["crypto-web3", "finance-markets"],
  "blockchain": ["crypto-web3", "technology"],
  "defi": ["crypto-web3", "finance-markets"],
  "nft": ["crypto-web3"],
  "web3": ["crypto-web3", "technology"],

  // Politics
  "politics": ["politics-government"],
  "policy": ["politics-government"],
  "geopolitics": ["politics-government", "news-current-events"],
  "elections": ["politics-government"],
  "democracy": ["politics-government"],
  "foreign policy": ["politics-government"],

  // Science
  "science": ["science-research"],
  "physics": ["science-research"],
  "biology": ["science-research"],
  "neuroscience": ["science-research"],
  "climate science": ["science-research", "environment-climate"],
  "research": ["science-research"],
  "academia": ["science-research", "education"],

  // Islam
  "islam": ["islam-spirituality"],
  "quran": ["islam-spirituality"],
  "hadith": ["islam-spirituality"],
  "dawah": ["islam-spirituality"],
  "islamic finance": ["islam-spirituality", "finance-markets"],
  "spirituality": ["islam-spirituality"],
  "tafsir": ["islam-spirituality"],
  "fiqh": ["islam-spirituality"],

  // Sports
  "football": ["sports"],
  "soccer": ["sports"],
  "basketball": ["sports"],
  "cricket": ["sports"],
  "tennis": ["sports"],
  "sports": ["sports"],
  "mma": ["sports"],
  "boxing": ["sports"],
  "athletics": ["sports"],
  "esports": ["sports", "gaming"],

  // Health
  "fitness": ["health-fitness"],
  "nutrition": ["health-fitness"],
  "mental health": ["health-fitness"],
  "wellness": ["health-fitness"],
  "yoga": ["health-fitness"],
  "health": ["health-fitness"],
  "exercise": ["health-fitness"],

  // Art
  "art": ["art-design"],
  "design": ["art-design"],
  "photography": ["art-design"],
  "illustration": ["art-design"],
  "graphic design": ["art-design"],
  "visual art": ["art-design"],
  "creative writing": ["art-design", "entertainment"],
  "calligraphy": ["art-design", "islam-spirituality"],

  // Music
  "music": ["music"],
  "hip hop": ["music"],
  "rap": ["music"],
  "music production": ["music"],
  "jazz": ["music"],
  "classical music": ["music"],
  "r&b": ["music"],

  // Entertainment
  "movies": ["entertainment"],
  "film": ["entertainment"],
  "tv": ["entertainment"],
  "streaming": ["entertainment"],
  "pop culture": ["entertainment"],
  "anime": ["entertainment", "gaming"],
  "comedy": ["humor-memes", "entertainment"],

  // News
  "journalism": ["news-current-events"],
  "news": ["news-current-events"],
  "current events": ["news-current-events"],
  "media": ["news-current-events"],
  "investigative journalism": ["news-current-events"],

  // Social Justice
  "human rights": ["social-justice"],
  "activism": ["social-justice"],
  "social justice": ["social-justice"],
  "equality": ["social-justice"],
  "civil rights": ["social-justice"],
  "labor rights": ["social-justice"],

  // Humor
  "memes": ["humor-memes"],
  "satire": ["humor-memes"],
  "humor": ["humor-memes"],
  "standup": ["humor-memes", "entertainment"],

  // Education
  "education": ["education"],
  "teaching": ["education"],
  "learning": ["education"],
  "edtech": ["education", "technology"],

  // Gaming
  "gaming": ["gaming"],
  "game development": ["gaming", "technology"],
  "video games": ["gaming"],
  "indie games": ["gaming"],

  // Environment
  "climate change": ["environment-climate"],
  "sustainability": ["environment-climate"],
  "environment": ["environment-climate"],
  "renewable energy": ["environment-climate"],
  "green energy": ["environment-climate"],
  "conservation": ["environment-climate"],

  // Lifestyle
  "travel": ["lifestyle-culture"],
  "food": ["lifestyle-culture"],
  "fashion": ["lifestyle-culture"],
  "culture": ["lifestyle-culture"],
  "lifestyle": ["lifestyle-culture"],
  "relationships": ["lifestyle-culture"],
};

/**
 * Resolve a persona's free-form interests to topic slugs.
 *
 * Uses case-insensitive matching against INTEREST_TO_TOPIC_MAP.
 * Unknown interests are silently skipped (they may not map to any topic).
 *
 * @returns Deduplicated array of topic slugs.
 */
export function resolveInterestsToTopics(interests: string[]): string[] {
  const slugs = new Set<string>();

  for (const interest of interests) {
    const key = interest.toLowerCase().trim();
    const mapped = INTEREST_TO_TOPIC_MAP[key];
    if (mapped) {
      for (const slug of mapped) {
        slugs.add(slug);
      }
    }
  }

  return [...slugs];
}
