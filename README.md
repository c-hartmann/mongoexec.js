# mongoexec

one small command line tool to execute arbitrary commands on selectable documents in a mongodb database collection

## usage

```
$ mongoexec <namespace> <execution> [ <selector> ... ]
```

whereas:

* namespace is <database>.<collection>
* execution is the name of an "execution" script (see below for more)
* selector is a db.collection.find() expression or the string represantation of a documents _id

## selectors

selectors are db.collection.find() compatible expressions (encoded as JSON) or the hexadecimal string representation of a documents _id

### samples:

``` js
{ "status" : "active" }
``` js

``` js
{ "name" : { "$regex" : "^foo" } }
``` js

``` js
5890935df162533fea1b49ee
``` js

## execution scripts

execution script are node.js modules following this basic pattern:

``` js
module.exports = {
  exec: function (document, collection, callback) {
    var error = null;
    var response = null;
    callback(error, response);
  }
}
``` js

execution scripts are "required" and therefore command line syntax follows the require() syntax, as in:

```
$ mongoexec inventory.cars ./get_license_plate.js '{ "firstLicenseYear" : { "$lt" : "2016" }'
```

### samples

sample: printing the documents _id property:

``` js
module.exports = {
  exec: function (document, collection, callback) {
    console.log(document._id);
    var error = null;
    var response = document._id;
    callback(error, response);
  }
}
``` js

sample: delete a document

``` js
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
``` js

sample: update a (status) property

``` js
module.exports = {
  exec: function (document, collection, callback) {
    // update by document _id and response
    collection.updateOne(
        {'_id': document._id},
        { $set: { status: 'archived' } }
    );
    callback(null, { archived: { _id: document._id } });
  }
};
``` js
