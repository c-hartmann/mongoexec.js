# mongoexec.js

a small command line tool to execute arbitrary commands on selected documents in one mongodb database collection

version: 0.1.0

## usage

```
$ mongoexec <namespace> <execution> [ <selector> ... ]
```

whereas:

* namespace is `<database>.<collection>`
* execution is the name of an "execution" script (see below for more)
* selector is a db.collection.find() expression or the string represantation of a documents _id

if no selector is given on command line, read these from stdin. in fact that gives the ability to combine mongoexecs as in:

```
$ mongoexec products.answers ./get_id.js '{"price":{"$gt":42}}' | mongoexec products.answers ./reduce_price_by_ten_percent.js
```

obviously this serves as an example only, as it can be achieved shorter as:

```
$ mongoexec products.answers ./reduce_price_by_ten_percent '{"price":{"$gt":42}}'
```

## selectors

selectors are db.collection.find() compatible expressions (encoded as JSON) or the hexadecimal string representation of a documents _id

### sample selectors

select "active" documents:
```javascript
{ "status" : "active" }
```

select documents named "foo*"
```javascript
{ "name" : { "$regex" : "^foo" } }
```

select this specific document by it's _id (string)
```javascript
5890935df162533fea1b49ee
```

## execution scripts

execution script are node.js modules following this basic pattern:

```javascript
module.exports = {
  exec: function (document, collection, callback) {
    var error = null;
    var response = null;
    // do something here with the document
    // use collection to execute commands
    callback(error, response);
  }
}
```

execution scripts are "required" and therefore command line syntax follows the require() syntax, as in:

```
$ mongoexec inventory.cars ./get_license_plate.js '{ "firstLicenseYear" : { "$lt" : "2016" }'
```

### sample execution scripts

sample: printing the documents _id property:

```javascript
module.exports = {
  exec: function (document, collection, callback) {
    console.log(document._id);
    var error = null;
    var response = document._id;
    callback(error, response);
  }
}
```

sample: delete a document

```javascript
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
```

sample: update a (status) property

```javascript
module.exports = {
  exec: function (document, collection, callback) {
    // update by document _id and response
    collection.updateOne(
        {'_id': document._id},
        { $set: { status: 'archived' } }
    );
    callback(null, { archived: document._id });
  }
};
```

## TODO

- read executions (and? selectors) from file
- swap order of command line arguments? (to: selector execution)
- take decision on final stdin handling (see the options in the code)
- pass db instead or additionaly to collection into the execution?
- pass document as an object with self-saving, updating etc. methods?
- debug command line option
- dryrun command line ioption (how can this be achieved?)
- transport arguments to execution scripts?
- more modes than exec? (e.g. create)

