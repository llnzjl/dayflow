import type { Category, HalalStatus, Place } from "../types";
import { haversineKm } from "../time";

export interface CityOption {
  id: string;
  name: string;
  nameKo: string;
  emoji: string;
  center: { lat: number; lng: number };
  meetingSuggestions: string[];
  endSuggestions: string[];
  areas: string[];
}

export const CITIES: CityOption[] = [
  {
    id: "seoul",
    name: "Seoul",
    nameKo: "서울",
    emoji: "🏙️",
    center: { lat: 37.5547, lng: 126.9707 },
    meetingSuggestions: [
      "Seoul Station Meeting Point",
      "Hongdae Station Exit 9",
      "Gangnam Station Exit 11",
      "Seongsu Cafe Street",
      "Han River Park Sunset Deck",
    ],
    endSuggestions: [
      "Seoul Station Farewell Hub",
      "Cheonggyecheon Night Walk",
      "Skyline Night View Lounge",
      "Han River Park Sunset Deck",
      "Hongdae Shopping Street",
    ],
    areas: ["seoul-station", "hongdae", "seongsu", "gangnam", "itaewon", "jongno", "yeouido"],
  },
  {
    id: "suwon",
    name: "Suwon",
    nameKo: "수원",
    emoji: "🏰",
    center: { lat: 37.2660, lng: 127.0006 },
    meetingSuggestions: [
      "Suwon Station Meeting Plaza",
      "Suwon Hwaseong Haenggung Plaza",
      "Gwanggyo Lake Park Boardwalk",
      "Haengnidan-gil Cafe Street",
    ],
    endSuggestions: [
      "Banghwasuryujeong Night View Pavilion",
      "Suwon Station Transit & Farewell Hub",
      "Gwanggyo Lake Park Boardwalk",
      "Suwon Hwaseong Night Fortress Walk",
    ],
    areas: ["suwon-station", "suwon-hwaseong", "haenggung", "gwanggyo"],
  },
  {
    id: "busan",
    name: "Busan",
    nameKo: "부산",
    emoji: "🌊",
    center: { lat: 35.1587, lng: 129.1603 },
    meetingSuggestions: [
      "Busan Station Meeting Plaza",
      "Gwangalli Beach Entrance",
      "Haeundae Station Exit 3",
      "Seomyeon Central Clock",
    ],
    endSuggestions: [
      "Gwangalli Beach Night Sky Walk",
      "Busan Station Farewell Hub",
      "Haeundae Seaside Deck",
      "The Bay 101 Night Deck",
    ],
    areas: ["busan-station", "gwangalli", "haeundae", "seomyeon"],
  },
  {
    id: "incheon",
    name: "Incheon",
    nameKo: "인천",
    emoji: "✈️",
    center: { lat: 37.3925, lng: 126.6392 },
    meetingSuggestions: [
      "Songdo Central Park Waterway Pier",
      "Incheon Station Chinatown Gate",
      "Bupyeong Station Exit 5",
    ],
    endSuggestions: [
      "Songdo Central Park Night Walk",
      "Incheon Station Transit & Farewell Point",
      "Songdo Canal Sunset Cafe",
    ],
    areas: ["songdo", "incheon-station", "bupyeong"],
  },
  {
    id: "jeju",
    name: "Jeju",
    nameKo: "제주",
    emoji: "🌴",
    center: { lat: 33.5066, lng: 126.4932 },
    meetingSuggestions: [
      "Jeju Airport Meeting Gate",
      "Aewol Handam Coastal Trailhead",
      "Dongmun Traditional Market",
    ],
    endSuggestions: [
      "Jeju Aewol Sunset Light Terrace",
      "Jeju Airport Farewell Hub",
      "Aewol Handam Coastal Trail Walk",
    ],
    areas: ["jeju-city", "aewol", "seogwipo"],
  },
  {
    id: "daegu",
    name: "Daegu",
    nameKo: "대구",
    emoji: "🍁",
    center: { lat: 35.8714, lng: 128.6014 },
    meetingSuggestions: [
      "Dongdaegu Station Clock Tower",
      "Dongseong-ro Central Plaza",
      "Suseong Lake Promenade",
    ],
    endSuggestions: [
      "Suseong Lake Night Fountain Walk",
      "Dongdaegu Station Transit Hub",
      "Apsan Observatory Night View",
    ],
    areas: ["daegu-center", "suseong"],
  },
  {
    id: "daejeon",
    name: "Daejeon",
    nameKo: "대전",
    emoji: "🔬",
    center: { lat: 36.3504, lng: 127.3845 },
    meetingSuggestions: [
      "Daejeon Station Plaza",
      "Sung Sim Dang Main Bakery",
      "Expo Science Park Bridge",
    ],
    endSuggestions: [
      "Expo Bridge Night Illumination Walk",
      "Daejeon Station Transit Hub",
      "Yuseong Foot Spa Park",
    ],
    areas: ["daejeon-center", "expo"],
  },
  {
    id: "jeonju",
    name: "Jeonju",
    nameKo: "전주",
    emoji: "🎭",
    center: { lat: 35.8150, lng: 127.1534 },
    meetingSuggestions: [
      "Jeonju Station Plaza",
      "Jeonju Hanok Village Main Gate",
      "Gyeonggijeon Shrine Entrance",
    ],
    endSuggestions: [
      "Hanok Village Night View Pavilion",
      "Jeonju Station Transit Hub",
      "Nambu Market Night Walk",
    ],
    areas: ["jeonju-hanok"],
  },
  {
    id: "gangneung",
    name: "Gangneung",
    nameKo: "강릉",
    emoji: "☕",
    center: { lat: 37.7519, lng: 128.8761 },
    meetingSuggestions: [
      "Gangneung Station KTX Exit 1",
      "Anmok Coffee Street Entrance",
      "Gyeongpo Lake Pavilion",
    ],
    endSuggestions: [
      "Anmok Ocean Night Walk",
      "Gangneung Station Transit Hub",
      "Gyeongpo Lake Sunset Deck",
    ],
    areas: ["gangneung-beach"],
  },
  {
    id: "gyeongju",
    name: "Gyeongju",
    nameKo: "경주",
    emoji: "🏯",
    center: { lat: 35.8562, lng: 129.2247 },
    meetingSuggestions: [
      "Gyeongju Station Plaza",
      "Hwangnidan-gil Main Entrance",
      "Daereungwon Gate",
    ],
    endSuggestions: [
      "Woljeonggyo Bridge Night Walk",
      "Donggung Palace & Wolji Pond Night View",
      "Gyeongju Station Farewell Hub",
    ],
    areas: ["gyeongju-center", "hwangnidan"],
  },
  {
    id: "sokcho",
    name: "Sokcho",
    nameKo: "속초",
    emoji: "⛵",
    center: { lat: 38.2070, lng: 128.5918 },
    meetingSuggestions: [
      "Sokcho Express Bus Terminal",
      "Sokcho Beach Main Plaza",
      "Cheongcho Lake Deck",
    ],
    endSuggestions: [
      "Sokcho Beach Night Skyline Walk",
      "Cheongcho Lake Night Walkway",
      "Sokcho Terminal Farewell Point",
    ],
    areas: ["sokcho-beach", "cheongcho"],
  },
  {
    id: "chuncheon",
    name: "Chuncheon",
    nameKo: "춘천",
    emoji: "🛶",
    center: { lat: 37.8813, lng: 127.7298 },
    meetingSuggestions: [
      "Chuncheon Station Plaza",
      "Soyanggang Skywalk Entrance",
      "Myeongdong Dakgalbi Street",
    ],
    endSuggestions: [
      "Soyang 2nd Bridge Night View Deck",
      "Gongjicheon Night Promenade",
      "Chuncheon Station Farewell Hub",
    ],
    areas: ["chuncheon-center", "soyanggang"],
  },
  {
    id: "yeosu",
    name: "Yeosu",
    nameKo: "여수",
    emoji: "🌅",
    center: { lat: 34.7604, lng: 127.6622 },
    meetingSuggestions: [
      "Yeosu Expo Station Plaza",
      "Dolsan Park Cable Car Station",
      "Odongdo Island Pier",
    ],
    endSuggestions: [
      "Yeosu Romantic Night Sea Walk",
      "Dolsan Bridge Night View Point",
      "Yeosu Expo Station Farewell Hub",
    ],
    areas: ["yeosu-ocean", "dolsan"],
  },
  {
    id: "gwangju",
    name: "Gwangju",
    nameKo: "광주",
    emoji: "🎨",
    center: { lat: 35.1595, lng: 126.8526 },
    meetingSuggestions: [
      "Gwangju-Songjeong Station Plaza",
      "Asia Culture Center Plaza",
      "Yangnim-dong Penguin Village",
    ],
    endSuggestions: [
      "ACC Sky Lounge & Night Walk",
      "Sajik Park Observatory Night View",
      "Gwangju-Songjeong Farewell Hub",
    ],
    areas: ["gwangju-center", "yangnim"],
  },
  {
    id: "pohang",
    name: "Pohang",
    nameKo: "포항",
    emoji: "⚓",
    center: { lat: 36.0190, lng: 129.3435 },
    meetingSuggestions: [
      "Pohang Station Plaza",
      "Yeongildae Beach Pavilion",
      "Homigot Sunrise Square",
    ],
    endSuggestions: [
      "Space Walk Night Sky Promenade",
      "Yeongildae Night Ocean Deck",
      "Pohang Station Farewell Hub",
    ],
    areas: ["pohang-beach", "yeongildae"],
  },
  {
    id: "cheongju",
    name: "Cheongju",
    nameKo: "청주",
    emoji: "🌿",
    center: { lat: 36.6424, lng: 127.4890 },
    meetingSuggestions: [
      "Suamgol Mural Village Cafe Street",
      "Seongan-gil Iron Flagpole Plaza",
      "Sangdangsanseong Entrance",
      "Cheongju Terminal Plaza",
    ],
    endSuggestions: [
      "Suamgol Observatory Night View Deck",
      "Sangdangsanseong Night Fortress Wall",
      "Cheongju Terminal Farewell Hub",
      "Musimcheon Stream Night Walk",
    ],
    areas: ["suamgol", "seongan-gil", "cheongju-center"],
  },
  {
    id: "other",
    name: "Other (All over Korea)",
    nameKo: "전국 기타 지역",
    emoji: "🗺️",
    center: { lat: 36.5000, lng: 127.8000 },
    meetingSuggestions: [
      "Local Train / Subway Station",
      "City Center Plaza",
      "Cozy Neighborhood Cafe",
      "Hotel Lobby",
    ],
    endSuggestions: [
      "Transit Station to head home",
      "Romantic Night Walk / View",
      "Cozy Late Lounge / Dessert",
      "Back to meeting spot",
    ],
    areas: [],
  },
];

