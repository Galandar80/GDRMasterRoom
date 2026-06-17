export type CampaignPreset = {
  id: string;
  title: string;
  genre: string;
  summary: string;
  campaignTitle: string;
  description: string;
  roomName: string;
  maxPlayers: number;
  sceneTitle: string;
  sceneDescription: string;
  coverImageUrl: string;
  sceneImageUrl: string;
  tags: string[];
};

export const campaignPresets: CampaignPreset[] = [
  {
    id: "fantasy-investigation",
    title: "Fantasy investigativo",
    genre: "Fantasy / Mistero",
    summary: "Un caso oscuro, fazioni ambigue e una prima scena pronta per far parlare i giocatori.",
    campaignTitle: "Il Sigillo della Luna Spezzata",
    description: "Una citta di confine nasconde un patto antico. Ogni indizio porta verso famiglie nobili, culti sotterranei e magie proibite.",
    roomName: "Sala del Sigillo",
    maxPlayers: 5,
    sceneTitle: "La Biblioteca Proibita",
    sceneDescription: "La pioggia batte sulle vetrate alte. Tra scaffali chiusi da catene, una pagina strappata pulsa di luce azzurra.",
    coverImageUrl: "/assets/menu/theme-fantasy.png",
    sceneImageUrl: "/assets/menu/master-room-hero.png",
    tags: ["indagine", "magia", "intrigo"]
  },
  {
    id: "gothic-horror",
    title: "Horror gotico",
    genre: "Horror / Gotico",
    summary: "Atmosfera cupa, segreti familiari e tensione crescente fin dalla prima scena.",
    campaignTitle: "Le Campane di Vetro Nero",
    description: "Un villaggio isolato celebra un funerale senza corpo. Ogni rintocco della torre sembra cancellare un ricordo agli abitanti.",
    roomName: "Cripta dei Rintocchi",
    maxPlayers: 4,
    sceneTitle: "Il Vestibolo della Villa",
    sceneDescription: "Candele quasi spente illuminano ritratti con occhi graffiati. Dal piano superiore arriva un passo lento, poi silenzio.",
    coverImageUrl: "/assets/menu/theme-lovecraft.png",
    sceneImageUrl: "/assets/menu/theme-lovecraft.png",
    tags: ["paura", "mistero", "segreti"]
  },
  {
    id: "cyberpunk-noir",
    title: "Cyberpunk noir",
    genre: "Cyberpunk / Noir",
    summary: "Contratti sporchi, neon, corporazioni e un incipit ad alta pressione.",
    campaignTitle: "Neon sotto la Pioggia Acida",
    description: "Una metropoli verticale vende identita, memorie e corpi. Un file rubato puo far crollare il distretto o salvarlo.",
    roomName: "Nodo 47",
    maxPlayers: 5,
    sceneTitle: "Mercato Nero Sotto La Linea",
    sceneDescription: "Ologrammi difettosi tremano sul cemento bagnato. Il contatto non e arrivato, ma qualcuno sta gia osservando il gruppo.",
    coverImageUrl: "/assets/menu/theme-cyberpunk.png",
    sceneImageUrl: "/assets/menu/theme-cyberpunk.png",
    tags: ["neon", "hacker", "corporazioni"]
  },
  {
    id: "scifi-expedition",
    title: "Sci-fi esplorativo",
    genre: "Fantascienza / Esplorazione",
    summary: "Una missione nello spazio profondo con anomalie, equipaggio e scelte morali.",
    campaignTitle: "Oltre il Velo di Kepler",
    description: "Una nave scientifica riceve un segnale impossibile da un sistema dichiarato morto. Il viaggio di ritorno non e garantito.",
    roomName: "Ponte della Kepler",
    maxPlayers: 6,
    sceneTitle: "Orbita del Relitto",
    sceneDescription: "Il relitto ruota lentamente davanti agli oblò. Tutti i canali radio trasmettono la stessa voce: 'Non aprite il ponte 3'.",
    coverImageUrl: "/assets/menu/theme-scifi.png",
    sceneImageUrl: "/assets/menu/theme-scifi.png",
    tags: ["spazio", "anomalia", "equipaggio"]
  },
  {
    id: "oneshot-dungeon",
    title: "One-shot dungeon",
    genre: "Fantasy / Dungeon Crawl",
    summary: "Struttura rapida per una serata: obiettivo chiaro, luogo pericoloso, ricompensa immediata.",
    campaignTitle: "La Porta sotto la Collina",
    description: "Una cripta dimenticata si e riaperta dopo un terremoto. Dentro, qualcosa conta i passi degli intrusi.",
    roomName: "Spedizione della Collina",
    maxPlayers: 4,
    sceneTitle: "Ingresso della Cripta",
    sceneDescription: "L'aria odora di terra bagnata e ferro. Sulla pietra, una frase: 'Entrate in quattro, uscite in tre'.",
    coverImageUrl: "/assets/menu/theme-fantasy.png",
    sceneImageUrl: "/assets/menu/master-room-hero.png",
    tags: ["one-shot", "dungeon", "tesoro"]
  }
];
