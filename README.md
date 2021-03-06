# mongoexec.js

a small command line tool to execute arbitrary commands on selected documents in one mongodb database collection

version: 0.1.10

## usage

```
$ mongoexec <namespace> <execution> [ <selector> ... ]
```

whereas:

* \<namespace\> is `<database>.<collection>`
* \<execution\> is the name of an "execution" script (see below for more)
* \<selector\> is a db.collection.find() expression or the string representation of a documents _id

if no selector is given on command line, read these from stdin. in fact that gives the ability to combine mongoexecs (even on discrete databases) as in:

```
$ mongoexec products.answers ./get_id.js '{"price":{"$gt":42}}' | mongoexec products.answers ./reduce_price_by_ten_percent.js
```

obviously this serves as an example only, as it can be achieved shorter (on the same database) as:

```
$ mongoexec products.answers ./reduce_price_by_ten_percent.js '{"price":{"$gt":42}}'
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

execution scripts are loaded with absolute path or relative to current working directory and .js file extension is required

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
    var response = { _id: document._id };
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
        { $set: { 'status': 'archived' } },
        { upsert: false },
        function (err, r) {
            if (err) {
                console.error(document._id, err);
                callback(err, null);
            } else {
                console.info(document._id, 'archived');
                callback(null, { updated: document._id, to: 'archived' });
            }

        }
    );
  }
};
```

## install

```
$ npm install --global mongoexec.js
$ mongoexec
```

## TODO (required fixes)

- none

## TODO (functionals)

- eventualy this should also be a npm module package (main: ./lib/...)
- read executions (and? selectors) from file
- swap order of command line arguments? (to: selector execution)
- take decision on final stdin handling (see the options in the code)
- pass db instead or additionaly to collection into the execution?
- pass document as an object with self-saving, updating etc. methods?
- command line options: --verbose, --help, --version
- command line option: --dryrun (how can this be achieved? any handy driver option?)
- transport arguments to execution scripts?
- more modes than exec? (e.g. create)