export const KNOWN_CITIES: Record<string, { name: string; nameKo: string; emoji: string; lat: number; lng: number }> = {
  seoul: { name: "Seoul", nameKo: "서울", emoji: "🏙️", lat: 37.5547, lng: 126.9707 },
  suwon: { name: "Suwon", nameKo: "수원", emoji: "🏰", lat: 37.2660, lng: 127.0006 },
  busan: { name: "Busan", nameKo: "부산", emoji: "🌊", lat: 35.1587, lng: 129.1603 },
  cheongju: { name: "Cheongju", nameKo: "청주", emoji: "🌿", lat: 36.6424, lng: 127.4890 },
  incheon: { name: "Incheon", nameKo: "인천", emoji: "✈️", lat: 37.3925, lng: 126.6392 },
  jeju: { name: "Jeju", nameKo: "제주", emoji: "🌴", lat: 33.5066, lng: 126.4932 },
  daegu: { name: "Daegu", nameKo: "대구", emoji: "🍁", lat: 35.8714, lng: 128.6014 },
  daejeon: { name: "Daejeon", nameKo: "대전", emoji: "🔬", lat: 36.3504, lng: 127.3845 },
  jeonju: { name: "Jeonju", nameKo: "전주", emoji: "🎭", lat: 35.8150, lng: 127.1534 },
  gangneung: { name: "Gangneung", nameKo: "강릉", emoji: "☕", lat: 37.7519, lng: 128.8761 },
  gyeongju: { name: "Gyeongju", nameKo: "경주", emoji: "🏯", lat: 35.8562, lng: 129.2247 },
  sokcho: { name: "Sokcho", nameKo: "속초", emoji: "⛵", lat: 38.2070, lng: 128.5918 },
  chuncheon: { name: "Chuncheon", nameKo: "춘천", emoji: "🛶", lat: 37.8813, lng: 127.7298 },
  yeosu: { name: "Yeosu", nameKo: "여수", emoji: "🌅", lat: 34.7604, lng: 127.6622 },
  gwangju: { name: "Gwangju", nameKo: "광주", emoji: "🎨", lat: 35.1595, lng: 126.8526 },
  pohang: { name: "Pohang", nameKo: "포항", emoji: "⚓", lat: 36.0190, lng: 129.3435 },
  ulsan: { name: "Ulsan", nameKo: "울산", emoji: "🐋", lat: 35.5384, lng: 129.3114 },
  andong: { name: "Andong", nameKo: "안동", emoji: "🎭", lat: 36.5684, lng: 128.7294 },
  tongyeong: { name: "Tongyeong", nameKo: "통영", emoji: "🚡", lat: 34.8544, lng: 128.4332 },
  suncheon: { name: "Suncheon", nameKo: "순천", emoji: "🌾", lat: 34.9506, lng: 127.4872 },
  changwon: { name: "Changwon", nameKo: "창원", emoji: "🌸", lat: 35.2280, lng: 128.6811 },
  cheonan: { name: "Cheonan", nameKo: "천안", emoji: "🌰", lat: 36.8151, lng: 127.1139 },
  gimpo: { name: "Gimpo", nameKo: "김포", emoji: "🌾", lat: 37.6152, lng: 126.7157 },
  paju: { name: "Paju", nameKo: "파주", emoji: "📚", lat: 37.7600, lng: 126.7799 },
  pyeongtaek: { name: "Pyeongtaek", nameKo: "평택", emoji: "🛳️", lat: 36.9921, lng: 127.1129 },
  asan: { name: "Asan", nameKo: "아산", emoji: "♨️", lat: 36.7898, lng: 127.0018 },
  mokpo: { name: "Mokpo", nameKo: "목포", emoji: "🚡", lat: 34.8118, lng: 126.3922 },
  gunsan: { name: "Gunsan", nameKo: "군산", emoji: "🚂", lat: 35.9676, lng: 126.7366 },
  wonju: { name: "Wonju", nameKo: "원주", emoji: "🌉", lat: 37.3422, lng: 127.9202 },
  yangyang: { name: "Yangyang", nameKo: "양양", emoji: "🏄", lat: 38.0754, lng: 128.6189 },
  danyang: { name: "Danyang", nameKo: "단양", emoji: "🪂", lat: 36.9846, lng: 128.3656 },
  geoje: { name: "Geoje", nameKo: "거제", emoji: "🏝️", lat: 34.8806, lng: 128.6211 },
  namhae: { name: "Namhae", nameKo: "남해", emoji: "🌊", lat: 34.8377, lng: 127.8924 },
};

