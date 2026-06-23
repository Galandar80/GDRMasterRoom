export const VISUAL_THEME_STORAGE_KEY = "gdr_visual_theme";
export const VISUAL_THEME_EVENT = "gdr:visual-theme-change";

export const VISUAL_THEMES = {
  fantasy: {
    id: "fantasy",
    label: "Classic Fantasy",
    className: "theme-fantasy",
    menuImage: "/assets/menu/theme-fantasy.png",
    menuVideo: "/assets/menu/theme-master-room-hero.mp4",
    music: "/assets/audio/master-room-ambience-2.mp3"
  },
  cyberpunk: {
    id: "cyberpunk",
    label: "Cyberpunk Neon",
    className: "theme-cyberpunk",
    menuImage: "/assets/menu/theme-cyberpunk.png",
    menuVideo: "/assets/menu/theme-cyber-master-room-hero.mp4",
    music: "/assets/menu/GDR%20Master%20Room%20-%20cyberpunk.mp3"
  },
  lovecraft: {
    id: "lovecraft",
    label: "Eldritch Terror",
    className: "theme-lovecraft",
    menuImage: "/assets/menu/theme-lovecraft.png",
    menuVideo: "/assets/menu/theme-eldritch-master-room-hero.mp4",
    music: "/assets/menu/GDR%20Master%20Room_%20Eldritch%20Echoes.mp3"
  },
  scifi: {
    id: "scifi",
    label: "Space Odyssey",
    className: "theme-scifi",
    menuImage: "/assets/menu/theme-scifi.png",
    menuVideo: "/assets/menu/theme-scifi-master-room-hero.mp4",
    music: "/assets/menu/GDR%20Master%20scifi.mp3"
  }
} as const;

export type VisualThemeId = keyof typeof VISUAL_THEMES;

const THEME_CLASSES = Object.values(VISUAL_THEMES).map((theme) => theme.className);

export function isVisualThemeId(value: string | null): value is VisualThemeId {
  return Boolean(value && value in VISUAL_THEMES);
}

export function readVisualTheme(): VisualThemeId {
  if (typeof window === "undefined") return "fantasy";
  const stored = window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY);
  return isVisualThemeId(stored) ? stored : "fantasy";
}

export function applyVisualTheme(themeId: VisualThemeId, persist = true) {
  if (typeof document === "undefined") return;

  document.documentElement.classList.remove(...THEME_CLASSES);
  document.documentElement.classList.add(VISUAL_THEMES[themeId].className);
  document.documentElement.dataset.visualTheme = themeId;

  if (persist && typeof window !== "undefined") {
    window.localStorage.setItem(VISUAL_THEME_STORAGE_KEY, themeId);
    window.dispatchEvent(new CustomEvent<VisualThemeId>(VISUAL_THEME_EVENT, { detail: themeId }));
  }
}
