const { MapToArray } = require("./ConverToMap");
const { db } = require("./FirebaseScript");

const UserCollection = db.collection("users");

const Users = new Map();

const GetUsers = ({ res }) => {
  UserCollection.get()
    .then((docs) => {
      if (docs.docs) {
        docs.docs.forEach((doc) => {
          Users.set(doc.id, { ...doc.data(), ref: doc.ref });
        });
      }
    })
    .then(() => {
      res.json({
        state: true,
        data: MapToArray(Users),
      });
    });
};

module.exports = {
  Users: Users,
  GetUsers: GetUsers,
};