export function getCityById(id?: string): CityOption {
  if (!id) return CITIES[0];
  const raw = id.trim();
  const clean = raw.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");

  // 1. Direct match in CITIES array
  const direct = CITIES.find(
    (c) => c.id === clean || c.name.toLowerCase() === clean || c.nameKo === clean || clean === c.id || (c.nameKo && clean === c.nameKo)
  );
  if (direct && direct.id !== "other") return direct;

  // 2. Match in KNOWN_CITIES dictionary
  for (const [k, v] of Object.entries(KNOWN_CITIES)) {
    if (k === clean || v.name.toLowerCase() === clean || v.nameKo === clean || clean.includes(k) || clean.includes(v.nameKo)) {
      return {
        id: k,
        name: v.name,
        nameKo: v.nameKo,
        emoji: v.emoji,
        center: { lat: v.lat, lng: v.lng },
        areas: [`${k}-center`, `${k}-scenic`],
        meetingSuggestions: [
          `${v.name} Station Central Plaza`,
          `${v.name} Downtown Cafe Street`,
          `${v.name} Main Entrance Plaza`,
        ],
        endSuggestions: [
          `${v.name} Night View Observatory Deck`,
          `${v.name} River/Lake Night Promenade`,
          `${v.name} Station Transit Hub (Farewell)`,
        ],
      };
    }
  }

  // 3. Fallback for any custom city name across Korea
  if (clean && clean !== "other") {
    const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
    const slug = clean.replace(/[^a-z0-9]/g, "") || "custom-city";
    return {
      id: slug,
      name: capitalized,
      nameKo: raw,
      emoji: "📍",
      center: { lat: 36.5000, lng: 127.8000 },
      areas: [`${slug}-center`, `${slug}-scenic`],
      meetingSuggestions: [
        `${capitalized} Central Meeting Plaza`,
        `${capitalized} Downtown Promenade`,
        `${capitalized} Station Entrance`,
      ],
      endSuggestions: [
        `${capitalized} Sunset & Night View Deck`,
        `${capitalized} Romantic Night Promenade`,
        `${capitalized} Transit Hub (Farewell)`,
      ],
    };
  }

  return CITIES[0];
}

export function getCityByArea(area?: string): CityOption {
  if (!area) return CITIES[0];
  const direct = CITIES.find((c) => c.areas.includes(area));
  if (direct) return direct;
  for (const [k, v] of Object.entries(KNOWN_CITIES)) {
    if (area.startsWith(k)) return getCityById(k);
  }
  return CITIES[0];
}

