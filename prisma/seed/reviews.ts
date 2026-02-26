import { PrismaClient, BrewMethod, ReviewStatus } from "@prisma/client";
import { calculateCompletenessScore } from "../../lib/reviews/completeness-score";

// --- 115 Coffee-Enthusiast Personas ---
const REVIEW_USERS = [
  { name: "Ana Morales", email: "ana.morales@example.com" },
  { name: "James Park", email: "james.v60@example.com" },
  { name: "Rachel Foster", email: "rachel.chemex@example.com" },
  { name: "David Okonkwo", email: "david.brew@example.com" },
  { name: "Yuki Tanaka", email: "yuki.espresso@example.com" },
  { name: "Priya Sharma", email: "priya.coffee@example.com" },
  { name: "Marcus Williams", email: "marcus.roast@example.com" },
  { name: "Lea Hoffman", email: "lea.hoffman@example.com" },
  { name: "Carlos Reyes", email: "carlos.aeropress@example.com" },
  { name: "Sophie Kim", email: "sophie.pourover@example.com" },
  { name: "Ethan Nakamura", email: "ethan.nakamura@example.com" },
  { name: "Olivia Chen", email: "olivia.chen@example.com" },
  { name: "Mateo Gutierrez", email: "mateo.gutierrez@example.com" },
  { name: "Fatima Al-Rashid", email: "fatima.rashid@example.com" },
  { name: "Noah Bennett", email: "noah.bennett@example.com" },
  { name: "Isabella Torres", email: "isabella.torres@example.com" },
  { name: "Liam O'Sullivan", email: "liam.osullivan@example.com" },
  { name: "Amara Johnson", email: "amara.johnson@example.com" },
  { name: "Felix Andersen", email: "felix.andersen@example.com" },
  { name: "Mia Zhang", email: "mia.zhang@example.com" },
  { name: "Raj Patel", email: "raj.patel@example.com" },
  { name: "Elena Rossi", email: "elena.rossi@example.com" },
  { name: "Owen Murphy", email: "owen.murphy@example.com" },
  { name: "Zara Ahmed", email: "zara.ahmed@example.com" },
  { name: "Lucas Fernandez", email: "lucas.fernandez@example.com" },
  { name: "Chloe Martin", email: "chloe.martin@example.com" },
  { name: "Aiden Wright", email: "aiden.wright@example.com" },
  { name: "Nina Petrova", email: "nina.petrova@example.com" },
  { name: "Samuel Green", email: "samuel.green@example.com" },
  { name: "Hana Watanabe", email: "hana.watanabe@example.com" },
  { name: "Daniel Costa", email: "daniel.costa@example.com" },
  { name: "Grace Liu", email: "grace.liu@example.com" },
  { name: "Benjamin Taylor", email: "ben.taylor@example.com" },
  { name: "Suki Nair", email: "suki.nair@example.com" },
  { name: "Max Johansson", email: "max.johansson@example.com" },
  { name: "Aria Sanchez", email: "aria.sanchez@example.com" },
  { name: "Koji Yamamoto", email: "koji.yamamoto@example.com" },
  { name: "Elise Dupont", email: "elise.dupont@example.com" },
  { name: "Ryan Mitchell", email: "ryan.mitchell@example.com" },
  { name: "Ava Robinson", email: "ava.robinson@example.com" },
  { name: "Omar Hassan", email: "omar.hassan@example.com" },
  { name: "Lily Evans", email: "lily.evans@example.com" },
  { name: "Adrian Popescu", email: "adrian.popescu@example.com" },
  { name: "Maya Singh", email: "maya.singh@example.com" },
  { name: "Tobias Muller", email: "tobias.muller@example.com" },
  { name: "Carmen Vega", email: "carmen.vega@example.com" },
  { name: "Tyler Adams", email: "tyler.adams@example.com" },
  { name: "Freya Larsen", email: "freya.larsen@example.com" },
  { name: "Ichiro Sato", email: "ichiro.sato@example.com" },
  { name: "Rosa Delgado", email: "rosa.delgado@example.com" },
  { name: "Patrick O'Brien", email: "patrick.obrien@example.com" },
  { name: "Mei-Lin Wu", email: "meilin.wu@example.com" },
  { name: "Sebastian Cruz", email: "sebastian.cruz@example.com" },
  { name: "Alicia Brown", email: "alicia.brown@example.com" },
  { name: "Henrik Berg", email: "henrik.berg@example.com" },
  { name: "Nadia Okafor", email: "nadia.okafor@example.com" },
  { name: "Jack Thompson", email: "jack.thompson@example.com" },
  { name: "Ines Garcia", email: "ines.garcia@example.com" },
  { name: "Victor Ivanov", email: "victor.ivanov@example.com" },
  { name: "Hannah Lee", email: "hannah.lee@example.com" },
  { name: "Marco Bianchi", email: "marco.bianchi@example.com" },
  { name: "Sonia Kwan", email: "sonia.kwan@example.com" },
  { name: "Derek Hall", email: "derek.hall@example.com" },
  { name: "Layla Bakr", email: "layla.bakr@example.com" },
  { name: "Oliver Scott", email: "oliver.scott@example.com" },
  { name: "Camille Leroy", email: "camille.leroy@example.com" },
  { name: "Andrei Volkov", email: "andrei.volkov@example.com" },
  { name: "Jasmine Pham", email: "jasmine.pham@example.com" },
  { name: "Nathan Reed", email: "nathan.reed@example.com" },
  { name: "Dina Khoury", email: "dina.khoury@example.com" },
  { name: "Leo Eriksson", email: "leo.eriksson@example.com" },
  { name: "Vera Schneider", email: "vera.schneider@example.com" },
  { name: "Isaac Clark", email: "isaac.clark@example.com" },
  { name: "Yara Mendez", email: "yara.mendez@example.com" },
  { name: "Paul Fischer", email: "paul.fischer@example.com" },
  { name: "Luna Martinez", email: "luna.martinez@example.com" },
  { name: "Kevin Ng", email: "kevin.ng@example.com" },
  { name: "Bianca Rosetti", email: "bianca.rosetti@example.com" },
  { name: "Jake Wilson", email: "jake.wilson@example.com" },
  { name: "Noor Hussain", email: "noor.hussain@example.com" },
  { name: "Stella Park", email: "stella.park@example.com" },
  { name: "Hugo Lefebvre", email: "hugo.lefebvre@example.com" },
  { name: "Tanya Kozlov", email: "tanya.kozlov@example.com" },
  { name: "Callum Stewart", email: "callum.stewart@example.com" },
  { name: "Anita Das", email: "anita.das@example.com" },
  { name: "Erik Lindqvist", email: "erik.lindqvist@example.com" },
  { name: "Maria Oliveira", email: "maria.oliveira@example.com" },
  { name: "Alex Rivera", email: "alex.rivera.r@example.com" },
  { name: "Seo-Yeon Choi", email: "seoyeon.choi@example.com" },
  { name: "Dante Moretti", email: "dante.moretti@example.com" },
  { name: "Fiona Campbell", email: "fiona.campbell@example.com" },
  { name: "Hassan Yilmaz", email: "hassan.yilmaz@example.com" },
  { name: "Ingrid Nilsen", email: "ingrid.nilsen@example.com" },
  { name: "Jordan Blake", email: "jordan.blake@example.com" },
  { name: "Kira Volkov", email: "kira.volkov@example.com" },
  { name: "Luis Herrera", email: "luis.herrera@example.com" },
  { name: "Megan Price", email: "megan.price@example.com" },
  { name: "Nikolai Petrov", email: "nikolai.petrov@example.com" },
  { name: "Opal Chang", email: "opal.chang@example.com" },
  { name: "Pierre Duval", email: "pierre.duval@example.com" },
  { name: "Quinn Donovan", email: "quinn.donovan@example.com" },
  { name: "Rina Taniguchi", email: "rina.taniguchi@example.com" },
  { name: "Simon Kraft", email: "simon.kraft@example.com" },
  { name: "Thea Holmberg", email: "thea.holmberg@example.com" },
  { name: "Uma Reddy", email: "uma.reddy@example.com" },
  { name: "Viola Brandt", email: "viola.brandt@example.com" },
  { name: "Wesley Ford", email: "wesley.ford@example.com" },
  { name: "Xin Li", email: "xin.li@example.com" },
  { name: "Youssef Amine", email: "youssef.amine@example.com" },
  { name: "Zoe Harper", email: "zoe.harper@example.com" },
  { name: "Akiko Mori", email: "akiko.mori@example.com" },
  { name: "Boris Novak", email: "boris.novak@example.com" },
  { name: "Clara Weiss", email: "clara.weiss@example.com" },
  { name: "Diego Salazar", email: "diego.salazar@example.com" },
];

