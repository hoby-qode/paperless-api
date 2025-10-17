"use strict";
const webpush = require("web-push");

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = {
  async sendToUser(userId, payload) {
    const subs = await strapi.db
      .query("api::subscription.subscription")
      .findMany({
        where: { user: userId },
      });
    console.log("subs", subs);
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.keys.auth,
              p256dh: sub.keys.p256dh,
            },
          },
          JSON.stringify(payload)
        );
      } catch (err) {
        console.error("Erreur envoi push:", err);
      }
    }
  },
};