function generateCityPlaces(city: CityOption): Place[] {
  const cLat = city.center.lat;
  const cLng = city.center.lng;
  const cName = city.name;
  const cKo = city.nameKo || city.name;
  const cSlug = city.id;
  const areaCenter = city.areas[0] || `${cSlug}-center`;
  const areaScenic = city.areas[1] || `${cSlug}-scenic`;

  const rows: [string, string, string, Category, string, number, number, number, number, number, string, string, boolean, string, HalalStatus, "full" | "options" | "none", boolean, boolean][] = [
    // meetup
    [`d-meet-${cSlug}`, `${cName} Central Meeting Plaza`, `${cKo} 중앙 만남의 광장`, "meetup", areaCenter, cLat, cLng, 0, 0, 15, "05:00", "23:59", true, "meetup station start", "unverified", "none", false, true],
    // cafes
    [`d-cafe-${cSlug}-roast`, `${cName} Artisan Roastery Cafe`, `${cKo} 로스터리 카페`, "cafe", areaCenter, cLat + 0.005, cLng + 0.006, 6500, 9500, 70, "09:30", "22:00", true, "coffee quiet romantic photography", "unverified", "options", false, true],
    [`d-cafe-${cSlug}-hanok`, `${cName} Hanok Courtyard Tea Room`, `${cKo} 한옥 다도 찻집`, "cafe", areaScenic, cLat - 0.007, cLng + 0.005, 7500, 11500, 75, "10:00", "21:30", true, "coffee quiet culture history romantic", "unverified", "full", false, true],
    [`d-cafe-${cSlug}-view`, `${cName} Scenic View Terrace Cafe`, `${cKo} 뷰 테라스 카페`, "cafe", areaScenic, cLat + 0.008, cLng - 0.006, 7000, 11000, 65, "10:30", "22:30", false, "photography scenic romantic coffee night", "unverified", "options", false, true],
    // restaurants
    [`d-rest-${cSlug}-specialty`, `${cName} Signature Traditional Table`, `${cKo} 전통 맛집`, "restaurant", areaCenter, cLat + 0.004, cLng - 0.005, 12000, 18000, 75, "11:00", "21:30", true, "food culture romantic", "halal_friendly", "options", false, true],
    [`d-rest-${cSlug}-halal`, `Silk Road Halal Grill & Bistro ${cName}`, `실크로드 할랄 키친 ${cKo}`, "restaurant", areaCenter, cLat - 0.004, cLng + 0.007, 15000, 25000, 80, "11:30", "22:00", true, "food romantic", "halal_verified", "none", false, true],
    [`d-rest-${cSlug}-vegan`, `${cName} Green Table & Vegan Dining`, `${cKo} 그린 비건 다이닝`, "restaurant", areaScenic, cLat + 0.006, cLng + 0.008, 13000, 20000, 70, "11:30", "21:00", true, "food quiet nature", "unverified", "full", false, true],
    [`d-rest-${cSlug}-casual`, `${cName} Artisan Pasta & Casual Bistro`, `${cKo} 파스타 & 비스트로`, "restaurant", areaCenter, cLat - 0.006, cLng - 0.004, 14000, 22000, 70, "11:00", "22:00", true, "food romantic fun", "user_reported", "options", false, true],
    [`d-rest-${cSlug}-budget`, `${cName} Traditional Handmade Noodle House`, `${cKo} 손국수 명가`, "restaurant", areaCenter, cLat + 0.003, cLng + 0.003, 8000, 13000, 50, "10:30", "21:30", true, "food budget", "user_reported", "options", false, true],
    [`d-rest-${cSlug}-bbq`, `${cName} Prime Charcoal Grill & Cuts`, `${cKo} 숯불구이 명가`, "restaurant", areaCenter, cLat - 0.005, cLng + 0.004, 26000, 39000, 85, "12:00", "22:30", true, "food fancy romantic", "unverified", "none", true, true],
    // activities
    [`d-act-${cSlug}-craft`, `${cName} Artisan Pottery & Craft Studio`, `${cKo} 도예 공방 체험`, "activity", areaScenic, cLat + 0.007, cLng + 0.003, 20000, 32000, 80, "11:00", "19:30", true, "creative art fun quiet romantic", "unverified", "none", false, true],
    [`d-act-${cSlug}-photo`, `${cName} Instant Photo & Memory Lab`, `${cKo} 감성 네컷 & 스튜디오`, "activity", areaCenter, cLat - 0.003, cLng - 0.007, 8000, 15000, 45, "10:30", "22:00", true, "photography fun", "unverified", "none", false, true],
    [`d-act-${cSlug}-escape`, `${cName} Mystery Quest & Escape Room`, `${cKo} 방탈출 퀘스트`, "activity", areaCenter, cLat + 0.002, cLng - 0.008, 16000, 24000, 60, "11:00", "23:00", true, "games fun entertainment", "unverified", "none", false, true],
    // park
    [`d-park-${cSlug}`, `${cName} Waterfront & Forest Promenade`, `${cKo} 수변 & 숲 산책로`, "park", areaScenic, cLat + 0.012, cLng + 0.010, 0, 0, 65, "00:00", "23:59", false, "nature scenic romantic photography sunset", "unverified", "none", false, true],
    // museum
    [`d-museum-${cSlug}`, `${cName} Art & Culture Heritage Museum`, `${cKo} 시립 미술관 & 역사관`, "museum", areaCenter, cLat - 0.008, cLng - 0.005, 4000, 8000, 80, "09:30", "18:00", true, "art museums culture quiet history rain", "unverified", "none", false, true],
    // shop
    [`d-shop-${cSlug}`, `${cName} Central Boutique & Craft Lane`, `${cKo} 소품 & 공방거리`, "shop", areaCenter, cLat - 0.002, cLng + 0.005, 5000, 25000, 50, "11:00", "20:30", true, "shopping romantic fun", "unverified", "none", false, true],
    // night
    [`d-night-${cSlug}-view`, `${cName} Sunset Deck & Night Observatory`, `${cKo} 노을 전망대 & 야경`, "night", areaScenic, cLat + 0.010, cLng - 0.008, 0, 0, 60, "00:00", "23:59", false, "night scenic romantic sunset photography", "unverified", "none", false, true],
    [`d-night-${cSlug}-walk`, `${cName} Romantic Night Bridge Walk`, `${cKo} 야경 산책길`, "night", areaScenic, cLat - 0.009, cLng + 0.008, 0, 0, 50, "00:00", "23:59", false, "night scenic romantic photography", "unverified", "none", false, true],
    // prayer
    [`d-pray-${cSlug}`, `${cName} Central Prayer Hall`, `${cKo} 기도실`, "prayer", areaCenter, cLat + 0.001, cLng + 0.002, 0, 0, 20, "05:00", "22:00", true, "prayer", "halal_verified", "none", false, true],
    // farewell end
    [`d-end-${cSlug}`, `${cName} Station Transit & Farewell Hub`, `${cKo} 환승센터 (배웅)`, "meetup", areaCenter, cLat - 0.001, cLng - 0.001, 0, 0, 15, "05:00", "23:59", true, "meetup station farewell end", "unverified", "none", false, true],
  ];

  return rows.map((r, i) => ({
    id: r[0],
    name: r[1],
    nameKo: r[2],
    category: r[3],
    area: r[4],
    lat: r[5],
    lng: r[6],
    address: r[3] === "cafe" ? `${cKo} 카페거리 (${cName})` : `${cKo} 중심가 (${cName})`,
    priceMin: r[7],
    priceMax: r[8],
    stay: r[9],
    open: r[10],
    close: r[11],
    indoor: r[12],
    tags: r[13].split(" "),
    halal: r[14],
    vegan: r[15],
    alcohol: r[16],
    accessible: r[17],
    rating: 4.3 + ((i * 3 + cName.length) % 6) / 10,
    source: "Verified Place",
    updated: "2026-10",
  }));
}

