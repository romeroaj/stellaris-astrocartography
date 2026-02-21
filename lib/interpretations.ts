import { PlanetName, LineType } from "./types";

interface Interpretation {
  title: string;
  shortDesc: string;
  livingHere: string;
  visitingHere: string;
  themes: string[];
  bestFor: string[];
  challenges: string[];
}

/** East/West side-of-line info for relocation charts */
export interface SideOfLineInfo {
  preferredSide: "west" | "east" | "both";
  summary: string;
  westHouse: string;
  eastHouse: string;
  westDesc: string;
  eastDesc: string;
}

/** Angle phrasing for synthesis: emanating vs receiving. Use when building dynamic sentences. */
export const ANGLE_PHRASING: Record<LineType, string[]> = {
  ASC: ["You embody…", "You project…"],
  DSC: ["You attract…", "Others bring…"],
  MC: ["You are seen as…", "You achieve…"],
  IC: ["You feel…", "You belong…"],
};

const interpretations: Record<string, Interpretation> = {
  "sun-MC": {
    title: "Sun on the Midheaven",
    shortDesc: "Your power and career line. You become highly visible, recognized, and magnetically drawn to leadership. Financial opportunities through career advancement open up naturally here.",
    livingHere: "Living here puts you in the spotlight. Career advancement comes more easily — promotions, recognition, and authority all flow toward you. People see your true capabilities, and income often grows alongside your reputation. You feel driven to build something meaningful.",
    visitingHere: "Even short visits bring a confidence boost. You'll feel sharper in meetings, more decisive, and more seen by the people who matter. Great for job interviews, pitching ideas, or networking.",
    themes: ["Career success", "Public recognition", "Leadership", "Money", "Identity"],
    bestFor: ["Starting a business", "Building a public career", "Salary negotiations", "Gaining authority"],
    challenges: ["Pressure to perform", "Constant visibility can be exhausting", "Ego inflation"],
  },
  "sun-IC": {
    title: "Sun at the Nadir",
    shortDesc: "Your roots and inner self line. You connect deeply with home, family, and your sense of belonging. A powerful place for building real estate wealth and emotional foundations.",
    livingHere: "This location illuminates your private life and inner world. You feel drawn to understanding your family history, creating a beautiful home, or doing deep inner work. Property investments tend to go well here. It's a place of quiet self-discovery and solid foundations.",
    visitingHere: "You'll feel grounded and reflective. Great for family reunions, house hunting, or any trip where you need to reconnect with what truly matters to you. Decisions about home feel clearer here.",
    themes: ["Home life", "Family roots", "Real estate", "Inner self", "Foundations"],
    bestFor: ["Settling down", "Buying property", "Healing family wounds", "Finding your roots"],
    challenges: ["May feel too private or isolated", "Family drama surfacing", "Difficulty with public life"],
  },
  "sun-ASC": {
    title: "Sun on the Ascendant",
    shortDesc: "Your vitality line. You radiate confidence, health, and personal magnetism. People are naturally drawn to you, and you feel more alive than almost anywhere else.",
    livingHere: "You'll feel more alive and energetic here than almost anywhere else. Your personality becomes magnetic, and people are naturally drawn to you. Physical health tends to improve, and you feel aligned with your true self. Self-employment and personal branding thrive.",
    visitingHere: "Instant energy boost. You'll feel more confident, attractive, and outgoing. Perfect for vacations where you want to feel like your best self — social events, dating trips, or personal milestone celebrations.",
    themes: ["Vitality", "Self-expression", "Confidence", "Physical health"],
    bestFor: ["Personal reinvention", "Health recovery", "Building confidence", "New beginnings"],
    challenges: ["Can become self-centered", "Burnout from constant output", "Others may find you intense"],
  },
  "sun-DSC": {
    title: "Sun on the Descendant",
    shortDesc: "Your partnership line. You attract powerful, significant people — both romantic and professional. Collaborations formed here can be life-changing.",
    livingHere: "Partnerships define your experience here. You may meet your significant other, form powerful business partnerships, or attract influential mentors. Others reflect your best qualities back to you. Joint financial ventures tend to succeed.",
    visitingHere: "You'll notice people approach you more easily here. Great for business trips, meeting a partner's family, signing contracts, or attending events where making the right connection matters.",
    themes: ["Partnerships", "Marriage", "Key relationships", "Collaboration", "Money"],
    bestFor: ["Finding love", "Business partnerships", "Joint ventures", "Legal matters"],
    challenges: ["Over-reliance on others", "Losing yourself in relationships", "Power struggles with partners"],
  },
  "moon-MC": {
    title: "Moon on the Midheaven",
    shortDesc: "Your popularity and public intuition line. People are drawn to your warmth and emotional intelligence. Careers in real estate, food, hospitality, or caregiving thrive here.",
    livingHere: "Your emotional nature becomes your public superpower. You may be drawn to caregiving professions, real estate, hospitality, or food industries — all of which can be very profitable here. Your intuition guides smart career moves, and the public sees you as trustworthy and relatable.",
    visitingHere: "You'll feel warmly received by locals and strangers alike. Great for scouting real estate, food tourism, or any trip where you want to connect emotionally with a place. Trust your gut about financial decisions here.",
    themes: ["Popularity", "Nurturing career", "Real estate", "Money", "Public intuition"],
    bestFor: ["Caregiving professions", "Real estate investing", "Food industry", "Working with the public"],
    challenges: ["Emotional vulnerability in public", "Mood swings affecting career", "Feeling exposed"],
  },
  "moon-IC": {
    title: "Moon at the Nadir",
    shortDesc: "Your emotional home — the place on earth where you feel the deepest sense of belonging. This is where you're meant to put down roots and build your sanctuary.",
    livingHere: "This may be the most emotionally comfortable place on earth for you. You feel at home, connected to the land, and deeply nourished. Property purchases tend to work out well — you have an instinct for finding the right home here. Family bonds strengthen.",
    visitingHere: "You'll feel an instant sense of 'I could live here.' Great for house-hunting trips, family vacations, or retreats when you need to recharge emotionally. Sleep tends to be deeper and more restorative here.",
    themes: ["Emotional security", "Home", "Real estate", "Ancestry", "Belonging"],
    bestFor: ["Raising a family", "Buying a home", "Emotional healing", "Connecting with heritage"],
    challenges: ["Can become overly domestic", "Difficulty leaving", "Emotional dependency on place"],
  },
  "moon-ASC": {
    title: "Moon on the Ascendant",
    shortDesc: "Your emotional expression and intuition line. Feelings flow freely, creativity surges, and your instincts become remarkably accurate. Others are drawn to your warmth.",
    livingHere: "You become more emotionally open and intuitive here. Others see your sensitivity as a strength. Creativity flows naturally — great for artists, writers, and healers. You may develop sharper intuition or even psychic impressions.",
    visitingHere: "You'll feel emotionally heightened — more empathetic, more creative, more open. Perfect for wellness retreats, creative workshops, art trips, or any vacation where you want to feel deeply and connect authentically.",
    themes: ["Emotional expression", "Intuition", "Sensitivity", "Creativity"],
    bestFor: ["Creative pursuits", "Healing work", "Emotional growth", "Connecting with others"],
    challenges: ["Emotional overwhelm", "Hypersensitivity", "Boundary issues"],
  },
  "moon-DSC": {
    title: "Moon on the Descendant",
    shortDesc: "Your emotional partnership line. Relationships here feel like coming home — deeply nurturing, intimate, and family-like from the start.",
    livingHere: "Relationships here have a deeply emotional, nurturing quality. You attract caring partners who feel like family. Emotional intimacy comes easily, and long-term bonds form naturally. Great for finding someone who wants to build a home together.",
    visitingHere: "You'll feel more open to emotional connection. Great for couples retreats, meeting a partner's family, or any trip where deepening a bond is the goal. New people you meet feel instantly familiar.",
    themes: ["Emotional bonds", "Nurturing partners", "Intimacy", "Domestic partnerships"],
    bestFor: ["Finding emotional support", "Marriage", "Building family", "Therapeutic relationships"],
    challenges: ["Codependency", "Attracting emotionally needy partners", "Smothering tendencies"],
  },
  "mercury-MC": {
    title: "Mercury on the Midheaven",
    shortDesc: "Your ideas and commerce line. You're known for your intellect and communication skills. Business deals, writing, tech, and media careers flourish — money flows through smart thinking.",
    livingHere: "Your mental abilities are recognized and rewarded. You may excel in writing, teaching, media, technology, or commerce. Ideas flow freely, negotiations go your way, and you find the right words for any situation. Side hustles and intellectual property can generate real income.",
    visitingHere: "Your mind is razor-sharp here. Great for business trips, signing deals, attending conferences, or studying. Conversations lead to opportunities. If you're negotiating, do it in this location.",
    themes: ["Communication", "Intellectual recognition", "Writing", "Money", "Commerce"],
    bestFor: ["Writing career", "Business deals", "Media work", "Technology", "Commerce"],
    challenges: ["Overthinking", "Scattered energy", "Nervous tension"],
  },
  "mercury-IC": {
    title: "Mercury at the Nadir",
    shortDesc: "Your intellectual roots line. A place of deep thinking, study, and working from home. Your mind turns inward and you process things with unusual clarity.",
    livingHere: "This location stimulates your inner mind. You may feel drawn to study, research, or deep contemplation. Working from home is especially productive here. Communication with family improves, and you develop a more analytical understanding of your roots.",
    visitingHere: "You'll feel mentally quiet and focused. Perfect for writing retreats, study trips, or any vacation where you need to think clearly. Journaling and planning feel especially productive.",
    themes: ["Study", "Research", "Inner dialogue", "Family communication", "Remote work"],
    bestFor: ["Academic pursuits", "Writing a book", "Working from home", "Learning new skills"],
    challenges: ["Mental restlessness", "Overthinking personal matters", "Information overload"],
  },
  "mercury-ASC": {
    title: "Mercury on the Ascendant",
    shortDesc: "Your communication superpower line. You become articulate, witty, and mentally magnetic. Networking and social connections happen effortlessly.",
    livingHere: "Your communication skills reach their peak. You become more articulate, quick-witted, and intellectually curious. Networking happens naturally and your social circle expands rapidly. Excellent for any work involving language, ideas, sales, or technology.",
    visitingHere: "You'll be sharper and more sociable than usual. Great for networking events, learning a new language, exploring a city's culture, or any trip where making connections matters. You'll talk to everyone.",
    themes: ["Articulation", "Mental agility", "Curiosity", "Networking", "Sales"],
    bestFor: ["Public speaking", "Networking events", "Learning languages", "Starting studies"],
    challenges: ["Anxiety", "Restlessness", "Difficulty with emotional depth"],
  },
  "mercury-DSC": {
    title: "Mercury on the Descendant",
    shortDesc: "Your business partnership line. You attract mentally sharp partners and deals that make sense. Communication in relationships flows easily — misunderstandings are rare.",
    livingHere: "Relationships here are built on intellectual connection. You attract partners who stimulate your mind, and communication flows easily. Business negotiations and contracts tend to go very well. Great for finding a co-founder or business partner.",
    visitingHere: "Negotiations and conversations go smoothly. Great for business trips, contract signings, meeting potential partners (romantic or professional), or any situation requiring clear communication.",
    themes: ["Intellectual partnerships", "Business deals", "Communication", "Contracts"],
    bestFor: ["Finding business partners", "Negotiations", "Contracts", "Intellectual collaboration"],
    challenges: ["Relationships may lack emotional depth", "Too much talking, not enough feeling"],
  },
  "venus-MC": {
    title: "Venus on the Midheaven",
    shortDesc: "Your charm-meets-career line. You're known for beauty, taste, and social grace. Careers in luxury, design, art, fashion, and finance flourish — and the money follows.",
    livingHere: "Beauty and harmony define your public image and career success. You may thrive in arts, fashion, design, luxury brands, banking, or diplomacy. People find you attractive and charming — success comes through grace rather than force. Financial management and investments tend to go well here.",
    visitingHere: "You'll feel glamorous, polished, and socially confident. Perfect for art exhibitions, shopping trips, luxury travel, or business meetings where making a great impression matters. You'll want to dress up.",
    themes: ["Beauty", "Art", "Charm", "Money", "Luxury", "Social grace"],
    bestFor: ["Art career", "Fashion", "Financial planning", "Interior design", "Diplomacy"],
    challenges: ["Vanity", "Superficiality", "Overspending on luxury"],
  },
  "venus-IC": {
    title: "Venus at the Nadir",
    shortDesc: "Your dream home line. You'll create the most beautiful, harmonious living space here. Real estate investments and working from home are especially fortunate.",
    livingHere: "Your home becomes a sanctuary of beauty and comfort — and a smart investment. Real estate tends to appreciate well here. You may spend generously creating a gorgeous living space, and family relationships become warmer and more loving. Friends always want to come over.",
    visitingHere: "You'll feel deeply comfortable and at peace. Great for house-hunting trips, home-design inspiration, visiting family, or spa retreats. The domestic arts — cooking, decorating, entertaining — come alive here.",
    themes: ["Beautiful home", "Family harmony", "Real estate", "Money", "Comfort"],
    bestFor: ["Creating a dream home", "Real estate investing", "Family healing", "Working from home"],
    challenges: ["Overindulgence", "Avoiding conflict at home", "Material attachment"],
  },
  "venus-ASC": {
    title: "Venus on the Ascendant",
    shortDesc: "Your love, beauty, and money line. You become irresistibly attractive and socially magnetic. Romance arrives easily, financial luck improves, and life just feels more enjoyable.",
    livingHere: "This is perhaps the most pleasant line to live on. You feel more attractive, both physically and socially. Romance comes easily, and so does financial luck — you develop a sharper sense for money matters and speculate with better instincts. Life feels lighter, more beautiful, and more enjoyable.",
    visitingHere: "Instant glow-up. You'll feel gorgeous, flirtatious, and lucky. Perfect for romantic getaways, spa vacations, shopping trips, or any time you want to feel your most attractive and magnetic. Treat yourself here.",
    themes: ["Attraction", "Romance", "Money", "Social ease", "Beauty"],
    bestFor: ["Finding love", "Financial improvement", "Social life", "Self-care", "Shopping"],
    challenges: ["Laziness", "Over-indulgence", "Superficial connections"],
  },
  "venus-DSC": {
    title: "Venus on the Descendant",
    shortDesc: "Your soulmate line. This is where you're most likely to find deep, lasting love. Partnerships formed here tend to be beautiful, harmonious, and genuinely fulfilling.",
    livingHere: "This is one of the most powerful lines for love. Romantic relationships formed here tend to be beautiful, harmonious, and deeply satisfying. You attract loving, artistic, and financially comfortable partners. Business partnerships also thrive with mutual respect and shared values.",
    visitingHere: "Love is in the air — literally. Perfect for honeymoons, anniversary trips, proposals, or meeting someone special. Even business meetings take on a warmer, more collaborative energy. You attract good people here.",
    themes: ["Soulmate connections", "Romantic love", "Beautiful partnerships", "Money"],
    bestFor: ["Finding a life partner", "Marriage", "Artistic collaboration", "Joint finances"],
    challenges: ["Idealization of partners", "Avoiding necessary conflicts", "Codependency"],
  },
  "mars-MC": {
    title: "Mars on the Midheaven",
    shortDesc: "Your raw ambition line. Career moves here are bold, competitive, and high-stakes. You'll work harder and fight for what you want — but watch for conflicts with bosses and burnout.",
    livingHere: "Your competitive drive reaches its peak. You become more assertive, ambitious, and willing to fight for what you want. Career advances come through bold action and courage — not diplomacy. This energy rewards entrepreneurs, athletes, and anyone willing to hustle. But the pace is relentless.",
    visitingHere: "You'll feel fired up and ready to compete. Good for athletic events, pitching aggressive business ideas, or any situation where you need to be fearless. Not ideal for relaxing vacations — you won't sit still.",
    themes: ["Ambition", "Competition", "Courage", "Physical energy", "Entrepreneurship"],
    bestFor: ["Athletic careers", "Entrepreneurship", "Military service", "Competitive industries"],
    challenges: ["Conflicts with authority", "Burnout", "Aggressive reputation", "Work-life imbalance"],
  },
  "mars-IC": {
    title: "Mars at the Nadir",
    shortDesc: "Your inner fire line. Deep passion and restless energy are directed at home and family. Great for renovations and confronting old wounds — but domestic tension runs high.",
    livingHere: "Your inner fire burns hot here. You may throw yourself into home renovations, confront family conflicts head-on, or discover a deep well of personal power. Energy is directed inward. This is a place of action around your living space — not passive domesticity.",
    visitingHere: "You'll feel restless and driven to fix things. Not the best vacation spot — you'll want to rearrange furniture or have serious family conversations rather than relax. Good for productive home-related trips.",
    themes: ["Inner strength", "Home renovation", "Family conflicts", "Personal power"],
    bestFor: ["Home improvement projects", "Resolving family issues", "Building inner strength"],
    challenges: ["Domestic conflicts", "Anger at family", "Restlessness at home", "Difficulty relaxing"],
  },
  "mars-ASC": {
    title: "Mars on the Ascendant",
    shortDesc: "Your warrior line. Physical energy, courage, and assertiveness are supercharged — but so is aggression. You'll feel fearless here, for better or worse. Channel it into sports or bold ventures.",
    livingHere: "You become physically stronger, more courageous, and more assertive. Sports, fitness, and physical challenges bring deep satisfaction. You feel ready to take on anything. But this energy is a double-edged sword — impulsiveness, accidents, and confrontations are more likely. Consciously channel this fire.",
    visitingHere: "Adrenaline spikes. Great for adventure travel, athletic competitions, hiking, extreme sports, or any trip requiring physical courage. Not ideal for peaceful, relaxing getaways — you'll feel wired.",
    themes: ["Physical power", "Courage", "Assertiveness", "Action", "Athletics"],
    bestFor: ["Athletic training", "Adventure travel", "Starting new ventures", "Physical challenges"],
    challenges: ["Accidents", "Impulsiveness", "Confrontations", "Physical strain"],
  },
  "mars-DSC": {
    title: "Mars on the Descendant",
    shortDesc: "Your passionate relationship line. Sexual chemistry and attraction are intense — but so are arguments. Relationships here are electric and transformative, never boring.",
    livingHere: "Partnerships here are passionate and intense. You attract strong-willed, bold partners who challenge you. Sexual chemistry is high, but so is the potential for heated arguments. These relationships push you to grow — but only if you can handle the fire. Business partnerships are competitive and high-energy.",
    visitingHere: "Sparks fly — romantic and otherwise. Great for passionate getaways with a partner, but be prepared for heated moments. New people you meet here will be bold and direct. Not ideal for calm, diplomatic situations.",
    themes: ["Passionate partnerships", "Sexual chemistry", "Conflict", "Growth through others"],
    bestFor: ["Passionate romance", "Competitive partnerships", "Physical connection"],
    challenges: ["Arguments with partners", "Attracting aggressive people", "Power struggles", "Jealousy"],
  },
  "jupiter-MC": {
    title: "Jupiter on the Midheaven",
    shortDesc: "Your big break line. Career opportunities, financial abundance, and recognition flow to you here. This is one of your strongest lines for making money and building a reputation.",
    livingHere: "This is one of the best lines for career success and wealth building. Opportunities seem to fall into your lap — raises, promotions, and lucky breaks. Your reputation grows as someone wise, generous, and successful. Legal matters tend to resolve in your favor. Publishing, education, and international business thrive.",
    visitingHere: "You'll feel expansive and optimistic about your future. Perfect for job interviews, investment decisions, legal proceedings, or launching a project. Everything feels more possible here. Trust the big vision.",
    themes: ["Career expansion", "Money", "Abundance", "Wisdom", "Good fortune"],
    bestFor: ["Career advancement", "Wealth building", "Higher education", "Legal matters", "Publishing"],
    challenges: ["Overconfidence", "Overexpansion", "Taking too many risks"],
  },
  "jupiter-IC": {
    title: "Jupiter at the Nadir",
    shortDesc: "Your abundant home and property line. Real estate, family life, and domestic comfort expand generously. One of the best lines for owning property.",
    livingHere: "Your home life becomes expansive and abundant. You may live in a larger house, enjoy generous family gatherings, or feel deeply optimistic about your roots. This is one of the best lines for owning property — real estate investments tend to grow well here. Inheritance and family wealth may also flow.",
    visitingHere: "You'll feel generous and at peace. Great for house-hunting, property scouting, family celebrations, or any trip where you're planning long-term living arrangements. Your instinct for valuable real estate is sharp here.",
    themes: ["Abundant home", "Real estate", "Family growth", "Money", "Inner optimism"],
    bestFor: ["Buying property", "Real estate investing", "Expanding family", "Retirement"],
    challenges: ["Overspending on home", "Family overindulgence", "Restlessness"],
  },
  "jupiter-ASC": {
    title: "Jupiter on the Ascendant",
    shortDesc: "Your luck line. Everything feels possible — opportunities, people, and money flow to you with unusual ease. Optimism becomes your superpower and it attracts abundance.",
    livingHere: "You feel luckier, more optimistic, and more expansive here than anywhere else. People see you as generous, wise, and larger-than-life. Travel and education opportunities multiply. Financial instincts sharpen. The downside? Jupiter expands everything — including your waistline.",
    visitingHere: "Instant lucky streak. You'll feel confident, generous, and like the world is your oyster. Perfect for taking calculated risks, meeting new people, exploring new cities, or starting something big. Everything goes a little better here.",
    themes: ["Luck", "Money", "Optimism", "Expansion", "Generosity"],
    bestFor: ["New beginnings", "Financial decisions", "Travel", "Education", "Legal matters"],
    challenges: ["Weight gain", "Over-optimism", "Excess in all things", "Overspending"],
  },
  "jupiter-DSC": {
    title: "Jupiter on the Descendant",
    shortDesc: "Your wealthy partnership line. You attract generous, successful, and influential partners — romantic and professional. Joint ventures tend to be very profitable.",
    livingHere: "Partnerships here bring growth and abundance. You attract generous, successful partners who expand your worldview and your bank account. Marriage and business partnerships tend to bring good fortune. International relationships are especially favored.",
    visitingHere: "People you meet here tend to be generous and well-connected. Great for business development trips, seeking investors, international collaborations, or meeting a partner with means. Legal partnerships resolve well.",
    themes: ["Fortunate partnerships", "Money", "Wise partners", "Growth through others"],
    bestFor: ["Finding a successful partner", "Business partnerships", "Joint ventures", "International relationships"],
    challenges: ["Partners may be excessive", "Codependency through comfort", "Legal overreach"],
  },
  "saturn-MC": {
    title: "Saturn on the Midheaven",
    shortDesc: "Your legacy line. Success comes slowly but it LASTS. Career achievements here are built on discipline and hard work — expect delays but also lasting respect and authority.",
    livingHere: "Nothing comes easy here — but what you build endures. Career success requires patience, discipline, and earning your stripes. Expect slower advancement but deeper, lasting respect. Government, management, and structured industries favor you. Financial gains are slow but stable — think long-term investments, not quick wins.",
    visitingHere: "You'll feel serious and focused. Good for career planning, meetings with authority figures, or government business. Not the best vacation destination — you'll feel the weight of responsibility. But professional trips here tend to be productive.",
    themes: ["Discipline", "Authority", "Lasting achievement", "Long-term money", "Legacy"],
    bestFor: ["Building a legacy", "Government work", "Management", "Long-term investments"],
    challenges: ["Career delays", "Heavy responsibilities", "Feeling burdened", "Depression"],
  },
  "saturn-IC": {
    title: "Saturn at the Nadir",
    shortDesc: "Your foundation and karma line. You'll confront family patterns and build real inner strength — but it's heavy work. Solitude and responsibility define the home experience.",
    livingHere: "This location brings you face-to-face with family patterns and deep personal foundations. You may feel isolated or burdened by domestic responsibilities. The inner work is profound but emotionally heavy. Home may feel sparse or restrictive. Best approached with therapeutic support and self-compassion.",
    visitingHere: "Emotionally heavy. You may feel nostalgic, serious, or confronted by old memories. This is not a light vacation spot — but it can be powerful for therapy retreats, ancestral research, or closure trips where you're intentionally processing the past.",
    themes: ["Family karma", "Inner structure", "Foundations", "Solitude", "Therapy"],
    bestFor: ["Deep inner work", "Therapy retreats", "Building foundations", "Ancestral research"],
    challenges: ["Loneliness", "Family burdens", "Feeling restricted", "Depression"],
  },
  "saturn-ASC": {
    title: "Saturn on the Ascendant",
    shortDesc: "Your maturity and authority line. You'll be taken seriously and respected — but life feels heavier. Energy may dip, but wisdom and discipline increase significantly.",
    livingHere: "Life takes on a more serious, structured tone. You become more disciplined, mature, and responsible. Others see you as an authority figure and treat you accordingly. Physical vitality may decrease but wisdom increases. You age with dignity here, but may struggle with pessimism or heaviness.",
    visitingHere: "You'll feel more serious and grounded. Good for business trips where credibility matters, or situations requiring discipline and maturity. Not ideal for fun-seeking vacations — the energy is sober and focused.",
    themes: ["Maturity", "Discipline", "Authority", "Seriousness", "Credibility"],
    bestFor: ["Earning respect", "Career building", "Self-discipline", "Aging gracefully"],
    challenges: ["Depression", "Loneliness", "Physical limitations", "Pessimism"],
  },
  "saturn-DSC": {
    title: "Saturn on the Descendant",
    shortDesc: "Your committed partnership line. Relationships here are serious and lasting — but can feel heavy or restrictive. You attract mature, stable partners who value loyalty over excitement.",
    livingHere: "Relationships here are serious and committed. You attract older, more mature, or emotionally reserved partners. Partnerships may feel restrictive at times, but they teach lasting lessons about commitment and responsibility. Marriage here is built to last — if you can handle the gravity.",
    visitingHere: "Relationships feel weightier here. Good for having serious relationship conversations, couples therapy trips, or meeting potential long-term partners. Not ideal for lighthearted dating or casual connections.",
    themes: ["Committed relationships", "Mature partners", "Lessons in love", "Loyalty"],
    bestFor: ["Finding a stable partner", "Long-term commitment", "Business partnerships", "Marriage"],
    challenges: ["Feeling trapped", "Cold or distant partners", "Relationship delays", "Loneliness"],
  },
  "uranus-MC": {
    title: "Uranus on the Midheaven",
    shortDesc: "Your disruption and innovation line. Career takes unexpected turns — often brilliant ones. Tech, startups, and unconventional industries thrive, but stability is hard to find.",
    livingHere: "Your career takes unexpected turns. You may be drawn to technology, startups, innovation, or revolutionary causes. Success comes through being different and embracing change. The money can be feast-or-famine — big windfalls followed by sudden shifts. Great for entrepreneurs who thrive on uncertainty.",
    visitingHere: "You'll feel electrically inspired. Great for tech conferences, innovation workshops, brainstorming sessions, or any trip where you need fresh ideas. Expect the unexpected — plans may change suddenly but often for the better.",
    themes: ["Innovation", "Sudden changes", "Technology", "Startups", "Rebellion"],
    bestFor: ["Tech careers", "Startup launches", "Innovation", "Social activism"],
    challenges: ["Career instability", "Sudden reversals", "Difficulty with authority"],
  },
  "uranus-IC": {
    title: "Uranus at the Nadir",
    shortDesc: "Your awakening line. Home life is unconventional and ever-changing. You may move frequently or have an unusual living situation — but personal breakthroughs happen here.",
    livingHere: "Home life is anything but conventional. You may move frequently, have an unusual living arrangement, or experience sudden domestic changes. Inner awakenings and personal breakthroughs are common. Not great for settling down long-term, but transformative for short stints.",
    visitingHere: "Expect surprises. Accommodations may be unusual or plans may shift. Great for visiting quirky, off-the-beaten-path places or any trip where you're seeking a personal breakthrough or shake-up.",
    themes: ["Inner awakening", "Unconventional home", "Sudden changes", "Freedom"],
    bestFor: ["Personal breakthroughs", "Alternative living", "Breaking family patterns"],
    challenges: ["Domestic instability", "Restlessness", "Difficulty settling down"],
  },
  "uranus-ASC": {
    title: "Uranus on the Ascendant",
    shortDesc: "Your authentic self line. You become unapologetically original, eccentric, and brilliantly different. Others see you as a visionary — or a weirdo. Usually both.",
    livingHere: "You feel free to be completely yourself — quirks, eccentricities, and all. Others see you as unique, innovative, and perhaps ahead of your time. Technology and creative innovation come naturally. You attract unusual experiences and people who march to their own drum.",
    visitingHere: "You'll feel liberated and experimental. Perfect for solo travel, tech expos, art festivals, or any trip where you want to break out of your comfort zone. You'll try things you'd never try at home.",
    themes: ["Individuality", "Freedom", "Originality", "Technology", "Eccentricity"],
    bestFor: ["Self-discovery", "Creative innovation", "Technology", "Breaking free"],
    challenges: ["Alienation", "Unpredictability", "Difficulty with routine"],
  },
  "uranus-DSC": {
    title: "Uranus on the Descendant",
    shortDesc: "Your electric partnership line. Relationships start fast, feel exciting, and may end just as suddenly. You attract unconventional people who shake up your worldview.",
    livingHere: "Relationships here are exciting but unpredictable. You attract unconventional partners who challenge everything you thought you wanted. Partnerships may start or end suddenly. Open-minded relationship structures are more natural here than traditional ones.",
    visitingHere: "Expect to meet fascinating, unexpected people. Great for networking in unconventional spaces, attending unique events, or any situation where you want fresh perspectives. Not ideal for stability-seeking relationship trips.",
    themes: ["Unconventional partnerships", "Excitement", "Freedom in relationships"],
    bestFor: ["Open-minded relationships", "Creative partnerships", "Meeting visionary people"],
    challenges: ["Relationship instability", "Commitment issues", "Sudden breakups"],
  },
  "neptune-MC": {
    title: "Neptune on the Midheaven",
    shortDesc: "Your creative dream line. Careers in art, music, film, healing, or spirituality are amplified — but career direction can feel foggy. Beautiful for artists, confusing for everyone else.",
    livingHere: "Your career becomes intertwined with creativity, spirituality, or healing. Music, film, photography, and spiritual work thrive. Your public image has a dreamy, otherworldly quality that attracts fans. But practical career planning is difficult — goals shift like water. Be cautious with finances here; deception or confusion around money is possible.",
    visitingHere: "You'll feel dreamy, creative, and spiritually open. Perfect for art museums, music festivals, spiritual retreats, or any trip focused on inspiration and beauty. Not great for making major business decisions — your judgment is softer here.",
    themes: ["Creative career", "Spirituality", "Healing", "Imagination", "Art"],
    bestFor: ["Artistic career", "Spiritual work", "Healing professions", "Photography", "Music"],
    challenges: ["Career confusion", "Financial deception", "Lack of direction", "Addiction risk"],
  },
  "neptune-IC": {
    title: "Neptune at the Nadir",
    shortDesc: "Your spiritual home line. Dreams become vivid and your intuition deepens — but boundaries dissolve and it's easy to lose yourself. Powerful for meditation, risky for escapism.",
    livingHere: "This location dissolves boundaries between your inner world and the spiritual realm. Dreams become vivid, intuition sharpens, and you may feel a mystical connection to the land itself. Beautiful for spiritual practice — but be cautious. Escapism, substance sensitivity, and confusion about your foundations are real risks.",
    visitingHere: "You'll feel spacey but spiritually open. Perfect for meditation retreats, ayahuasca ceremonies, yoga intensives, or anywhere you want to connect with something greater. Keep your feet on the ground — don't sign contracts or make major decisions here.",
    themes: ["Spiritual connection", "Dreams", "Mysticism", "Dissolution"],
    bestFor: ["Spiritual retreat", "Meditation practice", "Artistic inspiration", "Healing"],
    challenges: ["Escapism", "Confusion about identity", "Boundary issues", "Addiction risk"],
  },
  "neptune-ASC": {
    title: "Neptune on the Ascendant",
    shortDesc: "Your mystic and illusion line. You become ethereal, intuitive, and magnetically mysterious — but identity gets foggy. Others project their fantasies onto you. Beautiful but disorienting.",
    livingHere: "You take on an ethereal, mysterious quality that fascinates others. Artistic and psychic abilities heighten. But your sense of self can blur — you absorb others' emotions, lose boundaries, and may struggle with who you really are. Substance sensitivity increases. Powerful for spiritual growth if you stay grounded.",
    visitingHere: "You'll feel otherworldly and impressionable. Great for spiritual pilgrimages, creative inspiration trips, or romantic getaways where you want to feel enchanted. Not ideal for practical tasks — you'll be in a fog. Protect your energy.",
    themes: ["Mysticism", "Compassion", "Artistic sensitivity", "Psychic ability"],
    bestFor: ["Spiritual development", "Art and music", "Healing others", "Compassionate work"],
    challenges: ["Identity confusion", "Being taken advantage of", "Substance sensitivity", "Escapism"],
  },
  "neptune-DSC": {
    title: "Neptune on the Descendant",
    shortDesc: "Your romantic fantasy line. Relationships feel fated and deeply romantic — but you may see people through rose-colored glasses. The love is beautiful, but watch for deception.",
    livingHere: "Relationships feel fated, spiritual, and deeply romantic. You attract sensitive, artistic partners and the connection can feel transcendent. But there's a real danger of idealizing partners — seeing who you want them to be, not who they are. Some of the most beautiful love stories happen here, and some of the most heartbreaking deceptions.",
    visitingHere: "Romance feels magical and cinematic. Perfect for honeymoons, proposal trips, or any deeply romantic getaway. But don't make permanent decisions about people you meet here — the fog clears later and reality may look different.",
    themes: ["Romantic fantasy", "Spiritual love", "Idealization", "Karmic bonds"],
    bestFor: ["Romantic getaways", "Artistic collaboration", "Spiritual partnerships"],
    challenges: ["Deception in relationships", "Idealizing partners", "Codependency", "Being misled"],
  },
  "pluto-MC": {
    title: "Pluto on the Midheaven",
    shortDesc: "Your power and transformation line. Career here involves intense ambition, hidden influence, and profound change. You'll gain real power — but power struggles and enemies come with it.",
    livingHere: "Power and transformation define your public life. You may be drawn to psychology, investigation, research, finance, or positions of behind-the-scenes influence. Your career undergoes profound transformations — you may completely reinvent yourself professionally. The money potential is high (think investments, research, crisis management) but so are the stakes.",
    visitingHere: "You'll feel the intensity immediately. Good for power moves — high-stakes meetings, investigative work, or situations requiring strategic influence. Not a relaxation spot. You'll feel driven, focused, and possibly paranoid.",
    themes: ["Power", "Transformation", "Influence", "Money", "Intensity"],
    bestFor: ["Psychology", "Finance", "Research", "Investigative work", "Power positions"],
    challenges: ["Power struggles", "Obsession with control", "Making enemies", "Intense scrutiny"],
  },
  "pluto-IC": {
    title: "Pluto at the Nadir",
    shortDesc: "Your psychological rebirth line. Profound inner transformation happens here — family secrets surface, old wounds reopen, and you emerge fundamentally changed. Intense but potentially life-altering.",
    livingHere: "This is one of the most intense lines to live on. Deep psychological changes occur, often triggered by family secrets, ancestral patterns, or personal demons surfacing. It's not comfortable — it's transformative. What emerges is a completely reborn version of yourself. Best approached with therapeutic support.",
    visitingHere: "Heavy emotional energy. You may feel compelled to dig into family history or confront old wounds. Not a vacation spot — it's a pilgrimage for deep personal work. Powerful for therapy retreats or ancestral research, but emotionally draining.",
    themes: ["Deep transformation", "Psychology", "Family secrets", "Rebirth"],
    bestFor: ["Deep therapy", "Shadow work", "Ancestral healing", "Personal rebirth"],
    challenges: ["Intense emotions", "Family power struggles", "Obsessive behavior", "Emotional crisis"],
  },
  "pluto-ASC": {
    title: "Pluto on the Ascendant",
    shortDesc: "Your metamorphosis line. You become intensely magnetic and powerful — people feel your presence before you speak. Personal transformation is inevitable here, and it changes you permanently.",
    livingHere: "You become intensely magnetic and powerful. Others feel your presence strongly — some are drawn in, others are intimidated. Personal transformation is inevitable — you shed old identities and emerge reborn. This line changes you forever. Not for the faint of heart, but the personal power you gain is unmatched.",
    visitingHere: "You'll feel powerful and intense. Others notice you immediately. Great for any situation where you need to command a room or make a lasting impression. Not ideal for casual, lighthearted trips — the energy is too heavy for relaxation.",
    themes: ["Personal transformation", "Magnetic power", "Intensity", "Rebirth"],
    bestFor: ["Personal reinvention", "Overcoming trauma", "Gaining personal power"],
    challenges: ["Overwhelming intensity", "Paranoia", "Power struggles", "Obsessive behavior"],
  },
  "pluto-DSC": {
    title: "Pluto on the Descendant",
    shortDesc: "Your intense relationship line. Partnerships here change you at the deepest level — for better or worse. The connections are magnetic and all-consuming. Never casual, never boring.",
    livingHere: "Relationships here are transformative and intense — there's no middle ground. You attract powerful partners who change you fundamentally. The chemistry is magnetic and the bonds go deep. But power struggles, jealousy, and control issues are equally likely. These relationships either heal you profoundly or burn you. Approach with self-awareness.",
    visitingHere: "Connections hit hard and fast. You may meet someone who makes an unforgettable impression, or deepen an existing relationship to a new level of intensity. Not for casual dating — the energy is too heavy. Good for couples therapy trips or intentional deep bonding.",
    themes: ["Transformative relationships", "Power dynamics", "Deep bonds", "Intensity"],
    bestFor: ["Deep bonding", "Transformative partnerships", "Couples therapy", "Psychology"],
    challenges: ["Obsessive relationships", "Power struggles", "Jealousy", "Manipulation"],
  },
  "chiron-MC": {
    title: "Chiron on the Midheaven",
    shortDesc: "Your healing reputation line. You're known for your wisdom, teaching, and capacity to heal others.",
    livingHere: "Your wounds become your greatest gifts here. You may be drawn to healing professions, teaching, or guiding others through their pain. Your public image carries a compassionate, mentoring quality. Career success comes through turning personal wounds into wisdom.",
    visitingHere: "You'll feel drawn to mentoring or teaching roles. Good for workshops, healing conferences, or any trip where sharing your experience helps others.",
    themes: ["Healing career", "Teaching", "Mentorship", "Wounded healer"],
    bestFor: ["Healing professions", "Teaching", "Counseling", "Spiritual guidance", "Alternative medicine"],
    challenges: ["Feeling exposed or judged", "Over-giving", "Difficulty with authority"],
  },
  "chiron-IC": {
    title: "Chiron at the Nadir",
    shortDesc: "Your healing roots line. Deep work on family wounds, ancestral healing, and emotional security.",
    livingHere: "This location brings you face-to-face with family and ancestral wounds. You may feel drawn to understand your roots, heal family patterns, or create a home that nurtures your deepest self. The healing that happens here is profound and lasting.",
    visitingHere: "Old family wounds may surface unexpectedly. Good for therapy retreats, ancestral research trips, or visiting childhood places with new understanding.",
    themes: ["Family healing", "Ancestral patterns", "Emotional wounds", "Roots"],
    bestFor: ["Family therapy", "Ancestral work", "Creating a healing home", "Inner child work"],
    challenges: ["Confronting painful family history", "Feeling unsupported", "Isolation"],
  },
  "chiron-ASC": {
    title: "Chiron on the Ascendant",
    shortDesc: "Your wounded healer identity line. You embody healing and wisdom through your presence.",
    livingHere: "Your very presence has a healing effect on others. You may have experienced early life wounds that shaped who you are, but here you learn to wear those wounds as badges of wisdom. Others seek you out for guidance and healing.",
    visitingHere: "You'll feel more empathetic and wise. Others may open up to you easily. Good for healing retreats or any trip where vulnerability and compassion lead.",
    themes: ["Healing presence", "Wisdom through pain", "Identity", "Compassion"],
    bestFor: ["Healing work", "Teaching", "Writing about transformation", "Advocacy"],
    challenges: ["Hypersensitivity", "Feeling like an outsider", "Over-identifying with wounds"],
  },
  "chiron-DSC": {
    title: "Chiron on the Descendant",
    shortDesc: "Your healing partnership line. Relationships that mirror your wounds and help you heal.",
    livingHere: "Partners here often reflect your wounds back to you - sometimes painfully, sometimes as catalysts for healing. You may attract people who need healing or who help you heal. Relationships become teachers, revealing what needs to be addressed.",
    visitingHere: "People you meet may trigger old wounds — but in a way that leads to insight. Good for couples therapy trips or meeting healers and counselors.",
    themes: ["Healing through others", "Mirror relationships", "Compassionate bonds", "Wounds in partnership"],
    bestFor: ["Healing partnerships", "Therapeutic relationships", "Finding a healing partner", "Counseling together"],
    challenges: ["Codependency", "Attracting wounded partners", "Difficulty with boundaries"],
  },
  // ── North Node ──
  "northnode-MC": {
    title: "North Node on the Midheaven",
    shortDesc: "Your destiny career line. Your life purpose unfolds through public achievement and vocation here.",
    livingHere: "Career opportunities here feel fated. You're drawn to work that aligns with your soul's purpose, and public recognition comes when you step into your destined role. This is one of the most powerful lines for finding your calling.",
    visitingHere: "Career clarity strikes. You may suddenly know your next move or meet someone who opens the right door. Great for career retreats or soul-searching trips about your professional path.",
    themes: ["Life purpose", "Destined career", "Soul growth", "Public mission"],
    bestFor: ["Finding your calling", "Career aligned with purpose", "Public leadership", "Meaningful work"],
    challenges: ["Fear of stepping into your purpose", "Outgrowing old career identities", "Pressure to evolve"],
  },
  "northnode-IC": {
    title: "North Node at the Nadir",
    shortDesc: "Your destiny roots line. Building the home and inner foundation your soul needs to grow.",
    livingHere: "You feel called to put down roots here in a way that feels deeply meaningful. Creating a home, building family connections, and doing inner work all feel like destiny rather than obligation. Your growth comes through emotional grounding.",
    visitingHere: "You'll feel an instant pull to this place — like it's been waiting for you. Great for house-hunting or any trip where you're considering a major life change around home and family.",
    themes: ["Destined home", "Soul foundations", "Emotional growth", "Family purpose"],
    bestFor: ["Building a meaningful home", "Family healing", "Emotional maturity", "Inner work"],
    challenges: ["Leaving behind old domestic patterns", "Vulnerability", "Confronting family karma"],
  },
  "northnode-ASC": {
    title: "North Node on the Ascendant",
    shortDesc: "Your destiny identity line. Who you're becoming is amplified and accelerated here.",
    livingHere: "This is a powerful line for personal evolution. You feel pulled toward becoming the truest version of yourself. Old identities fall away and your authentic self emerges. People here see you as you're meant to be.",
    visitingHere: "You'll feel a strong sense of becoming. Perfect for personal development retreats, milestone birthday trips, or any time you need to shed an old version of yourself.",
    themes: ["Personal destiny", "Authentic self", "Soul identity", "Evolution"],
    bestFor: ["Personal reinvention", "Spiritual growth", "Finding yourself", "New life chapters"],
    challenges: ["Identity crises", "Leaving comfort zones", "Growing pains"],
  },
  "northnode-DSC": {
    title: "North Node on the Descendant",
    shortDesc: "Your destiny partnership line. Fated relationships and soul contracts unfold here.",
    livingHere: "Relationships in this location feel destined. You meet people who are meant to be in your life — partners, collaborators, and teachers who accelerate your soul's growth. Partnerships push you toward your highest potential.",
    visitingHere: "You may meet someone significant — even on a short trip. Great for weddings, group retreats, or any situation where meaningful connections are likely to form.",
    themes: ["Fated partnerships", "Soul contracts", "Destined love", "Growth through others"],
    bestFor: ["Meeting significant partners", "Soul connections", "Collaborative destiny", "Marriage"],
    challenges: ["Over-reliance on partners for growth", "Karmic relationship intensity", "Letting go of past connections"],
  },
  // ── South Node ──
  "southnode-MC": {
    title: "South Node on the Midheaven",
    shortDesc: "Your karmic career line. Past-life talents and familiar career patterns surface here.",
    livingHere: "Career success comes easily here — perhaps too easily. You fall into familiar professional roles that feel comfortable but may not challenge you to grow. There's a risk of coasting on past-life skills rather than evolving.",
    visitingHere: "Work feels effortless but unchallenging. Good for coasting through comfortable projects, but not where you want to stretch yourself.",
    themes: ["Past-life talents", "Karmic career", "Comfort zone", "Familiar success"],
    bestFor: ["Using established skills", "Comfortable career", "Teaching from experience", "Winding down"],
    challenges: ["Stagnation", "Repeating old patterns", "Lack of growth", "Complacency"],
  },
  "southnode-IC": {
    title: "South Node at the Nadir",
    shortDesc: "Your karmic roots line. Deep familiarity with this place, possibly from past lives.",
    livingHere: "This place feels eerily familiar, like you've lived here before. Family patterns and ancestral karma are strong. While comforting, staying too long may keep you stuck in old emotional patterns rather than evolving.",
    visitingHere: "Instant déjà vu. You may feel like you've been here before. Great for short ancestral visits or nostalgia trips, but don't linger too long.",
    themes: ["Past-life home", "Ancestral karma", "Deep familiarity", "Emotional comfort"],
    bestFor: ["Connecting with past lives", "Understanding family karma", "Temporary retreat", "Ancestral research"],
    challenges: ["Emotional stagnation", "Clinging to the past", "Repeating family patterns"],
  },
  "southnode-ASC": {
    title: "South Node on the Ascendant",
    shortDesc: "Your karmic identity line. Past-life persona and default behaviors are strong here.",
    livingHere: "You revert to a very familiar version of yourself here — comfortable but potentially limiting. Others see the 'old you' rather than who you're becoming. It can feel safe but may stall personal growth.",
    visitingHere: "Comfortable but uninspiring. You'll slip into old habits easily. Fine for rest, but not where you want to go for personal growth.",
    themes: ["Past-life identity", "Default persona", "Karmic comfort", "Familiar self"],
    bestFor: ["Understanding past patterns", "Self-reflection", "Processing karma", "Rest and recovery"],
    challenges: ["Reverting to old habits", "Resistance to change", "Identity stagnation"],
  },
  "southnode-DSC": {
    title: "South Node on the Descendant",
    shortDesc: "Your karmic partnership line. Familiar relationship patterns and past-life connections.",
    livingHere: "You attract partners who feel deeply familiar — possibly karmic or past-life connections. Relationships here are comfortable but may replay old dynamics. Growth requires breaking free of habitual partnership patterns.",
    visitingHere: "You may run into people who feel strangely familiar. Interesting for exploring past connections, but watch for falling into old relationship patterns.",
    themes: ["Karmic relationships", "Past-life partners", "Familiar dynamics", "Relationship karma"],
    bestFor: ["Resolving past-life relationships", "Understanding relationship patterns", "Karmic closure"],
    challenges: ["Toxic familiarity", "Repeating relationship mistakes", "Codependent patterns"],
  },
  // ── Lilith ──
  "lilith-MC": {
    title: "Lilith on the Midheaven",
    shortDesc: "Your shadow power line. Raw authenticity, taboo-breaking, and magnetic public presence.",
    livingHere: "Your career takes on an unapologetically bold, provocative quality. You may be drawn to taboo subjects, sexuality, shadow work, or counter-cultural movements. Others find you magnetically powerful or deeply unsettling — rarely indifferent.",
    visitingHere: "You'll feel provocatively bold. Good for events where you want to make an unforgettable impression or break through self-imposed limits.",
    themes: ["Shadow power", "Taboo career", "Raw authenticity", "Provocation"],
    bestFor: ["Counter-cultural work", "Shadow work profession", "Sexuality", "Advocacy for the marginalized"],
    challenges: ["Scandal", "Being misunderstood", "Power struggles", "Alienating people"],
  },
  "lilith-IC": {
    title: "Lilith at the Nadir",
    shortDesc: "Your shadow roots line. Confronting repressed family dynamics and hidden domestic truths.",
    livingHere: "Family secrets and repressed dynamics surface here. You may confront the shadow side of your upbringing or discover hidden truths about your lineage. The home becomes a place of raw honesty and liberation from shame.",
    visitingHere: "Hidden truths may surface. Good for ancestral research or confronting family dynamics you've been avoiding.",
    themes: ["Family shadows", "Hidden truths", "Domestic liberation", "Ancestral secrets"],
    bestFor: ["Shadow work", "Uncovering family secrets", "Liberating from shame", "Reclaiming power"],
    challenges: ["Painful family revelations", "Domestic instability", "Feeling unsafe"],
  },
  "lilith-ASC": {
    title: "Lilith on the Ascendant",
    shortDesc: "Your wild self line. Untamed energy, magnetic sexuality, and fierce independence.",
    livingHere: "You become unapologetically yourself here — raw, magnetic, and impossible to ignore. Your sexuality and power are on full display. Others either adore or fear your intensity. Conformity becomes impossible.",
    visitingHere: "Expect to feel wild and uninhibited. Great for liberation trips, festivals, or any experience where you want to break free from expectations.",
    themes: ["Wild self", "Magnetic presence", "Fierce independence", "Sexual power"],
    bestFor: ["Self-liberation", "Embracing your shadow", "Creative expression", "Breaking free"],
    challenges: ["Intimidating others", "Social alienation", "Self-destructive tendencies", "Intensity burnout"],
  },
  "lilith-DSC": {
    title: "Lilith on the Descendant",
    shortDesc: "Your shadow partnership line. Intense, taboo, and transformatively raw relationships.",
    livingHere: "Relationships here are intense, primal, and often unconventional. You attract partners who embody shadow qualities — powerful, magnetic, and sometimes dangerous. These connections force you to confront your own desires and boundaries.",
    visitingHere: "Attractions run deep and primal. Not for casual dating trips — connections here are intense and boundary-pushing.",
    themes: ["Shadow relationships", "Primal attraction", "Taboo connections", "Power in partnership"],
    bestFor: ["Exploring relationship shadows", "Sexual liberation", "Embracing desire", "Boundary work"],
    challenges: ["Obsessive attractions", "Toxic relationships", "Power imbalances", "Jealousy"],
  },
  // ── Ceres ──
  "ceres-MC": {
    title: "Ceres on the Midheaven",
    shortDesc: "Your nurturing career line. Known for caregiving, sustainability, and nourishing others.",
    livingHere: "Your public role revolves around nurturing and sustaining others. You may be drawn to food, agriculture, healthcare, environmental work, or education. People see you as a provider and caretaker.",
    visitingHere: "You'll feel drawn to caregiving and nourishing roles. Great for wellness conferences, farm visits, or healthcare-related trips.",
    themes: ["Nurturing career", "Sustainability", "Caregiving", "Nourishment"],
    bestFor: ["Healthcare", "Agriculture", "Environmental work", "Teaching", "Food industry"],
    challenges: ["Over-giving professionally", "Neglecting your own needs", "Burnout from caregiving"],
  },
  "ceres-IC": {
    title: "Ceres at the Nadir",
    shortDesc: "Your nurturing home line. Deep maternal energy, food, and cyclical renewal at home.",
    livingHere: "Home becomes a place of deep nourishment — you may develop a love of cooking, gardening, or creating a nurturing environment. Mother-child bonds are emphasized. There's a strong connection to the earth and natural cycles.",
    visitingHere: "You'll crave comfort food and earthy experiences. Perfect for farm stays, cooking retreats, or reconnecting with nature.",
    themes: ["Nurturing home", "Earth connection", "Maternal bonds", "Natural cycles"],
    bestFor: ["Homemaking", "Gardening", "Raising children", "Connection to nature", "Cooking"],
    challenges: ["Over-attachment to home", "Mothering issues surfacing", "Grief over loss"],
  },
  "ceres-ASC": {
    title: "Ceres on the Ascendant",
    shortDesc: "Your nurturer identity line. You radiate warmth, care, and sustaining energy.",
    livingHere: "You naturally become the caretaker and nurturer in every situation. Others are drawn to your warmth and sustaining presence. Your body may respond to this location with changes in appetite, fertility, or connection to natural rhythms.",
    visitingHere: "You'll feel warm, generous, and attuned to your body. Great for wellness retreats or fertility-related trips.",
    themes: ["Nurturing presence", "Warmth", "Fertility", "Earth mother energy"],
    bestFor: ["Becoming a caretaker", "Fertility", "Body awareness", "Community building"],
    challenges: ["Losing identity in caregiving", "Smothering", "Neglecting yourself"],
  },
  "ceres-DSC": {
    title: "Ceres on the Descendant",
    shortDesc: "Your nurturing partnership line. Relationships defined by mutual care and sustenance.",
    livingHere: "Partnerships here are deeply nurturing. You attract caregivers or become one yourself in relationships. There's a strong theme of feeding, sustaining, and growing together. Parent-like dynamics may emerge.",
    visitingHere: "Relationships feel warm and supportive. Good for couples retreats focused on mutual care and nourishment.",
    themes: ["Nurturing partnerships", "Mutual care", "Sustenance", "Growth together"],
    bestFor: ["Finding a nurturing partner", "Co-parenting", "Building together", "Healing through care"],
    challenges: ["Parent-child dynamics in relationships", "Smothering partners", "Grief in partnerships"],
  },
  // ── Pallas ──
  "pallas-MC": {
    title: "Pallas on the Midheaven",
    shortDesc: "Your strategic wisdom line. Recognized for pattern recognition, strategy, and creative intelligence.",
    livingHere: "Your career benefits from sharp strategic thinking and creative problem-solving. You may be drawn to law, politics, technology, or the arts. Others recognize your ability to see patterns others miss.",
    visitingHere: "Your strategic mind sharpens. Great for business strategy sessions, legal consultations, or creative problem-solving retreats.",
    themes: ["Strategic career", "Pattern recognition", "Creative intelligence", "Wisdom"],
    bestFor: ["Law", "Politics", "Technology", "Strategic consulting", "Art and design"],
    challenges: ["Over-intellectualizing", "Analysis paralysis", "Conflict with less strategic minds"],
  },
  "pallas-IC": {
    title: "Pallas at the Nadir",
    shortDesc: "Your inner strategist line. Deep wisdom, pattern recognition in family, and creative foundations.",
    livingHere: "You develop a deep inner wisdom about family patterns and personal foundations. Your home may become a creative workshop or study. You see the hidden architecture of your emotional life with unusual clarity.",
    visitingHere: "You'll see patterns and connections you normally miss. Good for journaling retreats or planning sessions at home.",
    themes: ["Inner wisdom", "Family patterns", "Creative foundations", "Strategic home"],
    bestFor: ["Creative projects at home", "Understanding family dynamics", "Strategic planning", "Study"],
    challenges: ["Over-analyzing family", "Emotional detachment", "Perfectionism at home"],
  },
  "pallas-ASC": {
    title: "Pallas on the Ascendant",
    shortDesc: "Your warrior wisdom line. You project intelligence, strategy, and creative brilliance.",
    livingHere: "You come across as sharp, strategic, and creatively brilliant. Others seek your counsel for complex problems. Your ability to see patterns, create solutions, and navigate politics is at its peak.",
    visitingHere: "You'll feel brilliantly sharp and strategic. Perfect for conferences, negotiations, or creative brainstorming trips.",
    themes: ["Strategic presence", "Creative brilliance", "Wisdom projection", "Problem-solving"],
    bestFor: ["Leadership through wisdom", "Creative pursuits", "Conflict resolution", "Mentoring"],
    challenges: ["Appearing cold or calculating", "Difficulty with emotional vulnerability", "Perfectionism"],
  },
  "pallas-DSC": {
    title: "Pallas on the Descendant",
    shortDesc: "Your strategic partnership line. Attracting wise, creative, and strategically minded partners.",
    livingHere: "You attract intellectually sharp, strategically minded partners. Relationships are built on mutual respect for intelligence and creative collaboration. Business partnerships thrive on shared vision.",
    visitingHere: "You'll attract sharp, strategic people. Great for finding collaborators, co-founders, or intellectual sparring partners.",
    themes: ["Wise partnerships", "Creative collaboration", "Strategic alliances", "Intellectual bonds"],
    bestFor: ["Business partnerships", "Creative collaboration", "Finding a wise partner", "Legal alliances"],
    challenges: ["Overly intellectual relationships", "Power plays", "Lack of emotional warmth"],
  },
  // ── Juno ──
  "juno-MC": {
    title: "Juno on the Midheaven",
    shortDesc: "Your committed partnership career line. Known for loyalty, fairness, and advocacy for equality.",
    livingHere: "Your public image is tied to themes of partnership, equality, and commitment. You may be drawn to marriage counseling, advocacy, law, or any field promoting fairness. Others see you as deeply loyal and principled.",
    visitingHere: "Themes of fairness and loyalty come into focus. Good for attending weddings, advocacy events, or equality-focused conferences.",
    themes: ["Partnership career", "Equality", "Commitment", "Loyalty"],
    bestFor: ["Counseling", "Advocacy", "Law", "Human rights", "Partnership-based business"],
    challenges: ["Over-identifying with partnerships", "Jealousy in public life", "Power imbalances"],
  },
  "juno-IC": {
    title: "Juno at the Nadir",
    shortDesc: "Your committed home line. Deep need for loyalty, equality, and sacred partnership at home.",
    livingHere: "Home life revolves around partnership dynamics — loyalty, fairness, and mutual commitment. You may be drawn to create a deeply egalitarian household. Issues of trust and fidelity in the home are amplified.",
    visitingHere: "Partnership dynamics in the home feel amplified. Good for couples trips focused on rebuilding trust or deepening commitment.",
    themes: ["Partnership at home", "Loyalty", "Domestic equality", "Sacred bond"],
    bestFor: ["Building a committed household", "Marriage", "Domestic harmony", "Trust building"],
    challenges: ["Jealousy at home", "Power struggles with partner", "Possessiveness"],
  },
  "juno-ASC": {
    title: "Juno on the Ascendant",
    shortDesc: "Your commitment identity line. You radiate loyalty, partnership energy, and fairness.",
    livingHere: "You naturally attract committed partnerships and project an aura of loyalty and fairness. Others see you as someone they can trust and commit to. You may find yourself constantly approached for partnership — romantic and professional.",
    visitingHere: "People see you as trustworthy and partnership-worthy. Great for meeting potential long-term partners or building loyal alliances.",
    themes: ["Partnership magnetism", "Loyalty", "Fairness", "Commitment aura"],
    bestFor: ["Attracting committed partners", "Marriage", "Building trust", "Partnership roles"],
    challenges: ["Losing individuality in partnerships", "Attracting possessive people", "Jealousy"],
  },
  "juno-DSC": {
    title: "Juno on the Descendant",
    shortDesc: "Your sacred partnership line. Where soul-level commitment and marriage are most powerful.",
    livingHere: "This is one of the strongest lines for committed, lasting partnerships. You attract loyal, devoted partners who want to build something lasting. Marriage formed here tends to be deeply bonded and meaningful.",
    visitingHere: "Perfect for proposals, vow renewals, or commitment ceremonies. The energy deeply supports lasting bonds.",
    themes: ["Sacred marriage", "Soul commitment", "Devoted partners", "Lasting bonds"],
    bestFor: ["Marriage", "Long-term commitment", "Finding a devoted partner", "Renewing vows"],
    challenges: ["Possessiveness", "Unrealistic commitment expectations", "Jealousy", "Codependency"],
  },
  // ── Vesta ──
  "vesta-MC": {
    title: "Vesta on the Midheaven",
    shortDesc: "Your sacred focus career line. Recognized for devotion, dedication, and spiritual commitment.",
    livingHere: "Your career takes on a devotional quality. You may be drawn to spiritual work, research, service, or any field requiring intense focus and dedication. Others see you as deeply committed and almost priest-like in your vocation.",
    visitingHere: "You'll feel focused and devoted to your purpose. Great for work retreats, research trips, or spiritual conferences.",
    themes: ["Devotional career", "Sacred work", "Focus", "Service"],
    bestFor: ["Spiritual vocation", "Research", "Service work", "Monasticism", "Focused craft"],
    challenges: ["Workaholism", "Burnout from devotion", "Neglecting personal life", "Isolation"],
  },
  "vesta-IC": {
    title: "Vesta at the Nadir",
    shortDesc: "Your sacred hearth line. The home becomes a temple of devotion and inner focus.",
    livingHere: "Your home becomes a sanctuary — a place of ritual, meditation, and deep inner focus. You may create altars, practice daily rituals, or simply find that your living space has a sacred quality. Solitude is valued here.",
    visitingHere: "You'll crave solitude and sacred space. Perfect for meditation retreats, silent retreats, or solo spiritual journeys.",
    themes: ["Sacred home", "Inner devotion", "Rituals", "Sanctuary"],
    bestFor: ["Creating a sacred space", "Meditation practice", "Solitary retreat", "Inner work"],
    challenges: ["Isolation", "Neglecting relationships for inner work", "Asceticism"],
  },
  "vesta-ASC": {
    title: "Vesta on the Ascendant",
    shortDesc: "Your devotion identity line. You project focused dedication, purity, and spiritual intensity.",
    livingHere: "You become deeply focused and dedicated here, almost singularly committed to your path. Others see you as intensely devoted and spiritually powerful. Personal desires may take a backseat to your sacred purpose.",
    visitingHere: "Deep focus comes naturally. Great for writing retreats, intensive study, or any trip where single-minded dedication is the goal.",
    themes: ["Sacred identity", "Devotion", "Focused presence", "Spiritual intensity"],
    bestFor: ["Spiritual development", "Focused creative work", "Self-discipline", "Service"],
    challenges: ["Repression of desires", "Social isolation", "Burnout", "Martyrdom"],
  },
  "vesta-DSC": {
    title: "Vesta on the Descendant",
    shortDesc: "Your sacred partnership line. Relationships built on shared devotion, service, and spiritual focus.",
    livingHere: "Partnerships here are built on shared purpose and mutual devotion. You attract partners who share your commitment to a cause, practice, or spiritual path. Relationships feel more like sacred bonds than casual connections.",
    visitingHere: "You may meet someone who shares your deeper purpose. Good for service-oriented group trips or spiritual community gatherings.",
    themes: ["Devoted partnerships", "Shared purpose", "Sacred bonds", "Service together"],
    bestFor: ["Finding a spiritual partner", "Shared devotion", "Working together in service"],
    challenges: ["Neglecting romance for purpose", "Partners competing for devotion", "Emotional coldness"],
  },
};

