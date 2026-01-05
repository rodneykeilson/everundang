export interface TemplatePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  previewImage: string;
  slugSuggestion: string;
  headline: string;
  brideName: string;
  groomName: string;
  eventTitle: string;
  eventVenue: string;
  eventAddress?: string;
  eventTime: string;
  backgroundImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  eventDateOffsetDays?: number;
}

export const curatedTemplates: TemplatePreset[] = [
  {
    id: "classic-romance",
    name: "Classic Romance",
    category: "Wedding",
    description: "Soft gradients and elegant serif typography for timeless wedding celebrations.",
    tags: ["Evening ceremony", "Elegant", "Monogram"],
    previewImage:
      "https://images.unsplash.com/photo-1551468307-8c1e3c78013c?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070",
    slugSuggestion: "classic-romance",
    headline: "Celebrate Our Wedding",
    brideName: "Aditya",
    groomName: "Naya",
    eventTitle: "Wedding Ceremony",
    eventVenue: "The Glass House",
    eventAddress: "Jakarta, Indonesia",
    eventTime: "17:30",
    backgroundImageUrl:
      "https://images.unsplash.com/photo-1551468307-8c1e3c78013c?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070",
    primaryColor: "#8b5cf6",
    secondaryColor: "#f472b6",
    eventDateOffsetDays: 120,
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    category: "Corporate",
    description: "Bold sans-serif layouts with a clean grid and subtle gradients for launches and mixers.",
    tags: ["Launch", "Hybrid event", "Minimal"],
    previewImage:
      "https://images.unsplash.com/photo-1680116916173-579191ba172f?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070",
    slugSuggestion: "modern-minimal",
    headline: "Together We Innovate",
    brideName: "Everlabs",
    groomName: "Partners",
    eventTitle: "Product Launch Mixer",
    eventVenue: "Skyline Hub",
    eventAddress: "Bandung, Indonesia",
    eventTime: "19:00",
    backgroundImageUrl:
      "https://images.unsplash.com/photo-1680116916173-579191ba172f?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070",
    primaryColor: "#2563eb",
    secondaryColor: "#22d3ee",
    eventDateOffsetDays: 45,
  },
  {
    id: "playful-birthday",
    name: "Playful Birthday",
    category: "Birthday",
    description: "Bright colours and illustrated confetti details perfect for kids and milestone parties.",
    tags: ["Family", "Photo gallery", "RSVP tracking"],
    previewImage:
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070",
    slugSuggestion: "playful-birthday",
    headline: "Join The Celebration",
    brideName: "Kara",
    groomName: "Friends",
    eventTitle: "Seventh Birthday Bash",
    eventVenue: "Wonderland Playhouse",
    eventAddress: "Surabaya, Indonesia",
    eventTime: "10:30",
    backgroundImageUrl:
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2070",
    primaryColor: "#f97316",
    secondaryColor: "#facc15",
    eventDateOffsetDays: 30,
  },
];

export function getTemplatePreset(id: string): TemplatePreset | undefined {
  return curatedTemplates.find((template) => template.id === id);
}
