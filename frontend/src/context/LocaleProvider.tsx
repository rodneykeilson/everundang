import { useCallback, useMemo, useState } from "react";
import { LocaleContext, type Locale } from "./LocaleContext";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    heroTitle: "Craft immersive digital invitations in minutes",
    heroSubtitle:
      "Design, publish, and share beautifully responsive invitations with real-time RSVPs and analytics.",
    heroPrimaryCta: "Create invitation",
    heroSecondaryCta: "Explore live demo",
    featureTemplates: "Curated templates",
    featureTemplatesDesc: "Start with professionally designed themes for weddings, birthdays, and corporate events.",
    featureAnalytics: "Insightful analytics",
    featureAnalyticsDesc: "Understand guest engagement with live RSVPs, conversion funnel, and attendance tracking.",
    featureSecurity: "Secure by design",
    featureSecurityDesc: "Owner-only edit links, admin controls, and privacy-first data handling built in.",
    sectionTemplatesTitle: "Live Invitations",
    sectionTemplatesSubtitle:
      "Preview invitations built with EverUndang and discover layouts ready for your next event.",
    dashboardCta: "Open dashboard",
    faqTitle: "Frequently asked questions",
    faq01Title: "Do I need an account?",
    faq01Body: "No accounts required. Each invitation comes with an owner link you can safely share with collaborators.",
    faq02Title: "Can I customise the design?",
    faq02Body: "Yes. Adjust colours, typography, sections, gallery, RSVP flows, and more in the visual builder.",
    faq03Title: "Is the guest data secure?",
    faq03Body: "All sensitive tokens are hashed, links are signed, and you control who can submit RSVPs.",
    footerRights: "All rights reserved.",
    languageLabel: "Language",
    themeLabel: "Theme",
    navTemplates: "Templates",
    navFaq: "FAQ",
    navAdmin: "Admin",
    navDashboard: "Dashboard",
    templatesCuratedLabel: "Curated starting points",
    templatesLiveLabel: "Live invitations",
    templateUseButton: "Use this template",
    templateDetailsButton: "Learn more",
    templateApplied: "Using template",
    templateAppliedDescription: "Fields are pre-filled from this template. You can still customise every detail before publishing.",
    templateClear: "Remove template",
    createTitle: "Launch a new invitation",
    createLead:
      "Share a few basics and we will generate a private owner link so you can continue crafting the perfect experience.",
    createTemplateCallout: "Template applied",
    templatesEmptyMessage:
      "No live invitations yet. Publish your first invitation to showcase it here.",
  },
  id: {
    heroTitle: "Buat undangan digital yang menawan dalam hitungan menit",
    heroSubtitle:
      "Rancang, terbitkan, dan bagikan undangan responsif dengan RSVP dan analitik waktu nyata.",
    heroPrimaryCta: "Buat undangan",
    heroSecondaryCta: "Lihat demo",
    featureTemplates: "Template pilihan",
    featureTemplatesDesc:
      "Mulai dari tema profesional untuk pernikahan, ulang tahun, hingga acara perusahaan.",
    featureAnalytics: "Analitik mendalam",
    featureAnalyticsDesc:
      "Pantau keterlibatan tamu melalui RSVP langsung, funnel konversi, dan pelacakan kehadiran.",
    featureSecurity: "Keamanan terjamin",
    featureSecurityDesc:
      "Link editor khusus, kontrol admin, dan pengelolaan data berprinsip privasi.",
    sectionTemplatesTitle: "Undangan yang sudah tayang",
    sectionTemplatesSubtitle:
      "Lihat contoh undangan buatan EverUndang dan temukan layout siap pakai untuk acara Anda.",
    dashboardCta: "Buka dashboard",
    faqTitle: "Pertanyaan umum",
    faq01Title: "Perlu buat akun?",
    faq01Body:
      "Tidak perlu. Setiap undangan punya tautan pemilik yang bisa dibagikan aman dengan kolaborator.",
    faq02Title: "Apakah bisa kustom desainnya?",
    faq02Body:
      "Bisa. Ubah warna, tipografi, susunan bagian, galeri, alur RSVP, dan lainnya di builder visual.",
    faq03Title: "Data tamu aman?",
    faq03Body:
      "Token sensitif di-hash, tautan ditandatangani, dan Anda mengatur siapa yang bisa mengirim RSVP.",
    footerRights: "Seluruh hak cipta dilindungi.",
    languageLabel: "Bahasa",
    themeLabel: "Tema",
    navTemplates: "Template",
    navFaq: "FAQ",
    navAdmin: "Admin",
    navDashboard: "Dashboard",
    templatesCuratedLabel: "Pilihan template",
    templatesLiveLabel: "Undangan yang sudah tayang",
    templateUseButton: "Pakai template ini",
    templateDetailsButton: "Selengkapnya",
    templateApplied: "Menggunakan template",
    templateAppliedDescription: "Field sudah terisi dari template ini. Anda tetap bisa mengubah semua detail sebelum publikasi.",
    templateClear: "Hapus template",
    createTitle: "Buat undangan baru",
    createLead:
      "Isi informasi dasar dan kami akan membuat tautan pemilik pribadi agar Anda bisa lanjut mengatur semuanya.",
    createTemplateCallout: "Template aktif",
    templatesEmptyMessage:
      "Belum ada undangan tayang. Publikasikan undangan pertama Anda untuk menampilkannya di sini.",
  },
};

const LOCALE_STORAGE_KEY = "everundang_locale";

const getInitialLocale = (): Locale => {
  if (typeof window === "undefined") {
    return "en";
  }
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
  if (stored === "en" || stored === "id") {
    return stored;
  }
  const browser = window.navigator.language?.toLowerCase();
  if (browser.startsWith("id")) {
    return "id";
  }
  return "en";
};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      return getInitialLocale();
    } catch {
      return "en";
    }
  });

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo(() => {
    const dictionary = translations[locale] ?? translations.en;
    const translate = (key: string) => dictionary[key] ?? key;
    return {
      locale,
      setLocale,
      t: translate,
      translations: dictionary,
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
