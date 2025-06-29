const MapToArray = (map) => {
  if (!(map instanceof Map)) return map;

  const obj = [];
  for (const [key, value] of map) {
    obj.push({ key: key, ...MapToArray(value) });
  }
  if (obj.length > 0) {
    return obj;
  }
};

const convertMapToObject = (map) => {
  if (!(map instanceof Map)) return map;
  const obj = [];
  for (const [key, value] of map) {
    obj.push({ key: key, ...convertMapToObject(value) });
  }
  if (obj.length > 0) {
    return obj;
  }
};

module.exports = {
  MapToArray,
  convertMapToObject,
};
