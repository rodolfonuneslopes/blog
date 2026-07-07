import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://blog.nuneslopes.org/",
    title: "blog.nuneslopes",
    description: "Rodolfo Lopes' personal blog.",
    author: "rodolfonuneslopes",
    profile: "https://github.com/rodolfonuneslopes",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "Europe/Lisbon",
    dir: "ltr",
  },
  posts: {
    perPage: 4,
    perIndex: 4,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
  },
  socials: [
    { name: "github",   url: "https://github.com/rodolfonuneslopes" },
    { name: "linkedin", url: "https://www.linkedin.com/in/rodolfo-nunes-lopes/" },
    { name: "mail",     url: "mailto:blog@nuneslopes.org" },
  ],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "facebook", url: "https://www.facebook.com/sharer.php?u=" },
    { name: "x",        url: "https://x.com/intent/post?url=" },
    { name: "telegram", url: "https://t.me/share/url?url=" },
    { name: "pinterest", url: "https://pinterest.com/pin/create/button/?url=" },
    { name: "mail",     url: "mailto:?subject=See%20this%20post&body=" },
  ],
});