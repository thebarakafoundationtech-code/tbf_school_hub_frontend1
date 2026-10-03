export interface District {
  name: string;
  code: string;
}

export interface Region {
  name: string;
  code: string;
  districts: District[];
}

export const TANZANIA_REGIONS: Region[] = [
  {
    name: "Arusha",
    code: "ARU",
    districts: [
      { name: "Arusha City", code: "ARU-CTY" },
      { name: "Arusha Rural", code: "ARU-RUR" },
      { name: "Karatu", code: "ARU-KAR" },
      { name: "Longido", code: "ARU-LON" },
      { name: "Meru", code: "ARU-MER" },
      { name: "Monduli", code: "ARU-MON" },
      { name: "Ngorongoro", code: "ARU-NGO" }
    ]
  },
  {
    name: "Dar es Salaam",
    code: "DAR",
    districts: [
      { name: "Ilala", code: "DAR-ILA" },
      { name: "Kinondoni", code: "DAR-KIN" },
      { name: "Temeke", code: "DAR-TEM" },
      { name: "Kigamboni", code: "DAR-KIG" },
      { name: "Ubungo", code: "DAR-UBU" }
    ]
  },
  {
    name: "Dodoma",
    code: "DOD",
    districts: [
      { name: "Dodoma City", code: "DOD-CTY" },
      { name: "Bahi", code: "DOD-BAH" },
      { name: "Chamwino", code: "DOD-CHW" },
      { name: "Chemba", code: "DOD-CHM" },
      { name: "Kondoa", code: "DOD-KON" },
      { name: "Kongwa", code: "DOD-KGW" },
      { name: "Mpwapwa", code: "DOD-MPW" }
    ]
  },
  {
    name: "Geita",
    code: "GEI",
    districts: [
      { name: "Geita Town", code: "GEI-GTC" },
      { name: "Geita Rural", code: "GEI-RUR" },
      { name: "Bukombe", code: "GEI-BUK" },
      { name: "Chato", code: "GEI-CHA" },
      { name: "Mbogwe", code: "GEI-MBO" },
      { name: "Nyang'hwale", code: "GEI-NYA" }
    ]
  },
  {
    name: "Iringa",
    code: "IRN",
    districts: [
      { name: "Iringa Municipal", code: "IRN-MC" },
      { name: "Iringa Rural", code: "IRN-RUR" },
      { name: "Kilolo", code: "IRN-KIL" },
      { name: "Mufindi", code: "IRN-MUF" },
      { name: "Mafinga Town", code: "IRN-MAF" }
    ]
  },
  {
    name: "Kagera",
    code: "KAG",
    districts: [
      { name: "Bukoba Municipal", code: "KAG-BKC" },
      { name: "Bukoba Rural", code: "KAG-BKR" },
      { name: "Muleba", code: "KAG-MUL" },
      { name: "Karagwe", code: "KAG-KAR" },
      { name: "Kyerwa", code: "KAG-KYE" },
      { name: "Ngara", code: "KAG-NGA" },
      { name: "Biharamulo", code: "KAG-BIH" },
      { name: "Missenyi", code: "KAG-MIS" }
    ]
  },
  {
    name: "Katavi",
    code: "KAT",
    districts: [
      { name: "Mpanda Municipal", code: "KAT-MMC" },
      { name: "Mpanda Rural", code: "KAT-MR" },
      { name: "Mlele", code: "KAT-MLE" },
      { name: "Tanganyika", code: "KAT-TAN" }
    ]
  },
  {
    name: "Kigoma",
    code: "KIG",
    districts: [
      { name: "Kigoma Ujiji Municipal", code: "KIG-MC" },
      { name: "Kigoma Rural", code: "KIG-RUR" },
      { name: "Kasulu Town", code: "KIG-KTC" },
      { name: "Kasulu Rural", code: "KIG-KSR" },
      { name: "Kibondo", code: "KIG-KBD" },
      { name: "Kakonko", code: "KIG-KAK" },
      { name: "Buhigwe", code: "KIG-BUH" },
      { name: "Uvinza", code: "KIG-UVI" }
    ]
  },
  {
    name: "Kilimanjaro",
    code: "KIL",
    districts: [
      { name: "Moshi Municipal", code: "KIL-MC" },
      { name: "Moshi Rural", code: "KIL-RUR" },
      { name: "Hai", code: "KIL-HAI" },
      { name: "Siha", code: "KIL-SIH" },
      { name: "Rombo", code: "KIL-ROM" },
      { name: "Mwanga", code: "KIL-MWA" },
      { name: "Same", code: "KIL-SAM" }
    ]
  },
  {
    name: "Lindi",
    code: "LIN",
    districts: [
      { name: "Lindi Municipal", code: "LIN-MC" },
      { name: "Lindi Rural (Mtama)", code: "LIN-MTA" },
      { name: "Kilwa", code: "LIN-KIL" },
      { name: "Liwale", code: "LIN-LIW" },
      { name: "Nachingwea", code: "LIN-NAC" },
      { name: "Ruangwa", code: "LIN-RUA" }
    ]
  },
  {
    name: "Manyara",
    code: "MYR",
    districts: [
      { name: "Babati Town", code: "MYR-BTC" },
      { name: "Babati Rural", code: "MYR-BBR" },
      { name: "Hanang", code: "MYR-HAN" },
      { name: "Kiteto", code: "MYR-KIT" },
      { name: "Mbulu Town", code: "MYR-MTC" },
      { name: "Mbulu Rural", code: "MYR-MBR" },
      { name: "Simanjiro", code: "MYR-SIM" }
    ]
  },
  {
    name: "Mara",
    code: "MAR",
    districts: [
      { name: "Musoma Municipal", code: "MAR-MC" },
      { name: "Musoma Rural", code: "MAR-RUR" },
      { name: "Bunda Town", code: "MAR-BTC" },
      { name: "Bunda Rural", code: "MAR-BDR" },
      { name: "Butiama", code: "MAR-BUT" },
      { name: "Rorya", code: "MAR-ROR" },
      { name: "Serengeti", code: "MAR-SER" },
      { name: "Tarime Town", code: "MAR-TTC" },
      { name: "Tarime Rural", code: "MAR-TRR" }
    ]
  },
  {
    name: "Mbeya",
    code: "MBY",
    districts: [
      { name: "Mbeya City", code: "MBY-CTY" },
      { name: "Mbeya Rural", code: "MBY-RUR" },
      { name: "Chunya", code: "MBY-CHU" },
      { name: "Kyela", code: "MBY-KYE" },
      { name: "Rungwe", code: "MBY-RUN" },
      { name: "Mbarali", code: "MBY-MBA" }
    ]
  },
  {
    name: "Morogoro",
    code: "MOR",
    districts: [
      { name: "Morogoro Municipal", code: "MOR-MC" },
      { name: "Morogoro Rural", code: "MOR-RUR" },
      { name: "Kilosa", code: "MOR-KLS" },
      { name: "Kilombero", code: "MOR-KLM" },
      { name: "Ifakara Town", code: "MOR-IFA" },
      { name: "Ulanga", code: "MOR-ULA" },
      { name: "Malinyi", code: "MOR-MLN" },
      { name: "Gairo", code: "MOR-GAI" },
      { name: "Mvomero", code: "MOR-MVO" }
    ]
  },
  {
    name: "Mtwara",
    code: "MTW",
    districts: [
      { name: "Mtwara Municipal", code: "MTW-MC" },
      { name: "Mtwara Rural", code: "MTW-RUR" },
      { name: "Masasi Town", code: "MTW-MST" },
      { name: "Masasi Rural", code: "MTW-MSR" },
      { name: "Nanyamba Town", code: "MTW-NYM" },
      { name: "Nanyumbu", code: "MTW-NAN" },
      { name: "Newala Town", code: "MTW-NWT" },
      { name: "Newala Rural", code: "MTW-NWR" },
      { name: "Tandahimba", code: "MTW-TAN" }
    ]
  },
  {
    name: "Mwanza",
    code: "MWZ",
    districts: [
      { name: "Ilemela Municipal", code: "MWZ-ILE" },
      { name: "Nyamagana Municipal", code: "MWZ-NYA" },
      { name: "Kwimba", code: "MWZ-KWI" },
      { name: "Magu", code: "MWZ-MAG" },
      { name: "Misungwi", code: "MWZ-MIS" },
      { name: "Sengerema", code: "MWZ-SEN" },
      { name: "Ukerewe", code: "MWZ-UKE" },
      { name: "Buchosa", code: "MWZ-BUC" }
    ]
  },
  {
    name: "Njombe",
    code: "NJM",
    districts: [
      { name: "Njombe Town", code: "NJM-NTC" },
      { name: "Njombe Rural", code: "NJM-RUR" },
      { name: "Makambako Town", code: "NJM-MAK" },
      { name: "Ludewa", code: "NJM-LUD" },
      { name: "Makete", code: "NJM-MKT" },
      { name: "Wanging'ombe", code: "NJM-WAN" }
    ]
  },
  {
    name: "Pemba North",
    code: "PEM-N",
    districts: [
      { name: "Wete", code: "PEM-WET" },
      { name: "Micheweni", code: "PEM-MIC" }
    ]
  },
  {
    name: "Pemba South",
    code: "PEM-S",
    districts: [
      { name: "Chake Chake", code: "PEM-CHK" },
      { name: "Mkoani", code: "PEM-MKO" }
    ]
  },
  {
    name: "Pwani",
    code: "PWN",
    districts: [
      { name: "Kibaha Town", code: "PWN-KTC" },
      { name: "Kibaha Rural", code: "PWN-KBR" },
      { name: "Bagamoyo", code: "PWN-BAG" },
      { name: "Chalinze", code: "PWN-CHA" },
      { name: "Kisarawe", code: "PWN-KIS" },
      { name: "Mkuranga", code: "PWN-MKU" },
      { name: "Rufiji", code: "PWN-RUF" },
      { name: "Kibiti", code: "PWN-KBT" },
      { name: "Mafia Island", code: "PWN-MAF" }
    ]
  },
  {
    name: "Rukwa",
    code: "RUK",
    districts: [
      { name: "Sumbawanga Municipal", code: "RUK-MC" },
      { name: "Sumbawanga Rural", code: "RUK-RUR" },
      { name: "Kalambo", code: "RUK-KAL" },
      { name: "Nkasi", code: "RUK-NKA" }
    ]
  },
  {
    name: "Ruvuma",
    code: "RUV",
    districts: [
      { name: "Songea Municipal", code: "RUV-MC" },
      { name: "Songea Rural", code: "RUV-RUR" },
      { name: "Mbinga Town", code: "RUV-MTC" },
      { name: "Mbinga Rural", code: "RUV-MBR" },
      { name: "Namtumbo", code: "RUV-NAM" },
      { name: "Nyasa", code: "RUV-NYA" },
      { name: "Tunduru", code: "RUV-TUN" },
      { name: "Madaba", code: "RUV-MAD" }
    ]
  },
  {
    name: "Shinyanga",
    code: "SHY",
    districts: [
      { name: "Shinyanga Municipal", code: "SHY-MC" },
      { name: "Shinyanga Rural", code: "SHY-RUR" },
      { name: "Kahama Municipal", code: "SHY-KMC" },
      { name: "Kishapu", code: "SHY-KIS" },
      { name: "Msalala", code: "SHY-MSL" },
      { name: "Ushetu", code: "SHY-USH" }
    ]
  },
  {
    name: "Simiyu",
    code: "SIM",
    districts: [
      { name: "Bariadi Town", code: "SIM-BTC" },
      { name: "Bariadi Rural", code: "SIM-BRR" },
      { name: "Busega", code: "SIM-BUS" },
      { name: "Itilima", code: "SIM-ITI" },
      { name: "Maswa", code: "SIM-MAS" },
      { name: "Meatu", code: "SIM-MEA" }
    ]
  },
  {
    name: "Singida",
    code: "SNG",
    districts: [
      { name: "Singida Municipal", code: "SNG-MC" },
      { name: "Singida Rural", code: "SNG-RUR" },
      { name: "Ikungi", code: "SNG-IKU" },
      { name: "Iramba", code: "SNG-IRA" },
      { name: "Itigi", code: "SNG-ITI" },
      { name: "Manyoni", code: "SNG-MAN" },
      { name: "Mkalama", code: "SNG-MKA" }
    ]
  },
  {
    name: "Songwe",
    code: "SON",
    districts: [
      { name: "Vwawa / Mbozi", code: "SON-MBO" },
      { name: "Ileje", code: "SON-ILE" },
      { name: "Momba", code: "SON-MOM" },
      { name: "Songwe District", code: "SON-DST" },
      { name: "Tunduma Town", code: "SON-TUN" }
    ]
  },
  {
    name: "Tabora",
    code: "TAB",
    districts: [
      { name: "Tabora Municipal", code: "TAB-MC" },
      { name: "Uyui", code: "TAB-UYU" },
      { name: "Igunga", code: "TAB-IGU" },
      { name: "Kaliua", code: "TAB-KAL" },
      { name: "Nzega Town", code: "TAB-NZT" },
      { name: "Nzega Rural", code: "TAB-NZR" },
      { name: "Sikonge", code: "TAB-SIK" },
      { name: "Urambo", code: "TAB-URA" }
    ]
  },
  {
    name: "Tanga",
    code: "TAN",
    districts: [
      { name: "Tanga City", code: "TAN-CTY" },
      { name: "Korogwe Town", code: "TAN-KTC" },
      { name: "Korogwe Rural", code: "TAN-KRR" },
      { name: "Muheza", code: "TAN-MUH" },
      { name: "Lushoto", code: "TAN-LUS" },
      { name: "Bumbuli", code: "TAN-BUM" },
      { name: "Handeni Town", code: "TAN-HTC" },
      { name: "Handeni Rural", code: "TAN-HNR" },
      { name: "Kilindi", code: "TAN-KIL" },
      { name: "Mkinga", code: "TAN-MKI" },
      { name: "Pangani", code: "TAN-PAN" }
    ]
  },
  {
    name: "Zanzibar North",
    code: "ZNZ-N",
    districts: [
      { name: "Kaskazini A (North A)", code: "ZNZ-NTA" },
      { name: "Kaskazini B (North B)", code: "ZNZ-NTB" }
    ]
  },
  {
    name: "Zanzibar South",
    code: "ZNZ-S",
    districts: [
      { name: "Kati (Central)", code: "ZNZ-CTR" },
      { name: "Kusini (South)", code: "ZNZ-STH" }
    ]
  },
  {
    name: "Zanzibar Urban / West",
    code: "ZNZ-U",
    districts: [
      { name: "Mjini (Urban)", code: "ZNZ-URB" },
      { name: "Magharibi A (West A)", code: "ZNZ-WSTA" },
      { name: "Magharibi B (West B)", code: "ZNZ-WSTB" }
    ]
  }
];
