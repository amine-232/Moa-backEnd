const admin = require("firebase-admin");
const { getAuth } = require("firebase-admin/auth");
const { getApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./config/serviceAccountKey.json"); // Replace with your service account file
const { getStorage } = require("firebase-admin/storage");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://alpha-6868a-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "alpha-6868a.appspot.com",
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