// --- Review data per product slug ---
interface ReviewSeed {
  rating: number;
  title?: string;
  content: string;
  brewMethod?: BrewMethod;
  grindSize?: string;
  waterTempF?: number;
  ratio?: string;
  tastingNotes?: string[];
  /** Review status — defaults to PUBLISHED */
  status?: ReviewStatus;
  /** Reason for flagging (when status is FLAGGED) */
  flagReason?: string;
  /** Admin response / comment on the review */
  adminResponse?: string;
  /** Index into REVIEW_USERS — assigned at definition time to ensure uniqueness per product */
  userIndex: number;
  /** Days ago this review was created */
  daysAgo: number;
}

// Helper to produce a date N days ago with slight time variance
function daysAgoDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 14) + 7); // 7am-9pm
  d.setMinutes(Math.floor(Math.random() * 60));
  return d;
}

const PRODUCT_REVIEWS: Record<string, ReviewSeed[]> = {
  "ethiopian-yirgacheffe": [
    {
      rating: 5, userIndex: 0, daysAgo: 78,
      title: "Absolutely stunning complexity",
      content: "This is one of the most layered cups I've ever brewed. I used my V60 with a 1:16 ratio at 200°F and the bergamot note hit me first, followed by waves of blueberry and jasmine. The finish is incredibly clean — almost tea-like. I've been buying specialty coffee for years and this ranks in my top 5. Ground at 18 clicks on my Comandante, 30-second bloom with 40g water, then slow continuous pour. Total brew time was about 3:15.",
      brewMethod: "POUR_OVER_V60", grindSize: "18 clicks Comandante (medium-fine)", waterTempF: 200, ratio: "1:16",
      tastingNotes: ["Bergamot", "Blueberry", "Jasmine"],
    },
    {
      rating: 5, userIndex: 1, daysAgo: 65,
      title: "Perfect for V60",
      content: "Bright, floral, and incredibly clean. The blueberry really comes through on a V60 at 200°F. One of the best light roasts I've had this year.",
      brewMethod: "POUR_OVER_V60", waterTempF: 200, ratio: "1:15",
      tastingNotes: ["Blueberry", "Floral"],
    },
    {
      rating: 4, userIndex: 2, daysAgo: 52,
      title: "Exceptional on Chemex",
      content: "Brewed this on my Chemex and the clarity is remarkable. The jasmine notes are subtle but present. I wish the bag was a bit larger for the price, but the quality is undeniable. Water at 202°F with a medium grind gave me the best results after a few attempts.",
      brewMethod: "CHEMEX", waterTempF: 202, grindSize: "Medium",
      tastingNotes: ["Jasmine", "Citrus"],
    },
    {
      rating: 5, userIndex: 3, daysAgo: 41,
      content: "Wow. Just wow. The tasting notes are spot on. Easily a 5-star coffee.",
    },
    {
      rating: 4, userIndex: 4, daysAgo: 30,
      content: "Very good light roast. I prefer darker coffees usually but this won me over. The fruit notes are genuine, not just marketing.",
      brewMethod: "AEROPRESS",
    },
    {
      rating: 5, userIndex: 5, daysAgo: 18,
      title: "My new daily driver",
      content: "I keep coming back to this one. Brewed as a V60 with 15g coffee to 250g water at 200°F. 30-second bloom, finish by 2:45. The bergamot note is something special — it's like Earl Grey meets specialty coffee. Absolutely worth the premium.",
      brewMethod: "POUR_OVER_V60", waterTempF: 200, ratio: "1:16.7", grindSize: "Medium-fine",
      tastingNotes: ["Bergamot", "Blueberry"],
    },
    {
      rating: 4, userIndex: 6, daysAgo: 10,
      content: "Solid Ethiopian coffee. Nice and fruity without being too acidic. Works well on Chemex.",
      brewMethod: "CHEMEX",
    },
    {
      rating: 3, userIndex: 7, daysAgo: 5,
      content: "Good coffee but maybe a bit too light for my taste. The floral notes are nice if you're into that sort of thing. I might try a longer extraction next time.",
    },
    {
      rating: 5, userIndex: 60, daysAgo: 48,
      title: "Phenomenal light roast",
      content: "I've been on a light roast kick and this Yirgacheffe is the highlight. Brewed on my V60 at 200°F with a 1:15.5 ratio. The blueberry note is front and center but there's also a lovely jasmine tea quality in the finish. Incredibly clean cup.",
      brewMethod: "POUR_OVER_V60", waterTempF: 200, ratio: "1:15.5",
      tastingNotes: ["Blueberry", "Jasmine"],
    },
    {
      rating: 4, userIndex: 61, daysAgo: 38,
      content: "Really nice Ethiopian. AeroPress inverted method brings out more body while keeping the fruity sweetness. I do 16g coffee, 200g water at 195°F for 90 seconds.",
      brewMethod: "AEROPRESS", waterTempF: 195, ratio: "1:12.5",
    },
    {
      rating: 5, userIndex: 62, daysAgo: 25,
      title: "Best Ethiopian I've had",
      content: "Every cup is a revelation. The bergamot note is so distinctive — it's like nothing else in my coffee rotation. I grind at 15 clicks on my Timemore and do a slow V60 pour. Absolute perfection.",
      brewMethod: "POUR_OVER_V60", grindSize: "15 clicks Timemore",
      tastingNotes: ["Bergamot", "Floral"],
    },
    {
      rating: 4, userIndex: 63, daysAgo: 16,
      content: "Solid light roast. Very clean and fruity. Works great on Chemex with a medium-coarse grind.",
      brewMethod: "CHEMEX", grindSize: "Medium-coarse",
    },
    {
      rating: 5, userIndex: 64, daysAgo: 2,
      title: "Subscribed after first bag",
      content: "Ordered this on a whim and immediately set up a subscription. The fruit-forward profile is addictive. Every morning I look forward to brewing this. Exceptional quality for the price point.",
      tastingNotes: ["Blueberry", "Bergamot"],
    },
    {
      rating: 5, userIndex: 65, daysAgo: 14,
      title: "Best coffee in the city",
      content: "Been ordering from Artisan Roast for a while now and this Yirgacheffe is outstanding. The jasmine florals are so prominent. Brewed it on my V60 at 201°F and the cup was silky smooth with a beautiful lemon finish.",
      brewMethod: "POUR_OVER_V60", waterTempF: 201, ratio: "1:16",
      tastingNotes: ["Jasmine", "Lemon"],
      adminResponse: "Thank you for the kind words! We're so glad you're enjoying the Yirgacheffe — it's one of our favorites too. The jasmine really shines with a V60 pour. Cheers!",
    },
    {
      rating: 1, userIndex: 66, daysAgo: 8,
      title: "Not what I expected",
      content: "This coffee tastes nothing like coffee. Way too sour and acidic. I want a refund. Also the bag arrived with a small tear. Would not recommend to anyone. Terrible experience overall. GO BUY FROM [competitor name] INSTEAD.",
      status: "FLAGGED" as ReviewStatus,
      flagReason: "Promotional content for competitor; potentially inauthentic review",
      adminResponse: "We're sorry about the damaged packaging — please contact support@artisanroast.com and we'll make it right. Light roasts do have brighter acidity than darker roasts, so if you prefer a bolder cup we'd recommend our Sumatra or Colombian blends. However, this review has been flagged for containing promotional content for a competitor.",
    },
  ],

  "kenya-aa": [
    {
      rating: 5, userIndex: 8, daysAgo: 72,
      title: "Bold and bright — a perfect pairing",
      content: "Kenya AA is always a treat, and Artisan Roast nailed this one. I brewed it on my V60 at 201°F with a 1:15 ratio, grinding at 20 clicks on my Comandante. The black currant acidity hits immediately, followed by a deep tomato-like sweetness that's hard to describe but instantly recognizable. I paired it with dark chocolate and it was heavenly. The finish has a grapefruit tartness that lingers. Highly recommend for V60 enthusiasts.",
      brewMethod: "POUR_OVER_V60", waterTempF: 201, ratio: "1:15", grindSize: "20 clicks Comandante",
      tastingNotes: ["Black Currant", "Grapefruit", "Tomato"],
    },
    {
      rating: 5, userIndex: 9, daysAgo: 55,
      title: "Incredible as AeroPress",
      content: "Inverted AeroPress, 17g coffee, 220g water at 195°F, 2-minute steep, fine-medium grind. The result is thick, syrupy, and bursting with blackcurrant flavor. This coffee can handle any brew method but AeroPress brings out the best body.",
      brewMethod: "AEROPRESS", waterTempF: 195, ratio: "1:13", grindSize: "Fine-medium",
      tastingNotes: ["Black Currant"],
    },
    {
      rating: 4, userIndex: 10, daysAgo: 40,
      content: "Really nice Kenyan coffee. Juicy and vibrant. Good acidity without being sour.",
      brewMethod: "POUR_OVER_V60",
    },
    {
      rating: 4, userIndex: 11, daysAgo: 28,
      content: "I'm not usually a light roast person but this Kenya AA is excellent. The fruit notes really pop.",
    },
    {
      rating: 5, userIndex: 12, daysAgo: 14,
      content: "Outstanding. Brewed on V60, the complexity is amazing. Black currant and citrus notes are perfectly balanced.",
      brewMethod: "POUR_OVER_V60", tastingNotes: ["Black Currant", "Citrus"],
    },
    {
      rating: 4, userIndex: 13, daysAgo: 3,
      title: "Great everyday coffee",
      content: "Consistently good. AeroPress at 200°F gives me a punchy, flavorful cup every morning.",
      brewMethod: "AEROPRESS", waterTempF: 200,
    },
  ],

  "colombian-supremo": [
    {
      rating: 5, userIndex: 14, daysAgo: 80,
      title: "The quintessential Colombian",
      content: "This Colombian Supremo checks every box. Rich caramel sweetness, mild nuttiness, and a clean chocolate finish. I brewed it French Press at 200°F with a coarse grind and 4-minute steep. The body is full and satisfying. My go-to recommendation for anyone getting into specialty coffee. The balance here is just perfect — nothing overpowers anything else.",
      brewMethod: "FRENCH_PRESS", waterTempF: 200, grindSize: "Coarse",
      tastingNotes: ["Caramel", "Chocolate", "Nutty"],
    },
    {
      rating: 4, userIndex: 15, daysAgo: 60,
      content: "Smooth and well-balanced. Great as a drip coffee. Nothing fancy but consistently excellent.",
      brewMethod: "DRIP_MACHINE",
    },
    {
      rating: 4, userIndex: 16, daysAgo: 45,
      title: "Solid espresso base",
      content: "Pulled this as a double shot — 18g in, 36g out in 28 seconds. Rich crema, chocolate-forward with a slight nutty sweetness. Excellent in a cortado. Not the most complex but very reliable and crowd-pleasing.",
      brewMethod: "ESPRESSO", grindSize: "Fine", ratio: "1:2",
      tastingNotes: ["Chocolate", "Nutty"],
    },
    {
      rating: 5, userIndex: 17, daysAgo: 32,
      content: "This is comfort in a cup. Exactly what I want every morning. Rich, smooth, no bitterness.",
    },
    {
      rating: 3, userIndex: 18, daysAgo: 15,
      content: "Good coffee, nothing wrong with it. Just a bit basic compared to some of the single origins here. Perfectly drinkable everyday coffee.",
      brewMethod: "DRIP_MACHINE",
    },
    {
      rating: 4, userIndex: 19, daysAgo: 7,
      content: "Really enjoy this one. Nice chocolate and caramel notes on AeroPress. Good value for the quality.",
      brewMethod: "AEROPRESS", tastingNotes: ["Chocolate", "Caramel"],
    },
  ],

  "guatemalan-antigua": [
    {
      rating: 5, userIndex: 20, daysAgo: 70,
      title: "Espresso perfection",
      content: "This Guatemalan Antigua is everything I want in an espresso. I pulled it at 18g in, 38g out over 30 seconds. Thick, creamy body with dark chocolate and a hint of spice. The sweetness is natural and the finish lingers beautifully. I've gone through three bags already — it's that good. My espresso machine thanks me for finding this bean.",
      brewMethod: "ESPRESSO", ratio: "1:2.1", grindSize: "Fine (8 on Eureka Mignon)",
      tastingNotes: ["Dark Chocolate", "Spice"],
    },
    {
      rating: 4, userIndex: 21, daysAgo: 50,
      content: "Great medium roast. The chocolate notes are rich and genuine. Works well across multiple brew methods.",
      brewMethod: "AEROPRESS",
      tastingNotes: ["Chocolate"],
    },
    {
      rating: 5, userIndex: 22, daysAgo: 35,
      content: "Love this coffee. Smoky, chocolatey, and smooth. Perfect for cold mornings.",
      brewMethod: "ESPRESSO",
    },
    {
      rating: 4, userIndex: 23, daysAgo: 20,
      title: "AeroPress champion",
      content: "15g coffee, 200g water at 195°F, inverted method, 90-second brew. The result is a thick, rich cup with great sweetness. The spice note is subtle but adds depth.",
      brewMethod: "AEROPRESS", waterTempF: 195, ratio: "1:13.3",
      tastingNotes: ["Spice"],
    },
    {
      rating: 4, userIndex: 24, daysAgo: 8,
      content: "Reliable and delicious. One of my favorite medium-dark coffees from this shop.",
    },
  ],

  "brazil-santos": [
    {
      rating: 4, userIndex: 25, daysAgo: 75,
      title: "Smooth operator",
      content: "Brazil Santos is the definition of smooth. Low acidity, nutty sweetness, and a chocolate finish that goes on forever. I brewed this on a French Press — 20g coffee, 300g water at 200°F, 4-minute steep, coarse grind. Nothing fancy, just pure comfort. Great for mixing into milk drinks too. The nuttiness pairs beautifully with oat milk.",
      brewMethod: "FRENCH_PRESS", waterTempF: 200, ratio: "1:15", grindSize: "Coarse",
      tastingNotes: ["Nutty", "Chocolate"],
    },
    {
      rating: 4, userIndex: 26, daysAgo: 58,
      content: "Good everyday coffee. Not the most exciting but extremely reliable. Makes great cold brew too.",
      brewMethod: "COLD_BREW",
    },
    {
      rating: 5, userIndex: 27, daysAgo: 38,
      content: "This is my go-to for espresso-based milk drinks. The chocolate and nut notes shine through milk perfectly. Creamy and delicious.",
      brewMethod: "ESPRESSO",
      tastingNotes: ["Chocolate", "Nutty"],
    },
    {
      rating: 3, userIndex: 28, daysAgo: 22,
      content: "Decent coffee. A bit too mild for my taste. I prefer something with more acidity and fruit notes.",
    },
    {
      rating: 4, userIndex: 29, daysAgo: 9,
      content: "Solid Brazilian coffee. Smooth, sweet, and uncomplicated. Great for French Press.",
      brewMethod: "FRENCH_PRESS",
    },
  ],

  "costa-rica-tarrazu": [
    {
      rating: 5, userIndex: 30, daysAgo: 68,
      title: "Honey-sweet perfection",
      content: "This Costa Rican Tarrazú is absolutely beautiful on a V60. Brewed at 15g to 250g water, 201°F, medium-fine grind. The honey sweetness is genuine — not cloying, just perfectly balanced with a bright citrus acidity. Clean finish with hints of brown sugar. I went through the whole bag in a week. Already ordered another. The roast level is perfect for pour-over — light enough to preserve the origin character but developed enough for complexity.",
      brewMethod: "POUR_OVER_V60", waterTempF: 201, ratio: "1:16.7", grindSize: "Medium-fine",
      tastingNotes: ["Honey", "Citrus", "Brown Sugar"],
    },
    {
      rating: 5, userIndex: 31, daysAgo: 42,
      content: "Beautiful coffee. The Chemex really brings out the clean, sweet notes. One of the best Costa Ricans I've tried.",
      brewMethod: "CHEMEX",
      tastingNotes: ["Honey", "Sweet"],
    },
    {
      rating: 4, userIndex: 32, daysAgo: 25,
      content: "Very good. Clean and sweet with nice acidity. A pleasant surprise.",
    },
    {
      rating: 4, userIndex: 33, daysAgo: 12,
      content: "Brewed on V60 — lovely honey sweetness. Great everyday light-medium roast.",
      brewMethod: "POUR_OVER_V60",
      tastingNotes: ["Honey"],
    },
  ],

  "breakfast-blend": [
    {
      rating: 4, userIndex: 34, daysAgo: 82,
      title: "The name says it all",
      content: "This is exactly what a breakfast blend should be. Smooth, approachable, and forgiving no matter how you brew it. I've made it on my drip machine, French Press, and even a quick AeroPress. It's consistently good without any fussiness. The chocolate and caramel notes are subtle but present. Great for guests who don't want anything too adventurous.",
      brewMethod: "DRIP_MACHINE",
      tastingNotes: ["Chocolate", "Caramel"],
    },
    {
      rating: 4, userIndex: 35, daysAgo: 55,
      content: "Nice, easy-going blend. Does what it says on the tin. Good with milk, good black. No complaints.",
      brewMethod: "FRENCH_PRESS",
    },
    {
      rating: 3, userIndex: 36, daysAgo: 30,
      content: "It's fine. A solid baseline coffee. Not remarkable but not bad either. Good value for the price.",
    },
    {
      rating: 5, userIndex: 37, daysAgo: 11,
      content: "Don't overlook this one just because it's a blend. It's genuinely good and incredibly consistent cup to cup. My whole family loves it.",
      brewMethod: "DRIP_MACHINE",
    },
  ],

  "bolivia-caranavi": [
    {
      rating: 5, userIndex: 38, daysAgo: 66,
      title: "Hidden gem — a must-try",
      content: "I almost skipped this one but I'm so glad I didn't. Bolivia Caranavi is an absolute hidden gem. Brewed on my Chemex with a 1:16 ratio at 200°F, the cup is incredibly smooth with a lingering sweetness. Notes of dark chocolate, red grape, and a subtle nuttiness. The body is medium-full, which is unusual for a Chemex brew — speaks to the bean quality. I took detailed notes on this one because I want to remember it. 22g coffee, 352g water, 45-second bloom with 50g, slow spiral pour, finish by 4:00. This is a special coffee.",
      brewMethod: "CHEMEX", waterTempF: 200, ratio: "1:16", grindSize: "Medium (24 clicks Comandante)",
      tastingNotes: ["Dark Chocolate", "Red Grape", "Nutty"],
    },
    {
      rating: 5, userIndex: 39, daysAgo: 45,
      content: "Wow, what a discovery. Rich and smooth on French Press. The chocolate notes are deep and satisfying.",
      brewMethod: "FRENCH_PRESS",
      tastingNotes: ["Chocolate"],
    },
    {
      rating: 4, userIndex: 40, daysAgo: 28,
      content: "Very nice Bolivian coffee. Smooth and sweet. Reminds me of a good Colombian but with more depth.",
      brewMethod: "CHEMEX",
    },
    {
      rating: 5, userIndex: 41, daysAgo: 6,
      content: "Fantastic. One of the most underrated coffees on this site. Do yourself a favor and try it.",
    },
  ],

  "ethiopian-sidamo": [
    {
      rating: 5, userIndex: 42, daysAgo: 60,
      title: "Berry bomb in a cup",
      content: "This Sidamo is bursting with berry flavor. V60 brew at 200°F, 1:16 ratio, medium-fine grind. The strawberry note is unmistakable — it's almost like drinking a berry tea. Clean, sweet finish. Different from the Yirgacheffe (less floral, more fruit-forward) but equally impressive. Great value too.",
      brewMethod: "POUR_OVER_V60", waterTempF: 200, ratio: "1:16", grindSize: "Medium-fine",
      tastingNotes: ["Strawberry", "Berry"],
    },
    {
      rating: 4, userIndex: 43, daysAgo: 35,
      content: "Lovely fruity Ethiopian. Brewed on Chemex and got lots of berry sweetness. Highly recommend.",
      brewMethod: "CHEMEX",
      tastingNotes: ["Berry"],
    },
    {
      rating: 4, userIndex: 44, daysAgo: 15,
      content: "Good coffee. Nice fruit notes but not as complex as the Yirgacheffe. Still very enjoyable.",
      brewMethod: "POUR_OVER_V60",
    },
  ],

  "rwanda-bourbon": [
    {
      rating: 5, userIndex: 45, daysAgo: 58,
      title: "Silky smooth Rwandan excellence",
      content: "This Rwanda Bourbon is silky and elegant. I brewed it on my V60 — 15g in, 250g out at 200°F with a medium grind. The citrus acidity is bright but gentle, and there's a beautiful caramel sweetness underneath. The body is medium and the finish is clean. A wonderfully balanced cup that's easy to drink multiple times a day. One of the most pleasant African coffees I've had.",
      brewMethod: "POUR_OVER_V60", waterTempF: 200, ratio: "1:16.7", grindSize: "Medium",
      tastingNotes: ["Citrus", "Caramel"],
    },
    {
      rating: 4, userIndex: 46, daysAgo: 30,
      content: "Really enjoyed this on AeroPress. Nice balance of sweetness and acidity. Clean and pleasant.",
      brewMethod: "AEROPRESS",
    },
    {
      rating: 4, userIndex: 47, daysAgo: 12,
      content: "Smooth and approachable. Great introduction to Rwandan coffee. Would buy again.",
    },
  ],

  "panama-geisha": [
    {
      rating: 5, userIndex: 48, daysAgo: 50,
      title: "Worth every penny — transcendent",
      content: "I know Panama Geisha is expensive, and yes, it's worth it. This is a transcendent coffee experience. Brewed on V60 at 16g to 260g water, 198°F, fine-medium grind. The jasmine aroma fills the room during bloom. In the cup: lychee, jasmine, and a floral sweetness that's unlike anything else. The mouthfeel is silky and the finish goes on for minutes. I savored every single cup from this bag. If you've never tried a Geisha, start here. 40g bloom for 45 seconds, then three pours of 73g each. Total time: 3:30.",
      brewMethod: "POUR_OVER_V60", waterTempF: 198, ratio: "1:16.25", grindSize: "Fine-medium",
      tastingNotes: ["Jasmine", "Lychee", "Floral"],
    },
    {
      rating: 5, userIndex: 49, daysAgo: 32,
      content: "Absolutely extraordinary. The floral complexity is on another level. Chemex brings out the best in this bean. Worth the splurge for a special occasion.",
      brewMethod: "CHEMEX",
      tastingNotes: ["Jasmine", "Floral"],
    },
    {
      rating: 4, userIndex: 50, daysAgo: 14,
      content: "Very special coffee. The floral notes are real and delicate. Only giving 4 stars because of the price, but the quality is definitely 5-star.",
      brewMethod: "POUR_OVER_V60",
      tastingNotes: ["Floral"],
    },
  ],

  "midnight-espresso-blend": [
    {
      rating: 4, userIndex: 51, daysAgo: 76,
      title: "Espresso workhorse",
      content: "This blend is built for espresso and it delivers. 18g in, 36g out in 27 seconds. Thick crema, dark chocolate bitterness, and a smoky finish. Not the most nuanced coffee but that's not what it's for. It's a reliable, bold espresso that pairs perfectly with milk. I use it for all my lattes and cappuccinos. The Moka Pot also gives great results — thick, strong, and satisfying.",
      brewMethod: "ESPRESSO", ratio: "1:2", grindSize: "Fine (7 on Eureka Mignon)",
      tastingNotes: ["Dark Chocolate", "Smoky"],
    },
    {
      rating: 5, userIndex: 52, daysAgo: 48,
      content: "Perfect for lattes. Bold enough to cut through milk. Thick crema. My daily espresso blend.",
      brewMethod: "ESPRESSO",
    },
    {
      rating: 3, userIndex: 53, daysAgo: 20,
      content: "A bit too dark for my taste. Works well as espresso with milk but I wouldn't drink it black. Decent quality for a dark blend.",
      brewMethod: "MOKA_POT",
    },
  ],

  "decaf-colombian": [
    {
      rating: 4, userIndex: 54, daysAgo: 62,
      title: "Best decaf I've found",
      content: "I need decaf for evening cups and this Colombian decaf is genuinely good. Not the watery, flat decaf you might expect. It's smooth with real chocolate and nut flavors. I brew it on drip and it tastes like actual coffee. If you need decaf, this is the one.",
      brewMethod: "DRIP_MACHINE",
      tastingNotes: ["Chocolate", "Nutty"],
    },
    {
      rating: 4, userIndex: 55, daysAgo: 18,
      content: "Pleasantly surprised by this decaf. Tastes like real coffee. Good on AeroPress.",
      brewMethod: "AEROPRESS",
    },
  ],

  "honduras-marcala": [
    {
      rating: 4, userIndex: 56, daysAgo: 48,
      title: "Underrated origin",
      content: "Honduras doesn't get enough love in specialty coffee. This Marcala is clean, sweet, and has a lovely caramel note. AeroPress at 195°F, 1:14 ratio. The body is medium and the finish is clean with a hint of citrus. Great value coffee.",
      brewMethod: "AEROPRESS", waterTempF: 195, ratio: "1:14",
      tastingNotes: ["Caramel", "Citrus"],
    },
    {
      rating: 4, userIndex: 57, daysAgo: 16,
      content: "Smooth and easy to like. Good on French Press. Nothing flashy but dependable.",
      brewMethod: "FRENCH_PRESS",
    },
  ],

  "peruvian-organic": [
    {
      rating: 5, userIndex: 58, daysAgo: 44,
      title: "Organic and outstanding",
      content: "Love that this is organic and the quality matches. Brewed on V60 at 200°F — clean, sweet, with notes of stone fruit and brown sugar. Medium body, gentle acidity. An excellent everyday coffee that also happens to be organic.",
      brewMethod: "POUR_OVER_V60", waterTempF: 200,
      tastingNotes: ["Stone Fruit", "Brown Sugar"],
    },
    {
      rating: 3, userIndex: 59, daysAgo: 22,
      content: "Nice coffee. Good balance and sweetness. Nothing mind-blowing but a solid cup on drip.",
      brewMethod: "DRIP_MACHINE",
    },
  ],

  // --- Merch products ---

  "heritage-diner-mug": [
    {
      rating: 5, userIndex: 65, daysAgo: 45,
      title: "Perfect everyday mug",
      content: "This mug is exactly what I wanted — sturdy, great size, and the diner-style aesthetic is charming. It holds heat well and the handle is comfortable for long morning sessions. The glaze finish is smooth and it cleans up easily. Already bought two more as gifts.",
    },
    {
      rating: 4, userIndex: 66, daysAgo: 30,
      content: "Really nice mug. Feels solid in the hand with a good weight to it. The retro diner look is on point. Only minor gripe is I wish it was a touch larger, but the quality is excellent for the price.",
    },
    {
      rating: 4, userIndex: 67, daysAgo: 18,
      title: "Great build quality",
      content: "Heavy-duty ceramic that feels like it'll last forever. The thick walls keep my coffee hot longer than my thin porcelain mugs. Love the classic look — it sits perfectly on my desk.",
    },
    {
      rating: 5, userIndex: 68, daysAgo: 5,
      content: "Absolutely love this mug. The size is perfect for a pour-over, the walls are thick, and it just feels right. The heritage diner style brings a smile every morning. Highly recommended.",
    },
  ],

  "fellow-stagg-ekg-kettle": [
    {
      rating: 5, userIndex: 69, daysAgo: 55,
      title: "Game changer for pour-over",
      content: "The precision temperature control on this kettle is incredible. I set it to 200°F for my V60 and it holds steady. The gooseneck spout gives perfect flow control — my pours have never been more consistent. The build quality is premium and it looks stunning on the counter. Worth every penny if you're serious about pour-over.",
    },
    {
      rating: 5, userIndex: 70, daysAgo: 38,
      content: "Best kettle I've ever owned. The temperature hold feature means I can take my time setting up my brew without the water cooling off. The pour from the gooseneck is incredibly precise. Feels like a professional tool.",
    },
    {
      rating: 4, userIndex: 71, daysAgo: 25,
      title: "Beautiful design, excellent function",
      content: "This kettle is as much a design piece as it is functional. The matte black finish is gorgeous and the LCD display is easy to read. Temperature accuracy is spot on. The only reason I'm not giving 5 stars is the price, but you do get what you pay for.",
    },
    {
      rating: 5, userIndex: 72, daysAgo: 12,
      content: "Upgraded from a standard kettle and the difference is night and day. The precision pour spout makes all the difference for Chemex and V60 brewing. Temperature holds perfectly. My coffee has genuinely improved since getting this.",
    },
    {
      rating: 4, userIndex: 73, daysAgo: 3,
      content: "Excellent build quality and beautiful design. Heats up quickly and maintains temperature well. The gooseneck gives great control. A luxury item but one that earns its place in a coffee enthusiast's kitchen.",
    },
  ],
};

