const Datastore = require('nedb');
const db = new Datastore({ filename: './vault.db', autoload: true });

module.exports = {
  save: (data, callback) => db.insert(data, callback),
  find: (query, callback) => db.find(query, callback),
  remove: (query, callback) => db.remove(query, callback)
};