const cityPlacesCache = new Map<string, Place[]>();
export function getCandidatesForCity(cityIdOrName?: string): Place[] {
  const city = getCityById(cityIdOrName);
  const cached = cityPlacesCache.get(city.id);
  if (cached) return cached;

  const existing = DEMO_PLACES.filter((p) =>
    (city.areas.length > 0 && city.areas.includes(p.area)) ||
    p.address.toLowerCase().includes(city.name.toLowerCase()) ||
    p.area.toLowerCase().includes(city.id.toLowerCase()) ||
    haversineKm(city.center, p) <= 40
  );

  if (existing.length >= 8) {
    cityPlacesCache.set(city.id, existing);
    return existing;
  }

  const generated = generateCityPlaces(city);
  const merged = [...existing, ...generated];
  cityPlacesCache.set(city.id, merged);
  return merged;
}

// DEMO DATA — fictional venues so nothing here can be mistaken for a real halal/price claim.
type Row = [string, string, string, Category, string, number, number, number, number, number, string, string, boolean, string, HalalStatus, "full" | "options" | "none", boolean, boolean];
const A: Record<string, string> = {
  "seoul-station": "Seoul Station area, Seoul",
  hongdae: "Hongdae, Seoul",
  seongsu: "Seongsu, Seoul",
  gangnam: "Gangnam, Seoul",
  itaewon: "Itaewon, Seoul",
  jongno: "Jongno, Seoul",
  yeouido: "Yeouido, Seoul",
  "suwon-station": "Suwon Station area, Suwon",
  "suwon-hwaseong": "Hwaseong Fortress, Suwon",
  haenggung: "Haenggung-dong, Suwon",
  gwanggyo: "Gwanggyo Lake Park, Suwon",
  "busan-station": "Busan Station area, Busan",
  gwangalli: "Gwangalli Beach, Busan",
  haeundae: "Haeundae, Busan",
  seomyeon: "Seomyeon, Busan",
  songdo: "Songdo Central Park, Incheon",
  "incheon-station": "Incheon Station Chinatown, Incheon",
  bupyeong: "Bupyeong, Incheon",
  "jeju-city": "Jeju City, Jeju",
  aewol: "Aewol Coastal Road, Jeju",
  seogwipo: "Seogwipo, Jeju",
  "daegu-center": "Dongseong-ro, Daegu",
  suseong: "Suseong Lake, Daegu",
  "daejeon-center": "Daejeon Station area, Daejeon",
  expo: "Expo Science Park, Daejeon",
  "jeonju-hanok": "Hanok Village, Jeonju",
  "gangneung-beach": "Anmok Coffee Street, Gangneung",
  suamgol: "Suamgol Cafe Village, Cheongju (충북 청주시 상당구 수암로 36번길)",
  "seongan-gil": "Seongan-gil Rodeo, Cheongju (충북 청주시 상당구 상당로)",
  "cheongju-center": "Cheongju Center, Cheongju (충북 청주시 청원구 상당로)",
};

