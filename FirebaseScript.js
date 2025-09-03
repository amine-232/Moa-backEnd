const admin = require("firebase-admin");
const serviceAccount = require("./config/serviceAccountKeyB.json"); // Replace with your service account file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASEURL,
  storageBucket: process.env.STORGEBUKET,
});

const app = admin.app();
const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();
module.exports = {
  app: app,
  db: db,
  auth: auth,
  admin: admin,
  storage: storage,
};
