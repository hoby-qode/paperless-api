// src/index.ts
import { Core } from "@strapi/strapi";
import { Server } from "socket.io";

export default {
  register() {
    // Pas besoin de middleware ici pour le moment
  },

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const httpServer = strapi.server.httpServer;

    if (!httpServer) {
      strapi.log.error("Impossible de récupérer httpServer de Strapi");
      return;
    }

    // Initialiser socket.io
    const io = new Server(httpServer, {
      cors: {
        origin: "*", // ⚠️ à sécuriser selon ton frontend
        methods: ["GET", "POST"],
      },
    });

    // Écoute des connexions clients
    io.on("connection", (socket) => {
      strapi.log.info(`🔌 Nouveau client connecté : ${socket.id}`);

      socket.on("disconnect", () => {
        strapi.log.info(`❌ Client déconnecté : ${socket.id}`);
      });

      // exemple d'event message si besoin
      socket.on("message", (data) => {
        strapi.log.info(`📩 Message reçu : ${data}`);
        io.emit("message", data);
      });
    });

    // Ajouter io à Strapi pour l'utiliser dans le middleware
    (strapi as any).io = io;

    // Middleware DSM pour écouter les updates de commandes
    strapi.documents.use(async (context, next) => {
      const { uid, action } = context;

      // Exécuter l'opération et récupérer le résultat
      const result = await next();
      type CommandeResult = {
        id: number;
        statusCommande: string;
        [key: string]: any; // pour les autres champs si nécessaire
      };
      // Cibler uniquement les commandes lors d'un update
      if (uid === "api::commande.commande" && action === "update") {
        if ((strapi as any).io && result) {
          // Vérifier que result est bien un objet avec id et statusCommande
          const isCommande = (res: any): res is CommandeResult =>
            res &&
            typeof res === "object" &&
            "id" in res &&
            "statusCommande" in res;

          if (isCommande(result)) {
            (strapi as any).io.emit("commande-status-updated", {
              id: result.documentId,
              status: result.statusCommande,
            });
            strapi.log.info(`🔔 Commande #${result.id} mise à jour`);
          }
        }
      }

      return result;
    });
  },
};
