const AllListMap = new Map();
const { db } = require("../FirebaseScript");
const keyWorList = new Map();

const publicVideoMap = new Map();

const publicVideoCollection = db.collection("publicVideo");

const fetchAndCacheVideos = async ({ Tage }) => {
  const videoQuery =
    Tage === "All"
      ? db.collection("publicVideo")
      : db.collection("publicVideo").where("tags", "==", Tage);

  const querySnapshot = await videoQuery.get();

  if (!querySnapshot.empty) {
    querySnapshot.docs.map((doc) => {
      if (!AllListMap.has(doc.id)) {
        AllListMap.set(doc.id, { ...doc.data(), id: doc.id });
      }
    });
    if (__DEV__) console.log("Fetched from Firestore:", AllListMap);
  } else {
    if (__DEV__) console.log("No existing data found. Fetching from API...");

    try {
      const data = await getSearchVideos({
        query: selectedCategory !== "All" ? selectedCategory : "funny videos",
      });

      await saveDataToFirestore(data, Tage);
    } catch (e) {
      console.error("API fetch error:", e);
    }
  }
};

const saveDataToFirestore = async (dataApi, Tage) => {
  if (!dataApi || dataApi.length === 0) return;

  const tagRef = db.doc("videoTags", Tage);
  const getTagRef = await tagRef.get();
  if (!getTagRef.exists()) {
    for (const item of dataApi) {
      if (!item.id) continue;
      const videoRef = db.doc("publicVideo", item.id);
      const docSnap = await videoRef.get();
      if (!docSnap.exists()) {
        videoRef.set(item);
      }
    }

    await tagRef.set({
      uploadedAt: new Date(),
      count: dataApi.length,
    });
  }
};

const GetVideos = async () => {
  await publicVideoCollection
    .get()
    .then((col) => {
      if (!col.empty) {
        col.docs.map((doc) => {
          if (!publicVideoMap.has(doc.id)) {
            publicVideoMap.set(doc.id, { ...doc.data(), id: doc.id });
            keyWorList.set(String(doc.data().title).slice(0, 7), {
              keyWord: doc.data().title,
              count: 0,
              uploadedAt: new Date(),
            });
          }
        });
      }
      GetKeyWord();
    })
    .catch((e) => console.log("error", e));
};

const GetKeyWord = async () => {
  const videoTagsCoolection = db.collection("videoTags");
  await videoTagsCoolection
    .get()
    .then((documents) => {
      if (!documents.empty) {
        documents.docs.map((doc) => {
          if (!keyWorList.has(doc.id)) {
            keyWorList.set(doc.id, { ...doc.data(), keyWord: doc.id });
          }
        });
      }
    })
    .catch((e) => {
      console.log("eroor", e);
    });
};
module.exports = {
  AllListMap: AllListMap,
  fetchAndCacheVideos: fetchAndCacheVideos,
  GetVideos: GetVideos,
  publicVideoMap: publicVideoMap,
  keyWorList: keyWorList,
};