export function getInterpretation(planet: PlanetName, lineType: LineType): Interpretation {
  const key = `${planet}-${lineType}`;
  return (
    interpretations[key] || {
      title: `${planet} ${lineType}`,
      shortDesc: "Interpretation not available.",
      livingHere: "",
      visitingHere: "",
      themes: [],
      bestFor: [],
      challenges: [],
    }
  );
}

// ── East / West side-of-line system ─────────────────────────────────
// Based on relocation chart house shifts:
// West of any line → planet stays ANGULAR (direct, powerful expression)
// East of any line → planet shifts to CADENT house (subtler, internalized)

const SIDE_DATA: Record<LineType, { westHouse: string; eastHouse: string; westLabel: string; eastLabel: string }> = {
  ASC: {
    westHouse: "1st house",
    eastHouse: "12th house",
    westLabel: "self-expression & identity",
    eastLabel: "subconscious, dreams & spiritual life",
  },
  MC: {
    westHouse: "10th house",
    eastHouse: "9th house",
    westLabel: "career, reputation & public life",
    eastLabel: "travel, philosophy & higher learning",
  },
  DSC: {
    westHouse: "7th house",
    eastHouse: "6th house",
    westLabel: "partnerships & close relationships",
    eastLabel: "daily routines, health & service",
  },
  IC: {
    westHouse: "4th house",
    eastHouse: "3rd house",
    westLabel: "home, family & emotional roots",
    eastLabel: "communication, local community & learning",
  },
};