// Helpful vote distribution: which review indices (within a product) get how many votes
// We'll distribute votes across reviews by cycling through users
const VOTE_DISTRIBUTION: Record<string, number[]> = {
  "ethiopian-yirgacheffe": [12, 5, 4, 2, 1, 8, 3, 0, 6, 2, 4, 1, 3],
  "kenya-aa": [10, 7, 2, 1, 4, 2],
  "colombian-supremo": [8, 2, 5, 3, 1, 2],
  "guatemalan-antigua": [9, 3, 2, 4, 1],
  "brazil-santos": [7, 2, 3, 1, 2],
  "costa-rica-tarrazu": [8, 4, 1, 2],
  "breakfast-blend": [5, 2, 0, 3],
  "bolivia-caranavi": [11, 4, 2, 3],
  "ethiopian-sidamo": [6, 3, 1],
  "rwanda-bourbon": [7, 2, 1],
  "panama-geisha": [13, 5, 2],
  "midnight-espresso-blend": [6, 3, 1],
  "decaf-colombian": [4, 1],
  "honduras-marcala": [3, 2],
  "peruvian-organic": [4, 1],
  "heritage-diner-mug": [6, 2, 3, 4],
  "fellow-stagg-ekg-kettle": [9, 5, 3, 6, 2],
};

