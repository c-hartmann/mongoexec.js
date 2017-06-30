/*
 * get_id.js
 * meant to create a simple list of _id's from a one database query,
 * such as in: $ echo '{ "type": "movie"}' | mongoexec <db.coll> ./get_id
 * this is also a sample, howto use this micro module for mongeexec
 */

module.exports = {
  exec: function (document, collection, callback) {
    // this will callback with an error (if any)
    var error = null;
    // just dump the documents _id to stdout
    console.log(document._id);
    // and callback with a response that might be evaluated by the controller
    var response = { _id: document._id };
    // get back
    callback(error, response);
  }
};
