/*
 * remove.js
 * meant to delete documents from a list of document _id's
 * such as in: $ cat list_of_ids.txt | mongoexec <db.coll> ./remove
 */

module.exports = {
  exec: function (document, collection, callback) {
    // remove by document _id, check for error and response
    collection.deleteOne({ _id: document._id }, function(err, obj) {
      if (err)
        callback(err, null);
      else
        callback(null, { removed: { _id: document._id } });
    });
  }
};