function getPreferredSide(planet: PlanetName, lineType: LineType): "west" | "east" | "both" {
  // Benefic planets: better on west (angular = full direct benefit)
  if (["venus", "jupiter", "sun", "moon", "northnode"].includes(planet)) return "west";
  // Intense planets: often gentler on east (cadent = less overwhelming)
  if (["saturn", "pluto"].includes(planet)) return "east";
  if (planet === "mars" && (lineType === "ASC" || lineType === "DSC")) return "east";
  if (planet === "neptune" && (lineType === "ASC" || lineType === "IC")) return "east";
  // Everything else: depends on your goals
  return "both";
}

export function getSideOfLineInfo(planet: PlanetName, lineType: LineType, sentiment?: "positive" | "difficult" | "neutral"): SideOfLineInfo {
  const data = SIDE_DATA[lineType];
  const preferred = getPreferredSide(planet, lineType);
  const planetLabel = getPlanetSymbol(planet);
  const isDifficult = sentiment === "difficult" || ["saturn", "pluto"].includes(planet) ||
    (planet === "mars" && (lineType === "ASC" || lineType === "DSC" || lineType === "MC")) ||
    (planet === "neptune" && (lineType === "ASC" || lineType === "IC"));

  let summary: string;
  let westDesc: string;
  let eastDesc: string;

  if (isDifficult) {
    summary = preferred === "east"
      ? `Less challenging on the eastern side of the line.`
      : preferred === "west"
        ? `More intense on the western side of the line.`
        : `Intensity varies by side — both have trade-offs.`;
    westDesc = `West of the line, ${planetLabel} sits in your ${data.westHouse} — its challenging energy hits at full force through your ${data.westLabel}. Expect the difficulties to be more direct and unavoidable.`;
    eastDesc = `East of the line, ${planetLabel} shifts to your ${data.eastHouse} — its intensity is softened through your ${data.eastLabel}. Challenges are still present but more manageable and internalized.`;
  } else {
    summary = preferred === "west"
      ? `More beneficial on the western side of the line.`
      : preferred === "east"
        ? `Subtler on the eastern side of the line.`
        : `Both sides offer value — depends on your goals.`;
    westDesc = `West of the line, ${planetLabel} sits in your ${data.westHouse} — its energy directly shapes your ${data.westLabel}. The benefits are more visible and tangible.`;
    eastDesc = `East of the line, ${planetLabel} shifts to your ${data.eastHouse} — its energy works through your ${data.eastLabel}. The benefits are subtler and more internalized.`;
  }

  return {
    preferredSide: preferred,
    summary,
    westHouse: data.westHouse,
    eastHouse: data.eastHouse,
    westDesc,
    eastDesc,
  };
}

