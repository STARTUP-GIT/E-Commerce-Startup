/**
 * Authoritative Location Catalogue Data for AtlasBasket
 * Used for database seeding and authoritative fallback querying.
 * All new locations default to DISABLED until explicitly reviewed and enabled by Admin.
 */

export interface CatalogueEntry {
    state: string;
    district: string;
    cityTown: string;
    serviceArea: string;
    postalCode: string;
}

export const AUTHORITATIVE_LOCATION_CATALOGUE: CatalogueEntry[] = [
    // --- MYSURU DISTRICT ---
    // Mysuru City Areas
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Vijayanagar 1st Stage", postalCode: "570017" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Vijayanagar 2nd Stage", postalCode: "570017" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Vijayanagar 3rd Stage", postalCode: "570017" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Vijayanagar 4th Stage", postalCode: "570018" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Gokulam 1st Stage", postalCode: "570002" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Gokulam 2nd Stage", postalCode: "570002" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Gokulam 3rd Stage", postalCode: "570002" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Jayalakshmipuram", postalCode: "570012" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Saraswathipuram", postalCode: "570009" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Kuvempunagar", postalCode: "570023" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "JP Nagar", postalCode: "570008" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Hebbal Industrial Area", postalCode: "570016" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Bannimantap", postalCode: "570015" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Ramakrishnanagar", postalCode: "570022" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Vidyaranyapuram", postalCode: "570008" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Siddartha Layout", postalCode: "570011" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Alanahalli", postalCode: "570028" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Bogadi", postalCode: "570026" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Yadavagiri", postalCode: "570020" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Chamundipuram", postalCode: "570004" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Nazarbad", postalCode: "570010" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Metagalli", postalCode: "570016" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Roopa Nagar", postalCode: "570026" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Kalyanagiri", postalCode: "570019" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Mysuru", serviceArea: "Udayagiri", postalCode: "570019" },
    // Nanjangud Sub-City Areas
    { state: "Karnataka", district: "Mysuru", cityTown: "Nanjangud", serviceArea: "Nanjangud Town Center", postalCode: "571301" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Nanjangud", serviceArea: "Nanjangud Industrial Area", postalCode: "571302" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Nanjangud", serviceArea: "Srikanteshwara Temple Vicinity", postalCode: "571301" },
    // Hunsur Sub-City Areas
    { state: "Karnataka", district: "Mysuru", cityTown: "Hunsur", serviceArea: "Hunsur Town", postalCode: "571105" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Hunsur", serviceArea: "Bilikere", postalCode: "571103" },
    // T. Narasipura Areas
    { state: "Karnataka", district: "Mysuru", cityTown: "T. Narasipura", serviceArea: "T. Narasipura Town", postalCode: "571124" },
    { state: "Karnataka", district: "Mysuru", cityTown: "T. Narasipura", serviceArea: "Bannur", postalCode: "571101" },
    { state: "Karnataka", district: "Mysuru", cityTown: "T. Narasipura", serviceArea: "Sosale", postalCode: "571120" },
    // Krishnarajanagara Areas
    { state: "Karnataka", district: "Mysuru", cityTown: "Krishnarajanagara", serviceArea: "KR Nagar Town", postalCode: "571602" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Krishnarajanagara", serviceArea: "Saligrama", postalCode: "571604" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Krishnarajanagara", serviceArea: "Bherya", postalCode: "571601" },
    // Piriyapatna Areas
    { state: "Karnataka", district: "Mysuru", cityTown: "Piriyapatna", serviceArea: "Piriyapatna Town", postalCode: "571107" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Piriyapatna", serviceArea: "Bettadapura", postalCode: "571102" },
    { state: "Karnataka", district: "Mysuru", cityTown: "Piriyapatna", serviceArea: "Kallubalu", postalCode: "571107" },
    // Saragur Areas
    { state: "Karnataka", district: "Mysuru", cityTown: "Saragur", serviceArea: "Saragur Town", postalCode: "571121" },

    // --- BENGALURU URBAN DISTRICT ---
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "Koramangala 1st-4th Block", postalCode: "560034" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "Koramangala 5th-8th Block", postalCode: "560095" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "Indiranagar", postalCode: "560038" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "HSR Layout Sectors 1-7", postalCode: "560102" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "Whitefield", postalCode: "560066" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "Electronic City Phase 1", postalCode: "560100" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "Electronic City Phase 2", postalCode: "560100" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "Jayanagar", postalCode: "560011" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "Malleshwaram", postalCode: "560003" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "BTM Layout", postalCode: "560068" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "Marathahalli", postalCode: "560037" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "Bellandur", postalCode: "560103" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "Rajajinagar", postalCode: "560010" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "Banashankari", postalCode: "560050" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "Hebbal", postalCode: "560024" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Bengaluru", serviceArea: "JP Nagar", postalCode: "560078" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Yelahanka", serviceArea: "Yelahanka New Town", postalCode: "560064" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Yelahanka", serviceArea: "Yelahanka Old Town", postalCode: "560064" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Anekal", serviceArea: "Anekal Town", postalCode: "562106" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Anekal", serviceArea: "Chandapura", postalCode: "560099" },
    { state: "Karnataka", district: "Bengaluru Urban", cityTown: "Kengeri", serviceArea: "Kengeri Satellite Town", postalCode: "560060" },

    // --- BENGALURU RURAL DISTRICT ---
    { state: "Karnataka", district: "Bengaluru Rural", cityTown: "Devanahalli", serviceArea: "Devanahalli Town", postalCode: "562110" },
    { state: "Karnataka", district: "Bengaluru Rural", cityTown: "Devanahalli", serviceArea: "Airport Vicinity", postalCode: "560300" },
    { state: "Karnataka", district: "Bengaluru Rural", cityTown: "Doddaballapura", serviceArea: "Doddaballapura Town", postalCode: "561203" },
    { state: "Karnataka", district: "Bengaluru Rural", cityTown: "Hosakote", serviceArea: "Hosakote Town", postalCode: "562114" },
    { state: "Karnataka", district: "Bengaluru Rural", cityTown: "Nelamangala", serviceArea: "Nelamangala Town", postalCode: "562123" },

    // --- HASSAN DISTRICT ---
    { state: "Karnataka", district: "Hassan", cityTown: "Hassan", serviceArea: "Hassan City", postalCode: "573201" },
    { state: "Karnataka", district: "Hassan", cityTown: "Hassan", serviceArea: "Hassan Industrial Area", postalCode: "573202" },
    { state: "Karnataka", district: "Hassan", cityTown: "Channarayapatna", serviceArea: "Channarayapatna Town", postalCode: "573116" },
    { state: "Karnataka", district: "Hassan", cityTown: "Arsikere", serviceArea: "Arsikere Town", postalCode: "573103" },
    { state: "Karnataka", district: "Hassan", cityTown: "Sakleshpur", serviceArea: "Sakleshpur Town", postalCode: "573134" },
    { state: "Karnataka", district: "Hassan", cityTown: "Belur", serviceArea: "Belur Town", postalCode: "573115" },
    { state: "Karnataka", district: "Hassan", cityTown: "Holenarasipura", serviceArea: "Holenarasipura Town", postalCode: "573211" },
    { state: "Karnataka", district: "Hassan", cityTown: "Alur", serviceArea: "Alur Town", postalCode: "573213" },
    { state: "Karnataka", district: "Hassan", cityTown: "Arkalgud", serviceArea: "Arkalgud Town", postalCode: "573102" },

    // --- MANDYA DISTRICT ---
    { state: "Karnataka", district: "Mandya", cityTown: "Mandya", serviceArea: "Mandya City", postalCode: "571401" },
    { state: "Karnataka", district: "Mandya", cityTown: "Mandya", serviceArea: "VV Nagar", postalCode: "571401" },
    { state: "Karnataka", district: "Mandya", cityTown: "Srirangapatna", serviceArea: "Srirangapatna Town", postalCode: "571438" },
    { state: "Karnataka", district: "Mandya", cityTown: "Maddur", serviceArea: "Maddur Town", postalCode: "571428" },
    { state: "Karnataka", district: "Mandya", cityTown: "Malavalli", serviceArea: "Malavalli Town", postalCode: "571430" },
    { state: "Karnataka", district: "Mandya", cityTown: "Pandavapura", serviceArea: "Pandavapura Town", postalCode: "571434" },
    { state: "Karnataka", district: "Mandya", cityTown: "Nagamangala", serviceArea: "Nagamangala Town", postalCode: "571432" },
    { state: "Karnataka", district: "Mandya", cityTown: "Krishnarajpet", serviceArea: "KR Pet Town", postalCode: "571426" },

    // --- DAKSHINA KANNADA DISTRICT ---
    { state: "Karnataka", district: "Dakshina Kannada", cityTown: "Mangaluru", serviceArea: "Hampankatta", postalCode: "575001" },
    { state: "Karnataka", district: "Dakshina Kannada", cityTown: "Mangaluru", serviceArea: "Kadri", postalCode: "575002" },
    { state: "Karnataka", district: "Dakshina Kannada", cityTown: "Mangaluru", serviceArea: "Bejai", postalCode: "575004" },
    { state: "Karnataka", district: "Dakshina Kannada", cityTown: "Mangaluru", serviceArea: "Surathkal", postalCode: "575014" },
    { state: "Karnataka", district: "Dakshina Kannada", cityTown: "Mangaluru", serviceArea: "Panambur", postalCode: "575010" },
    { state: "Karnataka", district: "Dakshina Kannada", cityTown: "Bantwal", serviceArea: "Bantwal Town", postalCode: "574211" },
    { state: "Karnataka", district: "Dakshina Kannada", cityTown: "Puttur", serviceArea: "Puttur Town", postalCode: "574201" },
    { state: "Karnataka", district: "Dakshina Kannada", cityTown: "Belthangady", serviceArea: "Belthangady Town", postalCode: "574214" },
    { state: "Karnataka", district: "Dakshina Kannada", cityTown: "Sullia", serviceArea: "Sullia Town", postalCode: "574239" },
    { state: "Karnataka", district: "Dakshina Kannada", cityTown: "Moodabidri", serviceArea: "Moodabidri Town", postalCode: "574227" },

    // --- BELAGAVI DISTRICT ---
    { state: "Karnataka", district: "Belagavi", cityTown: "Belagavi", serviceArea: "Belagavi City", postalCode: "590001" },
    { state: "Karnataka", district: "Belagavi", cityTown: "Belagavi", serviceArea: "Tilakwadi", postalCode: "590006" },
    { state: "Karnataka", district: "Belagavi", cityTown: "Gokak", serviceArea: "Gokak Town", postalCode: "591307" },
    { state: "Karnataka", district: "Belagavi", cityTown: "Chikkodi", serviceArea: "Chikkodi Town", postalCode: "591201" },
    { state: "Karnataka", district: "Belagavi", cityTown: "Nipani", serviceArea: "Nipani Town", postalCode: "591237" },
    { state: "Karnataka", district: "Belagavi", cityTown: "Bailhongal", serviceArea: "Bailhongal Town", postalCode: "591102" },

    // --- TUMAKURU DISTRICT ---
    { state: "Karnataka", district: "Tumakuru", cityTown: "Tumakuru", serviceArea: "Tumakuru City", postalCode: "572101" },
    { state: "Karnataka", district: "Tumakuru", cityTown: "Tumakuru", serviceArea: "Batawadi", postalCode: "572107" },
    { state: "Karnataka", district: "Tumakuru", cityTown: "Tiptur", serviceArea: "Tiptur Town", postalCode: "572201" },
    { state: "Karnataka", district: "Tumakuru", cityTown: "Kunigal", serviceArea: "Kunigal Town", postalCode: "572130" },
    { state: "Karnataka", district: "Tumakuru", cityTown: "Sira", serviceArea: "Sira Town", postalCode: "572137" },

    // --- SHIVAMOGGA DISTRICT ---
    { state: "Karnataka", district: "Shivamogga", cityTown: "Shivamogga", serviceArea: "Shivamogga City", postalCode: "577201" },
    { state: "Karnataka", district: "Shivamogga", cityTown: "Shivamogga", serviceArea: "Vinoba Nagar", postalCode: "577204" },
    { state: "Karnataka", district: "Shivamogga", cityTown: "Bhadravati", serviceArea: "Bhadravati Town", postalCode: "577301" },
    { state: "Karnataka", district: "Shivamogga", cityTown: "Sagar", serviceArea: "Sagar Town", postalCode: "577401" },

    // --- UDUPI DISTRICT ---
    { state: "Karnataka", district: "Udupi", cityTown: "Udupi", serviceArea: "Udupi City", postalCode: "576101" },
    { state: "Karnataka", district: "Udupi", cityTown: "Udupi", serviceArea: "Manipal", postalCode: "576104" },
    { state: "Karnataka", district: "Udupi", cityTown: "Udupi", serviceArea: "Malpe", postalCode: "576108" },
    { state: "Karnataka", district: "Udupi", cityTown: "Kundapura", serviceArea: "Kundapura Town", postalCode: "576201" },
    { state: "Karnataka", district: "Udupi", cityTown: "Karkala", serviceArea: "Karkala Town", postalCode: "574104" },

    // --- DHARWAD DISTRICT ---
    { state: "Karnataka", district: "Dharwad", cityTown: "Hubballi", serviceArea: "Hubballi City", postalCode: "580020" },
    { state: "Karnataka", district: "Dharwad", cityTown: "Hubballi", serviceArea: "Vidyanagar Hubballi", postalCode: "580021" },
    { state: "Karnataka", district: "Dharwad", cityTown: "Dharwad", serviceArea: "Dharwad City", postalCode: "580001" },

    // --- BALLARI DISTRICT ---
    { state: "Karnataka", district: "Ballari", cityTown: "Ballari", serviceArea: "Ballari City", postalCode: "583101" },
    { state: "Karnataka", district: "Ballari", cityTown: "Ballari", serviceArea: "Cantonment", postalCode: "583104" },
    { state: "Karnataka", district: "Ballari", cityTown: "Sandur", serviceArea: "Sandur Town", postalCode: "583119" },

    // --- KALABURAGI DISTRICT ---
    { state: "Karnataka", district: "Kalaburagi", cityTown: "Kalaburagi", serviceArea: "Kalaburagi City", postalCode: "585101" },
    { state: "Karnataka", district: "Kalaburagi", cityTown: "Kalaburagi", serviceArea: "Super Market", postalCode: "585101" },
    { state: "Karnataka", district: "Kalaburagi", cityTown: "Sedam", serviceArea: "Sedam Town", postalCode: "585222" }
];
