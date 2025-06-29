const { app, db, admin, storage } = require("../FirebaseScript");
const usersMap = new Map();
const PublicMap = new Map();

const CreateFunction = async ({ path, uid, data, res }) => {
  if (uid && data && path) {
    await db
      .collection(path.toString())
      .doc(uid.toString())
      .set(data)
      .then(() => {
        db.collection(path.toString())
          .doc(uid)
          .get()
          .then((doc) => {
            if (doc.exists()) {
              res.json({
                state: true,
                data: { ref: doc.ref, data: doc.data() },
              });
            }
          })
          .catch((e) => {
            console.log("error", e);
            res.json({ state: false });
          });
      })
      .catch((e) => {
        console.log("error", e);
        res.json({ state: false });
      });
  }
};

const DeleteFunction = async ({ path, uid }) => {
  await db
    .collection(path.toString())
    .doc(uid.toString())
    .delete()
    .catch((e) => {
      console.log("error", e);
    });
};

const getAllgetWorPlace = async ({ collectionRef, map }) => {
  try {
    const docsSnapshot = await collectionRef.get();

    for (const snapdoc of docsSnapshot.docs) {
      const docData = snapdoc.data();
      const docId = snapdoc.id;
      const docRef = collectionRef.doc(docId);
      const subCollections = await getSubCollections(docRef);

      map.set(docId, {
        ref: docRef,
        ...docData,
        ...subCollections,
      });
    }

    return map;
  } catch (e) {
    console.log("Error fetching policies:", e);
  }
};

const getSubCollections = async (docRef) => {
  try {
    const subCollectionsData = {};
    const subCollections = await docRef.listCollections();

    for (const subCollection of subCollections) {
      const subCollectionName = subCollection.id;
      const subCollectionDocs = await subCollection.get();
      const docsArray = [];

      for (const doc of subCollectionDocs.docs) {
        if (doc.exists) {
          const docData = doc.data();
          const docId = doc.id;

          // Recursively fetch nested subcollections
          await getSubCollections(doc.ref).then((nestedSubCollections) => {
            if (nestedSubCollections) {
              docsArray.push({
                id: docId,
                ref: doc.ref,
                ...docData,
                ...nestedSubCollections,
              });
            }
          });
        }
      }

      subCollectionsData[subCollectionName] = docsArray;
    }
    if (subCollectionsData) {
      return subCollectionsData;
    }
  } catch (e) {
    console.log(`Error fetching subcollections for`, e);
  }
};
const AddFunctions = async ({ path, data }) => {
  await db
    .collection(path.toString())
    .add(data)
    .catch((e) => {
      console.log("error", e);
    });
};

const UpdataCollection = async ({
  path,
  uid,
  subcollection,
  newDocId,
  data,
}) => {
  await db
    .collection(path)
    .doc(uid)
    .collection(subcollection)
    .doc(newDocId)
    .set(data)
    .then(() => {
      res.json({ state: true });
    })
    .catch((e) => {
      res.json({ state: false, errorMessage: e });
      console.log("error", e);
    });
};

const UpDateFile = async ({ path, value, keyValue, res }) => {
  await db
    .doc(path)
    .update({ [keyValue]: value })
    .then(() => {
      res.json({ state: true });
    })
    .catch((e) => {
      res.json({ state: false, msg: e });

      console.log("error", e);
    });
};

const TokenAccessGenrator = (userId, io, toSocketId) => {
  const additionalClaims = {
    premiumAccount: true,
  };
  admin
    .auth()
    .createCustomToken(userId, additionalClaims)
    .then((newtoken) => {
      if (newtoken) {
        console.log("newtoken", toSocketId, newtoken);
        io.to(toSocketId).emit("qr-login", { token: newtoken });
      }
    })
    .catch((e) => {
      console.log(" TokenAccessGenrator error", e);
    });
};

const getCollection = async () => {
  await db
    .collection("users")
    .get()
    .then((doc) => {
      if (!doc.empty) {
        if (doc.docs) {
          doc.docs.forEach((element) => {
            console.log("element", element.data());
            usersMap.set(element.data().id, { ...element.data() });
          });
        }
      }
    })
    .catch((e) => {
      console.log("error", e);
    });
};

const AppPostToPostMap = ({ data }) => {
  if (!PublicMap.has(data.id)) {
    PublicMap.set(data.id, { ...data });
  }
};

const UploadFile = async (localFilePath, destinationInStorage) => {
  try {
    await storage
      .bucket()
      .upload(localFilePath, {
        destination: `${destinationInStorage}`,
        metadata: {
          cacheControl: "public,max-age=31536000",
          contentType: "video/mp4",
        },
      })
      .then((file) => {
        if (file && file[0]) {
          file[0].makePublic();

          console.log(`✅ File cloudStorageURI to ${file[0].publicUrl()}`);
        }
      });

    console.log(`✅ File uploaded to ${destinationInStorage}`);
    return {
      success: true,
      message: `File uploaded to ${destinationInStorage}`,
    };
    s;
  } catch (error) {
    console.error("❌ Error uploading file:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};
module.exports = {
  PublicMap: PublicMap,
  usersMap: usersMap,
  CreateFunction,
  DeleteFunction,
  UploadFile,
  AddFunctions,
  UpdataCollection,
  getAllgetWorPlace,
  UpDateFile,
  TokenAccessGenrator,
};