export async function seedReviews(prisma: PrismaClient) {
  console.log("  📝 Creating review users...");

  // 1. Create 115 review users
  const userIds: string[] = [];
  for (const userData of REVIEW_USERS) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        name: userData.name,
        createdAt: daysAgoDate(Math.floor(Math.random() * 90) + 30),
      },
    });
    userIds.push(user.id);
  }
  console.log(`    ✓ ${userIds.length} review users created/verified`);

  // 2. Clean up existing seed reviews (in case of re-run)
  const seedUserEmails = REVIEW_USERS.map((u) => u.email);
  const seedUsers = await prisma.user.findMany({
    where: { email: { in: seedUserEmails } },
    select: { id: true },
  });
  const seedUserIds = seedUsers.map((u) => u.id);

  if (seedUserIds.length > 0) {
    await prisma.reviewVote.deleteMany({
      where: {
        OR: [
          { userId: { in: seedUserIds } },
          { review: { userId: { in: seedUserIds } } },
        ],
      },
    });
    await prisma.review.deleteMany({
      where: { userId: { in: seedUserIds } },
    });
  }

  // 3. Look up product IDs by slug
  const productSlugs = Object.keys(PRODUCT_REVIEWS);
  const products = await prisma.product.findMany({
    where: { slug: { in: productSlugs } },
    select: { id: true, slug: true },
  });
  const slugToId = new Map(products.map((p) => [p.slug, p.id]));

  console.log("  📝 Creating reviews...");

  let totalReviews = 0;
  const reviewIdsByProduct: Map<string, string[]> = new Map();

  for (const [slug, reviews] of Object.entries(PRODUCT_REVIEWS)) {
    const productId = slugToId.get(slug);
    if (!productId) {
      console.log(`    ⚠ Product not found: ${slug}, skipping`);
      continue;
    }

    const reviewIds: string[] = [];
    for (const review of reviews) {
      const userId = userIds[review.userIndex];
      if (!userId) continue;

      const completenessScore = calculateCompletenessScore({
        content: review.content,
        title: review.title,
        rating: review.rating,
        brewMethod: review.brewMethod,
        tastingNotes: review.tastingNotes,
        grindSize: review.grindSize,
        waterTempF: review.waterTempF,
        ratio: review.ratio,
      });

      const created = await prisma.review.create({
        data: {
          rating: review.rating,
          title: review.title ?? null,
          content: review.content,
          status: review.status ?? "PUBLISHED",
          flagReason: review.flagReason ?? null,
          adminResponse: review.adminResponse ?? null,
          brewMethod: review.brewMethod ?? null,
          grindSize: review.grindSize ?? null,
          waterTempF: review.waterTempF ?? null,
          ratio: review.ratio ?? null,
          tastingNotes: review.tastingNotes ?? [],
          completenessScore,
          productId,
          userId,
          createdAt: daysAgoDate(review.daysAgo),
        },
      });
      reviewIds.push(created.id);
      totalReviews++;
    }
    reviewIdsByProduct.set(slug, reviewIds);
  }
  console.log(`    ✓ ${totalReviews} reviews created`);

  // 4. Create helpful votes
  console.log("  👍 Creating helpful votes...");
  let totalVotes = 0;
  // Build a pool of voter user indices (skip indices used as reviewers)
  const usedReviewerIndices = new Set<number>();
  for (const reviews of Object.values(PRODUCT_REVIEWS)) {
    for (const r of reviews) usedReviewerIndices.add(r.userIndex);
  }
  // Voter pool: all user indices not used as reviewers (for simplicity)
  const voterPool = userIds
    .map((id, idx) => ({ id, idx }))
    .filter(({ idx }) => !usedReviewerIndices.has(idx));

  let voterCursor = 0;
  function nextVoter() {
    const voter = voterPool[voterCursor % voterPool.length];
    voterCursor++;
    return voter;
  }

  for (const [slug, voteCounts] of Object.entries(VOTE_DISTRIBUTION)) {
    const reviewIds = reviewIdsByProduct.get(slug);
    if (!reviewIds) continue;

    for (let i = 0; i < voteCounts.length && i < reviewIds.length; i++) {
      const count = voteCounts[i];
      for (let v = 0; v < count; v++) {
        const voter = nextVoter();
        try {
          await prisma.reviewVote.create({
            data: {
              reviewId: reviewIds[i],
              userId: voter.id,
            },
          });
          totalVotes++;
        } catch {
          // Skip duplicate votes silently
        }
      }
    }
  }
  console.log(`    ✓ ${totalVotes} helpful votes created`);

  // 5. Update denormalized counts
  console.log("  🔄 Updating denormalized counts...");

  // Update helpfulCount on each review
  for (const reviewIds of reviewIdsByProduct.values()) {
    for (const reviewId of reviewIds) {
      const count = await prisma.reviewVote.count({ where: { reviewId } });
      await prisma.review.update({
        where: { id: reviewId },
        data: { helpfulCount: count },
      });
    }
  }

  // Update averageRating and reviewCount on each product
  for (const [slug] of Object.entries(PRODUCT_REVIEWS)) {
    const productId = slugToId.get(slug);
    if (!productId) continue;

    const agg = await prisma.review.aggregate({
      where: { productId, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: { id: true },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
        reviewCount: agg._count.id,
      },
    });
  }

  // 6. Create orders for review users so most reviews are "verified purchases"
  console.log("  🛒 Creating orders for review users...");
  let ordersCreated = 0;

  // Fetch products with variants and purchase options
  const productsWithVariants = await prisma.product.findMany({
    where: { slug: { in: productSlugs } },
    select: {
      id: true,
      slug: true,
      variants: {
        where: { isDisabled: false },
        select: {
          id: true,
          purchaseOptions: {
            where: { type: "ONE_TIME" },
            take: 1,
            select: { id: true, priceInCents: true },
          },
        },
      },
    },
  });
  const slugToProduct = new Map(productsWithVariants.map((p) => [p.slug, p]));

  for (const [slug, reviews] of Object.entries(PRODUCT_REVIEWS)) {
    const product = slugToProduct.get(slug);
    if (!product) continue;

    // Pick the first variant with a purchase option
    const variant = product.variants.find((v) => v.purchaseOptions.length > 0);
    if (!variant) continue;
    const purchaseOption = variant.purchaseOptions[0];

    // Create orders for all but the last reviewer per product (keeps some unverified)
    const verifiedCount = Math.max(1, reviews.length - 1);
    for (let i = 0; i < verifiedCount; i++) {
      const userId = userIds[reviews[i].userIndex];
      if (!userId) continue;

      // Skip if user already has an order for this product
      const existing = await prisma.order.findFirst({
        where: {
          userId,
          status: { in: ["SHIPPED", "PICKED_UP"] },
          items: { some: { purchaseOption: { variant: { productId: product.id } } } },
        },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.order.create({
        data: {
          userId,
          status: "SHIPPED",
          totalInCents: purchaseOption.priceInCents,
          deliveryMethod: "DELIVERY",
          shippingCountry: "US",
          createdAt: daysAgoDate(reviews[i].daysAgo + 14), // ordered 2 weeks before review
          items: {
            create: {
              purchaseOptionId: purchaseOption.id,
              quantity: 1,
              priceInCents: purchaseOption.priceInCents,
            },
          },
        },
      });
      ordersCreated++;
    }
  }
  console.log(`    ✓ ${ordersCreated} orders created for review users`);

  // 7. Link reviews to orders for verified purchase badges
  console.log("  🔗 Linking reviews to orders for verified purchases...");
  let linkedCount = 0;

  // For each reviewed product, find reviews where the reviewer also has an order
  // containing that product with a completed status (SHIPPED or PICKED_UP)
  for (const [slug, reviews] of Object.entries(PRODUCT_REVIEWS)) {
    const productId = slugToId.get(slug);
    const reviewIds = reviewIdsByProduct.get(slug);
    if (!productId || !reviewIds) continue;

    for (let i = 0; i < reviews.length && i < reviewIds.length; i++) {
      const userId = userIds[reviews[i].userIndex];
      if (!userId) continue;

      // Find a completed order by this user that contains this product
      const matchingOrder = await prisma.order.findFirst({
        where: {
          userId,
          status: { in: ["SHIPPED", "PICKED_UP"] },
          items: {
            some: {
              purchaseOption: {
                variant: { productId },
              },
            },
          },
        },
        select: { id: true },
      });

      if (matchingOrder) {
        await prisma.review.update({
          where: { id: reviewIds[i] },
          data: { orderId: matchingOrder.id },
        });
        linkedCount++;
      }
    }
  }

  // 8. Create admin user brew report for order history "Reported" badge
  console.log("  📝 Creating admin brew report...");
  const adminUser = await prisma.user.findFirst({
    where: { email: "admin@artisanroast.com" },
  });

  if (adminUser) {
    // Find a completed order by admin with a coffee product
    const adminOrder = await prisma.order.findFirst({
      where: {
        userId: adminUser.id,
        status: { in: ["SHIPPED", "PICKED_UP"] },
        items: {
          some: {
            purchaseOption: {
              variant: { product: { type: "COFFEE" } },
            },
          },
        },
      },
      include: {
        items: {
          include: {
            purchaseOption: {
              include: { variant: { include: { product: true } } },
            },
          },
        },
      },
    });

    if (adminOrder) {
      const coffeeItem = adminOrder.items.find(
        (item) => item.purchaseOption.variant.product.type === "COFFEE"
      );
      if (coffeeItem) {
        const product = coffeeItem.purchaseOption.variant.product;
        // Check if admin already has a review for this product
        const existing = await prisma.review.findFirst({
          where: { userId: adminUser.id, productId: product.id },
        });

        if (!existing) {
          const score = calculateCompletenessScore({
            content: "This is my go-to morning coffee. Brewed on my AeroPress with a 1:15 ratio at 200°F. Smooth, balanced, and incredibly satisfying. The tasting notes are spot on — I get the chocolate and caramel every time. Highly recommend for AeroPress fans.",
            title: "My morning staple",
            rating: 5,
            brewMethod: "AEROPRESS",
            waterTempF: 200,
            ratio: "1:15",
            tastingNotes: (product.tastingNotes as string[]).slice(0, 2),
          });

          await prisma.review.create({
            data: {
              rating: 5,
              title: "My morning staple",
              content: "This is my go-to morning coffee. Brewed on my AeroPress with a 1:15 ratio at 200°F. Smooth, balanced, and incredibly satisfying. The tasting notes are spot on — I get the chocolate and caramel every time. Highly recommend for AeroPress fans.",
              brewMethod: "AEROPRESS",
              waterTempF: 200,
              ratio: "1:15",
              tastingNotes: (product.tastingNotes as string[]).slice(0, 2),
              completenessScore: score,
              productId: product.id,
              userId: adminUser.id,
              orderId: adminOrder.id,
              createdAt: daysAgoDate(4),
            },
          });

          // Update product aggregates
          const agg = await prisma.review.aggregate({
            where: { productId: product.id, status: "PUBLISHED" },
            _avg: { rating: true },
            _count: { id: true },
          });
          await prisma.product.update({
            where: { id: product.id },
            data: {
              averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
              reviewCount: agg._count.id,
            },
          });

          console.log(`    ✓ Admin brew report created for ${product.name}`);
        }
      }
    } else {
      console.log("    ⚠ No completed admin order with coffee found — skipping admin brew report");
    }
  }

  console.log(`    ✓ ${linkedCount} reviews linked to orders (verified purchases)`);

  // Enable reviews in site settings
  await prisma.siteSettings.upsert({
    where: { key: "commerce.reviewsEnabled" },
    update: { value: "true" },
    create: { key: "commerce.reviewsEnabled", value: "true" },
  });

  console.log("  ✅ Reviews seeding completed");
}
