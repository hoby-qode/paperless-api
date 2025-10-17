export default {
  completeDelayedOrders: {
    task: async ({ strapi }) => {
      const oneDayAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      const commandes = await strapi.entityService.findMany(
        "api::commande.commande",
        {
          filters: {
            statusCommande: "delivered",
            updatedAt: { $lt: oneDayAgo },
          },
        }
      );
      for (const commande of commandes) {
        await strapi.entityService.update(
          "api::commande.commande",
          commande.id,
          {
            data: { statusCommande: "completed" },
          }
        );
      }
      strapi.log.info(
        `Cron: ${commandes.length} commandes délogées en completed`
      );
    },
    options: {
      rule: "0 0 * * *",
      // tz: 'Europe/Paris', // optionnel, à adapter à ton fuseau
    },
  },
};
