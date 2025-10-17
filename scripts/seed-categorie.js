"use strict";

const fs = require("fs-extra");
const path = require("path");
const mime = require("mime-types");
const {
  categories,
  produits,
  commandes,
} = require("../data/data-papeless.json");

async function seedMenuDigital() {
  const shouldImportSeedData = await isFirstRun();

  if (shouldImportSeedData) {
    try {
      console.log("Importation des données de seed...");
      await importSeedData();
      console.log("✅ Données importées avec succès");
    } catch (error) {
      console.error("❌ Erreur lors de l’importation des données");
      console.error(error);
    }
  } else {
    console.log(
      "⚠️ Les données ont déjà été importées. Vider la base pour recommencer."
    );
  }
}

async function isFirstRun() {
  const pluginStore = strapi.store({
    environment: strapi.config.environment,
    type: "type",
    name: "setup",
  });
  const initHasRun = await pluginStore.get({ key: "initHasRun" });
  await pluginStore.set({ key: "initHasRun", value: true });
  return !initHasRun;
}

async function setPublicPermissions(newPermissions) {
  const publicRole = await strapi
    .query("plugin::users-permissions.role")
    .findOne({
      where: { type: "public" },
    });

  const allPermissionsToCreate = [];
  Object.keys(newPermissions).map((controller) => {
    const actions = newPermissions[controller];
    const permissionsToCreate = actions.map((action) =>
      strapi.query("plugin::users-permissions.permission").create({
        data: {
          action: `api::${controller}.${controller}.${action}`,
          role: publicRole.id,
        },
      })
    );
    allPermissionsToCreate.push(...permissionsToCreate);
  });
  await Promise.all(allPermissionsToCreate);
}

function getFileSizeInBytes(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function getFileData(fileName) {
  const filePath = path.join("data", "uploads", fileName);
  const size = getFileSizeInBytes(filePath);
  const ext = fileName.split(".").pop();
  const mimeType = mime.lookup(ext || "") || "";

  return {
    filepath: filePath,
    originalFileName: fileName,
    size,
    mimetype: mimeType,
  };
}

async function uploadFile(file, name) {
  return strapi
    .plugin("upload")
    .service("upload")
    .upload({
      files: file,
      data: {
        fileInfo: {
          alternativeText: `Image ${name}`,
          caption: name,
          name,
        },
      },
    });
}

async function createEntry({ model, entry }) {
  try {
    await strapi.documents(`api::${model}.${model}`).create({
      data: entry,
    });
  } catch (error) {
    console.error(`❌ Erreur création entrée pour ${model}`, error);
  }
}

async function checkFileExistsBeforeUpload(files) {
  const existingFiles = [];
  const uploadedFiles = [];

  for (const fileName of files) {
    const fileWhereName = await strapi.query("plugin::upload.file").findOne({
      where: { name: fileName.replace(/\..*$/, "") },
    });

    if (fileWhereName) {
      existingFiles.push(fileWhereName);
    } else {
      const fileData = getFileData(fileName);
      const fileNameNoExt = fileName.split(".").shift();
      const [file] = await uploadFile(fileData, fileNameNoExt);
      uploadedFiles.push(file);
    }
  }
  const allFiles = [...existingFiles, ...uploadedFiles];
  return allFiles.length === 1 ? allFiles[0] : allFiles;
}

/* ===== Importations ===== */

async function importCategories() {
  for (const category of categories) {
    let image = null;
    if (category.image) {
      image = await checkFileExistsBeforeUpload([category.image]);
    }
    await createEntry({
      model: "category",
      entry: {
        ...category,
        image,
        publishedAt: new Date(),
      },
    });
  }
}

async function importSeedData() {
  await setPublicPermissions({
    category: ["find", "findOne"],
  });

  await importCategories();
}

/* ===== Point d'entrée ===== */
async function main() {
  const { createStrapi, compileStrapi } = require("@strapi/strapi");
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  app.log.level = "error";

  await seedMenuDigital();
  await app.destroy();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
