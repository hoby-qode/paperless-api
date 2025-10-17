import type { StrapiApp } from "@strapi/strapi/admin";

export default {
  config: {
    locales: ["fr"],
    defaultLocale: "fr",
  },
  bootstrap(app: StrapiApp) {
    console.log(app);
  },
};