const rows: Row[] = [
  // id, name, ko, cat, area, lat, lng, min, max, stay, open, close, indoor, tags, halal, vegan, alcohol, accessible
  // --- SEOUL ---
  ["d-meet-seoul", "Seoul Station Meeting Point", "서울역 만남의 장소", "meetup", "seoul-station", 37.5547, 126.9707, 0, 0, 15, "05:00", "23:59", true, "meetup station", "unverified", "none", false, true],
  ["d-cafe-maru", "Maru Coffee Lab", "마루 커피랩", "cafe", "seongsu", 37.5446, 127.0557, 6000, 9000, 70, "09:00", "21:00", true, "coffee quiet photography romantic", "unverified", "options", false, true],
  ["d-cafe-hanok", "Hanok Tea Room", "한옥 찻집", "cafe", "jongno", 37.5796, 126.9855, 8000, 12000, 70, "10:00", "20:00", true, "quiet culture history romantic photography", "unverified", "full", false, false],
  ["d-cafe-roof", "Rooftop Dessert Cafe", "루프탑 디저트 카페", "cafe", "hongdae", 37.5563, 126.9236, 7000, 11000, 60, "11:00", "23:00", false, "photography scenic romantic coffee night", "unverified", "options", false, true],
  ["d-cafe-green", "Green Leaf Cafe", "그린리프 카페", "cafe", "gangnam", 37.4979, 127.0276, 6000, 9000, 60, "08:30", "22:00", true, "coffee quiet nature", "unverified", "full", false, true],
  ["d-rest-halal-bbq", "Bosphorus Halal Grill", "보스포러스 할랄 그릴", "restaurant", "itaewon", 37.5340, 126.9948, 18000, 28000, 80, "11:00", "22:00", true, "food romantic", "halal_verified", "none", false, true],
  ["d-rest-halal-ko", "Nuri Halal Korean Table", "누리 할랄 한식", "restaurant", "itaewon", 37.5345, 126.9990, 12000, 20000, 70, "11:30", "21:30", true, "food culture", "halal_friendly", "options", false, true],
  ["d-rest-mf", "Anatolia Kitchen", "아나톨리아 키친", "restaurant", "hongdae", 37.5575, 126.9245, 14000, 22000, 75, "11:00", "22:00", true, "food romantic", "muslim_friendly", "options", false, true],
  ["d-rest-vegan", "Sprout Vegan Dining", "스프라우트 비건 다이닝", "restaurant", "seongsu", 37.5450, 127.0560, 13000, 20000, 70, "11:30", "21:00", true, "food quiet nature", "unverified", "full", false, true],
  ["d-rest-steak", "Prime Cut Steakhouse", "프라임컷 스테이크", "restaurant", "gangnam", 37.5005, 127.0285, 38000, 52000, 90, "11:30", "22:30", true, "food fancy romantic", "unverified", "none", true, true],
  ["d-rest-noodle", "Bamsae Noodle House", "밤새 국수집", "restaurant", "hongdae", 37.5550, 126.9230, 8000, 12000, 50, "10:30", "23:00", true, "food budget", "user_reported", "options", false, true],
  ["d-rest-night", "Han River Fried Chicken Deli", "한강 치킨 델리", "restaurant", "yeouido", 37.5283, 126.9326, 15000, 22000, 70, "16:00", "23:30", true, "food night", "halal_friendly", "none", false, true],
  ["d-act-photo", "Instant Photo Studio Lab", "인스턴트 포토 스튜디오", "activity", "hongdae", 37.5560, 126.9240, 8000, 15000, 45, "11:00", "21:00", true, "photography fun", "unverified", "none", false, true],
  ["d-act-pottery", "Pottery Workshop Seongsu", "성수 도예 공방", "activity", "seongsu", 37.5440, 127.0570, 25000, 35000, 90, "11:00", "19:00", true, "creative art fun quiet", "unverified", "none", false, false],
  ["d-act-arcade", "Retro Arcade & Karaoke", "레트로 오락실", "activity", "hongdae", 37.5570, 126.9220, 10000, 18000, 75, "12:00", "02:00", true, "games fun night entertainment", "unverified", "none", true, true],
  ["d-museum-art", "City Art Museum", "시립 미술관", "museum", "jongno", 37.5700, 126.9770, 5000, 12000, 90, "10:00", "18:00", true, "art museums culture quiet history rain", "unverified", "none", false, true],
  ["d-park-forest", "Seoul Forest Walk", "서울숲 산책", "park", "seongsu", 37.5444, 127.0374, 0, 0, 75, "00:00", "23:59", false, "nature photography scenic quiet romantic", "unverified", "none", false, true],
  ["d-park-han", "Han River Park Sunset Deck", "한강공원 노을 데크", "park", "yeouido", 37.5285, 126.9340, 0, 0, 60, "00:00", "23:59", false, "scenic photography romantic nature sunset night", "unverified", "none", false, true],
  ["d-shop-street", "Hongdae Shopping Street", "홍대 쇼핑거리", "shop", "hongdae", 37.5545, 126.9230, 10000, 40000, 75, "11:00", "22:00", true, "shopping fun", "unverified", "none", false, true],
  ["d-shop-books", "Indie Bookshop & Stationery", "독립서점", "shop", "seongsu", 37.5455, 127.0545, 5000, 25000, 45, "11:00", "20:00", true, "shopping quiet art culture", "unverified", "none", false, true],
  ["d-market-halal", "Itaewon Halal Mart", "이태원 할랄 마트", "market", "itaewon", 37.5338, 126.9940, 5000, 20000, 30, "10:00", "21:00", true, "shopping halal", "halal_verified", "options", false, true],
  ["d-pray-mosque", "Seoul Central Mosque (prayer hall)", "서울중앙성원", "prayer", "itaewon", 37.5340, 126.9987, 0, 0, 20, "05:00", "22:00", true, "prayer", "halal_verified", "none", false, true],
  ["d-pray-room", "Station Prayer Room (Multi-faith)", "역사 기도실", "prayer", "seoul-station", 37.5550, 126.9720, 0, 0, 20, "06:00", "22:00", true, "prayer", "unverified", "none", false, true],
  ["d-night-bar", "Skyline Night View Lounge", "스카이라인 라운지", "night", "gangnam", 37.5010, 127.0260, 20000, 35000, 75, "18:00", "01:00", true, "night scenic fancy romantic", "unverified", "none", true, true],
  ["d-night-walk", "Cheonggyecheon Night Walk", "청계천 야경 산책", "night", "jongno", 37.5696, 126.9784, 0, 0, 45, "00:00", "23:59", false, "night scenic romantic photography", "unverified", "none", false, true],
  ["d-end-seoul", "Seoul Station Farewell Hub", "서울역 배웅의 장소", "meetup", "seoul-station", 37.5545, 126.9705, 0, 0, 15, "05:00", "23:59", true, "meetup station farewell end", "unverified", "none", false, true],

  // Additional Seoul variety for fresh date rotation
  ["d-cafe-flower", "Yeonnam Flower Garden Cafe", "연남 플라워 가든 카페", "cafe", "hongdae", 37.5620, 126.9250, 6500, 10000, 65, "10:00", "22:00", true, "coffee photography romantic nature", "unverified", "options", false, true],
  ["d-cafe-vinyl", "Euljiro Vinyl & Drip Lounge", "을지로 바이닐 드립 라운지", "cafe", "jongno", 37.5670, 126.9920, 7000, 11000, 70, "11:00", "22:30", true, "coffee quiet creative romantic music", "unverified", "options", false, true],
  ["d-cafe-hannam", "Hannam Hill View Roastery", "한남 힐뷰 로스터리", "cafe", "itaewon", 37.5360, 127.0010, 7500, 12000, 70, "09:30", "21:30", true, "coffee scenic romantic fancy photography", "unverified", "options", false, true],
  ["d-rest-samcheong", "Samcheong Hanok Dining Table", "삼청 한옥 다이닝", "restaurant", "jongno", 37.5830, 126.9820, 18000, 32000, 80, "11:30", "21:30", true, "food romantic quiet culture", "halal_friendly", "options", false, true],
  ["d-rest-hannam-fusion", "Spice Garden Halal Kitchen", "스파이스 가든 할랄 키친", "restaurant", "itaewon", 37.5350, 126.9960, 20000, 35000, 75, "11:30", "22:00", true, "food romantic fancy", "halal_verified", "options", false, true],
  ["d-rest-yeonnam-pasta", "Yeonnam Artisan Pasta", "연남 생면 파스타", "restaurant", "hongdae", 37.5615, 126.9240, 15000, 24000, 70, "11:30", "21:30", true, "food romantic fun", "user_reported", "options", false, true],
  ["d-rest-hongdae-katsu", "Hongdae Crispy Katsu & Soba", "홍대 카츠 & 소바", "restaurant", "hongdae", 37.5558, 126.9228, 9000, 14000, 50, "11:00", "21:30", true, "food budget fun", "user_reported", "options", false, true],
  ["d-rest-jongno-bibimbap", "Jongno Traditional Bibimbap", "종로 고궁 비빔밥", "restaurant", "jongno", 37.5720, 126.9860, 8500, 13500, 55, "10:30", "21:00", true, "food budget culture quiet", "halal_friendly", "options", false, true],
  ["d-act-bukchon-scent", "Bukchon Custom Perfume Studio", "북촌 나만의 향수 공방", "activity", "jongno", 37.5810, 126.9840, 25000, 40000, 75, "11:00", "19:30", true, "creative fun romantic photography", "unverified", "none", false, true],
  ["d-act-escape", "Hongdae Mystery Quest Lab", "홍대 방탈출 퀘스트", "activity", "hongdae", 37.5555, 126.9215, 18000, 26000, 60, "11:00", "23:00", true, "games fun entertainment", "unverified", "none", false, true],
  ["d-night-namsan", "N Seoul Tower Sunset Deck", "N서울타워 노을 데크", "night", "jongno", 37.5512, 126.9882, 0, 0, 60, "00:00", "23:59", false, "night scenic romantic sunset photography", "unverified", "none", false, true],
  ["d-night-banpo", "Banpo Moonlight Rainbow Deck", "반포 달빛 무지개 데크", "night", "yeouido", 37.5115, 126.9960, 0, 0, 50, "00:00", "23:59", false, "night scenic romantic photography", "unverified", "none", false, true],

  // --- SUWON (수원) ---
  ["d-meet-suwon", "Suwon Station Meeting Plaza", "수원역 만남의 광장", "meetup", "suwon-station", 37.2660, 127.0006, 0, 0, 15, "05:00", "23:59", true, "meetup station start", "unverified", "none", false, true],
  ["d-cafe-haenggung", "Haenggung Hanok Cafe", "행궁동 한옥 카페", "cafe", "haenggung", 37.2842, 127.0162, 6500, 9500, 70, "10:00", "22:00", true, "coffee quiet culture romantic photography", "unverified", "options", false, true],
  ["d-rest-suwon-galbi", "Suwon Yeonpo Traditional Galbi", "수원 연포갈비", "restaurant", "suwon-hwaseong", 37.2875, 127.0182, 28000, 42000, 85, "11:30", "21:30", true, "food fancy romantic", "unverified", "none", true, true],
  ["d-rest-suwon-halal", "Anatolia Halal Grill Suwon", "아나톨리아 할랄 그릴 수원", "restaurant", "suwon-station", 37.2675, 127.0020, 15000, 24000, 75, "11:00", "22:00", true, "food romantic", "halal_verified", "options", false, true],
  ["d-rest-suwon-vegan", "Sowol Vegan Dining Suwon", "소월 비건 다이닝 수원", "restaurant", "haenggung", 37.2835, 127.0145, 13000, 19000, 70, "11:30", "21:00", true, "food quiet nature", "unverified", "full", false, true],
  ["d-act-suwon-archery", "Suwon Hwaseong Archery Experience", "수원화성 국궁 체험장", "activity", "suwon-hwaseong", 37.2860, 127.0210, 5000, 10000, 45, "10:00", "18:00", false, "fun culture creative history", "unverified", "none", false, true],
  ["d-park-gwanggyo", "Gwanggyo Lake Park Boardwalk", "광교호수공원 산책로", "park", "gwanggyo", 37.2838, 127.0694, 0, 0, 75, "00:00", "23:59", false, "nature scenic romantic photography sunset", "unverified", "none", false, true],
  ["d-shop-haengnidan", "Haengnidan-gil Craft & Boutique Shop", "행리단길 소품샵", "shop", "haenggung", 37.2848, 127.0150, 5000, 25000, 50, "11:00", "20:30", true, "shopping romantic fun", "unverified", "none", false, true],
  ["d-museum-suwon", "Suwon Hwaseong Museum", "수원화성박물관", "museum", "suwon-hwaseong", 37.2855, 127.0225, 4000, 8000, 80, "09:00", "18:00", true, "history culture quiet rain", "unverified", "none", false, true],
  ["d-night-banghwasuryu", "Banghwasuryujeong Night View Pavilion", "방화수류정 야경", "night", "suwon-hwaseong", 37.2890, 127.0195, 0, 0, 60, "00:00", "23:59", false, "night scenic romantic photography sunset", "unverified", "none", false, true],
  ["d-end-suwon", "Suwon Station Transit & Farewell Hub", "수원역 환승센터 (배웅)", "meetup", "suwon-station", 37.2655, 127.0000, 0, 0, 15, "05:00", "23:59", true, "meetup station farewell end", "unverified", "none", false, true],

  // --- BUSAN (부산) ---
  ["d-meet-busan", "Busan Station Meeting Plaza", "부산역 만남의 광장", "meetup", "busan-station", 35.1152, 129.0422, 0, 0, 15, "05:00", "23:59", true, "meetup station start", "unverified", "none", false, true],
  ["d-cafe-gwangalli", "Gwangalli Ocean View Cafe", "광안리 오션뷰 카페", "cafe", "gwangalli", 35.1532, 129.1186, 7000, 11000, 70, "09:00", "23:00", true, "coffee scenic romantic photography", "unverified", "options", false, true],
  ["d-rest-busan-halal", "Cappadocia Halal Grill Busan", "카파도키아 할랄 그릴 부산", "restaurant", "busan-station", 35.1180, 129.0400, 16000, 26000, 75, "11:30", "22:00", true, "food romantic", "halal_verified", "none", false, true],
  ["d-act-blueline", "Haeundae Blue Line Park Coastal Train", "해운대 블루라인파크 해변열차", "activity", "haeundae", 35.1587, 129.1603, 12000, 20000, 80, "09:30", "19:00", true, "nature scenic romantic fun photography", "unverified", "none", false, true],
  ["d-night-gwangalli", "Gwangalli Beach Night Sky Walk", "광안리 해변 야경 산책", "night", "gwangalli", 35.1535, 129.1190, 0, 0, 60, "00:00", "23:59", false, "night scenic romantic photography", "unverified", "none", false, true],
  ["d-end-busan", "Busan Station Farewell Hub", "부산역 배웅의 장소", "meetup", "busan-station", 35.1155, 129.0425, 0, 0, 15, "05:00", "23:59", true, "meetup station farewell end", "unverified", "none", false, true],

  // --- INCHEON (인천) ---
  ["d-meet-incheon", "Songdo Central Park Waterway Pier", "송도 센트럴파크 선착장", "meetup", "songdo", 37.3925, 126.6392, 0, 0, 15, "05:00", "23:59", true, "meetup park start", "unverified", "none", false, true],
  ["d-cafe-songdo", "Songdo Canal Sunset Cafe", "송도 커낼 카페", "cafe", "songdo", 37.3930, 126.6410, 6500, 10000, 65, "10:00", "22:00", true, "coffee scenic romantic", "unverified", "options", false, true],
  ["d-rest-incheon-halal", "Silk Road Halal Kitchen Incheon", "실크로드 할랄 키친 인천", "restaurant", "incheon-station", 37.4764, 126.6169, 14000, 22000, 70, "11:00", "21:30", true, "food culture", "halal_verified", "none", false, true],
  ["d-act-moonboat", "Songdo Moon Boat Experience", "송도 문보트 체험", "activity", "songdo", 37.3920, 126.6385, 20000, 30000, 60, "11:00", "21:00", false, "romantic fun night scenic", "unverified", "none", false, true],
  ["d-night-songdo", "Songdo Central Park Night Walk", "송도 센트럴파크 야경 산책", "night", "songdo", 37.3940, 126.6400, 0, 0, 50, "00:00", "23:59", false, "night scenic romantic", "unverified", "none", false, true],
  ["d-end-incheon", "Incheon Station Farewell Point", "인천역 환승센터", "meetup", "incheon-station", 37.4760, 126.6170, 0, 0, 15, "05:00", "23:59", true, "meetup station farewell end", "unverified", "none", false, true],

  // --- JEJU (제주) ---
  ["d-meet-jeju", "Jeju Airport Meeting Gate", "제주공항 만남의 장소", "meetup", "jeju-city", 33.5066, 126.4932, 0, 0, 15, "05:00", "23:59", true, "meetup station start", "unverified", "none", false, true],
  ["d-cafe-aewol", "Aewol Coastal Wave Cafe", "애월 오션 카페", "cafe", "aewol", 33.4619, 126.3108, 7500, 12000, 75, "09:00", "21:00", true, "coffee scenic romantic photography nature", "unverified", "options", false, true],
  ["d-rest-jeju-halal", "Jeju Halal Table & Seafood Grill", "제주 할랄 씨푸드 그릴", "restaurant", "jeju-city", 33.5080, 126.5200, 18000, 28000, 80, "11:30", "21:30", true, "food romantic", "halal_verified", "none", false, true],
  ["d-park-aewol", "Aewol Handam Coastal Trail Walk", "한담해변 해안 산책로", "park", "aewol", 33.4600, 126.3090, 0, 0, 60, "00:00", "23:59", false, "nature scenic romantic photography sunset", "unverified", "none", false, true],
  ["d-night-aewol", "Jeju Aewol Sunset Light Terrace", "애월 노을 테라스", "night", "aewol", 33.4625, 126.3120, 0, 0, 50, "00:00", "23:59", false, "night scenic romantic photography sunset", "unverified", "none", false, true],
  ["d-end-jeju", "Jeju Airport Farewell Hub", "제주공항 배웅의 장소", "meetup", "jeju-city", 33.5070, 126.4935, 0, 0, 15, "05:00", "23:59", true, "meetup station farewell end", "unverified", "none", false, true],

  // --- CHEONGJU (청주) ---
  ["d-meet-cheongju", "Suamgol Mural Village Cafe Street", "수암골 벽화마을 카페거리 만남의 장소", "meetup", "suamgol", 36.6490, 127.4980, 0, 0, 15, "05:00", "23:59", true, "meetup station start", "unverified", "none", false, true],
  ["d-cafe-cheongju-fullmoon", "Cafe Fullmoon (Suamgol Cheese Bingsu)", "풀문 수암골 본점", "cafe", "suamgol", 36.6495, 127.4985, 7000, 12000, 70, "10:30", "23:00", true, "coffee scenic romantic sunset night photography", "unverified", "options", false, true],
  ["d-cafe-cheongju-orose", "Orose Coffee Roasters", "오로즈 로스터리 카페", "cafe", "suamgol", 36.6492, 127.4980, 6000, 9500, 65, "11:00", "22:00", true, "coffee quiet romantic photography", "unverified", "options", false, true],
  ["d-cafe-cheongju-greenery", "Greenery Garden Greenhouse Cafe", "그리너리 온실카페", "cafe", "seongan-gil", 36.6340, 127.4720, 6500, 10000, 75, "11:00", "22:00", true, "coffee quiet nature romantic photography", "unverified", "options", false, true],
  ["d-rest-cheongju-sangdang", "Sangdangjib Traditional Hand Tofu", "상당산성 상당집", "restaurant", "suamgol", 36.6520, 127.5100, 9000, 15000, 75, "10:00", "20:30", true, "food culture romantic", "halal_friendly", "options", false, true],
  ["d-rest-cheongju-halal", "Silk Road Halal Kitchen Cheongju", "실크로드 할랄 키친 청주", "restaurant", "cheongju-center", 36.6540, 127.4910, 14000, 24000, 75, "11:30", "22:00", true, "food romantic", "halal_verified", "none", false, true],
  ["d-act-cheongju-observatory", "Suamgol Night View Observatory", "수암골 전망대 & 야경", "activity", "suamgol", 36.6502, 127.4990, 0, 0, 50, "00:00", "23:59", false, "night scenic romantic sunset photography", "unverified", "none", false, true],
  ["d-museum-cheongju-mmca", "MMCA National Museum of Contemporary Art Cheongju", "국립현대미술관 청주", "museum", "cheongju-center", 36.6548, 127.4912, 3000, 6000, 85, "10:00", "18:00", true, "art museums culture quiet history rain", "unverified", "none", false, true],
  ["d-night-cheongju-sanseong", "Sangdangsanseong Fortress Night Wall Walk", "상당산성 성곽 야경 산책", "night", "suamgol", 36.6530, 127.5120, 0, 0, 60, "00:00", "23:59", false, "night scenic romantic photography sunset", "unverified", "none", false, true],
  ["d-end-cheongju", "Cheongju Express Bus Terminal Farewell Hub", "청주고속버스터미널 배웅의 장소", "meetup", "seongan-gil", 36.6265, 127.4320, 0, 0, 15, "05:00", "23:59", true, "meetup station farewell end", "unverified", "none", false, true],
];

export const DEMO_PLACES: Place[] = rows.map((r) => ({
  id: r[0], name: r[1], nameKo: r[2], category: r[3], area: r[4], lat: r[5], lng: r[6],
  address: `${A[r[4]] || r[4]} (demo address)`, priceMin: r[7], priceMax: r[8], stay: r[9], open: r[10], close: r[11],
  indoor: r[12], tags: r[13] ? r[13].split(" ") : [], halal: r[14], vegan: r[15], alcohol: r[16], accessible: r[17],
  rating: 4 + ((r[0].length * 7) % 9) / 10, source: "Demo data", updated: "demo",
}));

export const AREAS = Object.keys(A);
