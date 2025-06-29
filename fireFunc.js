import { db, storage } from "../firebase/fireBase";
import { uploadBytesResumable, getDownloadURL } from "fireBase/storage";

const UploadMedia = async ({ files, setProgress, setFiles, setDone }) => {
  const uploadedFileUrls = [];
  for (const file of files) {
    const { uri } = file;
    const response = await fetch(uri);
    const blob = await response.blob();
    const uid = FunctionUid(); // use the AllInOne to get the FunctionUid snap code
    const storageRef = ref(storage, `story/uid`);
    const uploadTask = uploadBytesResumable(storageRef, blob);
    // listen for events
    await new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(progress.toFixed());
        },
        (error) => {
          // handle error
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("File available at", downloadURL);
            uploadedFileUrls.push(downloadURL);
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }
  return uploadedFileUrls;
};

module.exports = { UploadMedia };