export function getPlanetSymbol(planet: PlanetName): string {
  const symbols: Record<PlanetName, string> = {
    sun: "Sun",
    moon: "Moon",
    mercury: "Mercury",
    venus: "Venus",
    mars: "Mars",
    jupiter: "Jupiter",
    saturn: "Saturn",
    uranus: "Uranus",
    neptune: "Neptune",
    pluto: "Pluto",
    chiron: "Chiron",
    northnode: "North Node",
    southnode: "South Node",
    lilith: "Lilith",
    ceres: "Ceres",
    pallas: "Pallas",
    juno: "Juno",
    vesta: "Vesta",
  };
  return symbols[planet] || planet;
}

export function getPlanetIcon(planet: PlanetName): string {
  const icons: Record<PlanetName, string> = {
    sun: "sunny",
    moon: "moon",
    mercury: "flash",
    venus: "heart",
    mars: "flame",
    jupiter: "star",
    saturn: "time",
    uranus: "thunderstorm",
    neptune: "water",
    pluto: "skull",
    chiron: "medkit",
    northnode: "arrow-up",
    southnode: "arrow-down",
    lilith: "eye",
    ceres: "leaf",
    pallas: "shield",
    juno: "link",
    vesta: "bonfire",
  };
  return icons[planet] || "planet";
}
