#!/usr/bin/env node

/*
 * mongoexec.js (mongodb command line interface tool)
 *
 * v: 0.1.0 (handling stdin first time)
 *
 * one small tool to execute arbitrary commands on selectable documents
 * in a mongodb database collection
 *
 * usage:
 * mongoexec <namespace> <execution> [ <selector> ... ]
 *
 * command line args:
 *
 * <namespace>
 * this is basicly a database nane, a dot and a collection name
 *
 * <command>
 * is basicly a function that will be "required". might be a local file
 * exporting a function command(document, array, index, callback?) {...}
 *
 * <selection> (optional)
 * either a query expression or a list of document _id's (read from file, if
 * argument starts with a "@" (as curl(1) does it)
 *
 * TODO:
 * - rename to mongoexec? DONE
 * - operation instead of command? or execution? DONE (in usage, not internaly)
 * - read executions (and? selectors) from file
 * - swap order of command line arguments? (to: <selector> <execution>)
 * - take decision on final stdin handling (see the three optiopns below)
 * - pass db instead or additionaly to collection into the execution?
 * - pass document as an object with self-saving, updating etc. methods?
 * - debug command line option
 * - dryrun command line ioption (how can this be achieved?)
 */

// builtins
const fs       =    require('fs');
const path     =    require('path');
const readline =    require('readline');

// via npm install
const async  =      require('async');

// mongo native driver (also via npm install)
const mongodb  =    require('mongodb');
const MongoClient = mongodb.MongoClient;
const ObjectID =    mongodb.ObjectID;

// my global node_modules directory is (experimental) (might also be ./mongoexec directory)
var extensionRegExp = new RegExp('.'+path.extname(process.argv[1])+'$'); // matches e.g. '.js' at the end of me
const my_node_modules_path = '/usr/local/lib/'+path.basename(process.argv[1]).replace(/\.js$/,'')+'/node_modules';
// console.error('my_node_modules_path:', my_node_modules_path);

// note that first and second command line args are 'node' and the name of this file,
// so we start parsing at the third arg
var args = process.argv.slice(2);

// minimum requirement on command line is an execution and a selector or _id
if (args.length < 2) {
  console.error('usage:  mongoexec <namespace> <execution> [ <selector> ... ]');
  process.exit(1);
}

// NOTE:
// using "minimist" or similar is an option here to parse arguments, but this
// tries to stay without any dependencies with the exception of mongo. ummm,
// lost already as we rely on async now

// database url shall be the first argument after node and the mongoexec.js script
const databaseArgs = args[0].split('.'); // WARNING: DOES *NOT* WORK IF DATABASE NAMES ARE ALLOWEWD TO HAVE '.' IN IT
var databaseName = databaseArgs[0];
const collectionName = databaseArgs[1];
if (!databaseName) {
  console.error('could not get database name from:', args[0]);
  process.exit(1);
}
if (!collectionName) {
  console.error('could not get collection name from:', args[0]);
  process.exit(2);
}
if (databaseName.match(/^mongodb:/)) // a full mongodb url
  var databaseUrl = databaseName;
else if (databaseName.match(/.+:\d+\/.+/)) // just the host, port part and name part
  var databaseUrl = 'mongodb://'+databaseName;
else // assuming just the name part
  var databaseUrl = 'mongodb://localhost:27017/'+databaseName;
console.error('database url:', databaseUrl);
console.error('collection name:', collectionName);
args.shift();

// execution shall be the second argument after node and the mongoexec.js script
const executionName = args[0];
args.shift();

var execution;

// search on my private node modules directory first
try {
  execution = require(my_node_modules_path+path.sep+executionName);
} catch(err) {
//   console.error('not a global execution:', executionName);
}

try {
//   console.error('search here for:', executionName);
  execution = require(executionName);
} catch(err) {
  console.error('no such execution:', executionName);
  console.error(err);
//   console.error('node path:', process.env.NODE_PATH);
  process.exit(9);
}

// check for the right type of the required execution
if (typeof execution.exec != 'function') {
  console.error('execution.exec is not a function:', executionName);
  console.error(typeof execution.exec);
  process.exit(8);
}

// operate on successfull databse connection
MongoClient.connect(databaseUrl, function(err, db) {


    function handleSelectors(selectors)  {
      //
      // start looping the selectors
      // TODO: use async with final function (to close db and exit)
//       var count = 0;
//       selectors.every(function(sel, arr, idx) {
      async.forEach(selectors, function(sel, callback) {
          if (sel) {
            if (sel.match(/^[\d\D]{24}$/)) { // matches the pattern of a 12 byte ObjectId
    //           console.error('is object id:', sel);
              // there can be only one
              var query;
              // query = { _id: sel }; // should work according to mongob docs, but does not
              // from other docs: https://stackoverflow.com/questions/10929443/nodejs-mongodb-getting-data-from-collection-with-findone
              query = { _id: ObjectID.createFromHexString(sel) };
              collection.findOne(query, function(err, doc) {
                if (err) {
                  console.error('query error:', err);
                  callback();
                }
                if (doc) {
                  execution.exec(doc, 0, null, collection, function(error, response) {
                    callback();
                  });
                }
              });
            } else if (sel.match(/^\{.*\}$/)) {
    //           console.error('is find expression object:', sel);
              try {
                var query = JSON.parse(sel);
              } catch(err) {
                console.error('can not parse:', sel);
                callback();
              }
              console.error('query:', query);
              collection.find(query).toArray(function(err, docs) {
                if (err)
                  console.error('query error:', err);
                // excute operation an any of result arrays elements
                if (docs)
//                   docs.every(function(doc, idx, arr) {
                  async.forEach(docs, function(doc, cb) {
                      execution.exec(doc, collection, function(error, response) {
      //                   console.log('found by:', query, 'response:', response);
//                         console.error('found by:', query, 'response:', response);
                      });
                      cb();
                    },
                    function (err) {
//                      console.error('done with docs');
                     callback();
                    }
                  );
              });
            } else {
              console.error('expr not understood:', sel);
              callback();
            }
          } else {
            callback();
          }
        },
        // final function
        function (err) {
          console.error('closing database connection');
          db.close();
          process.exit(0);
        }
      );
    }


    console.error('connected to:', db.databaseName);

    // see: https://stackoverflow.com/questions/21023982/how-to-check-if-a-collection-exists-in-mongodb-native-nodejs-driver
//     console.log(db.system.namespaces.find( { name: 'nemo-avail-manager-0.avails' } ));
//     console.log(db.collectionNames());
//     console.log(db.getCollectionNames());
//     console.log(db.collections());
    db.listCollections({ name: collectionName }).next(function(err, collinfo) {
      if (err) {
          // The collection does not exist
          console.error('no such collection:', collectionName);
          db.close();
          process.exit(5);
      }
      if (!collinfo) {
          // The collection does not exist
          console.error('no such collection:', collectionName);
          db.close();
          process.exit(5);
      }
    });

    var collection = db.collection(collectionName); // no error if collection does not exist! TODO: special command to check existence?
    if (collection) {
      console.error('namespace is:', collection.namespace);
//     } else {
//       console.error('no such collection:', collectionName);
//       db.close();
//       process.exit(5);
    }

    // the rest is a list of selector, that are either list of find expression(s)
    // or a list of mongodb _id's. both might be stored in a file, line by line.
    // the command function is applied to all elements (from command line, file
    // (just ne allowed) or stdin)
    var selectors = [];
    if (args.length > 0) {
      // check for special char first
      if (args[0].charAt(0) === '@') {
        var selectorsFile = args[1].substring(1);
        // TODO: READ FROM FILE
        console.error('reading from file not implemented yet');
//         console.error('from file:', selectors);
      } else {
        selectors = args; // from remaining arguments
//         console.error('from command line:', selectors);
      }
      handleSelectors(selectors);
    } else {
//       console.error('reading from stdin...');
      // read from stdin (see: https://nodejs.org/api/readline.html)
//       const rl = readline.createInterface({
//         input:    process.stdin,
//         output:   process.stdout,
//         terminal: false
//       });
//       rl.on('line', function(line) {
//         console.error('reading line:', line);
//         selectors.push(line);
//         // we might evaluate input line immediatly (no!)
//       });
//       rl.on('close', function() {
//         console.error('stdin closed');
// //         console.error('closing database connection');
//         // we are too early with that cleanups
// //         db.close();
// //         process.exit(0);
//         console.error('from stdin:', selectors);
//       });

      var buffer = '';
      const stdin = process.stdin;
      stdin.setEncoding('utf8');
      stdin.on('readable', () => {
        var chunk;
        while ((chunk = stdin.read())) {
          buffer += chunk;
        }
      });
      stdin.on('end', () => {
//         console.error('stdin closed');
        selectors = buffer.trim().split('\n');
        console.error('selectors read:', selectors.length);
        handleSelectors(selectors);
      });

    }




    //   // see: https://nodejs.org/api/process.html#process_process_stdin
    //   var input;
    //   process.stdin.setEncoding('utf8');
    //   process.stdin.on('error', function(err) {
    //     if (err.code === 'EPIPE')
    //       return process.exit();
    //     process.emit('error', err);
    //   });
    //   process.stdin.on('readable', function () { // since node 0.10?
    //     const chunk = process.stdin.read(); // with readable event
    //     console.error(chunk);
    //     if (chunk !== null) {
    //       input += chunk;
    //     }
    //   });
    //   process.stdin.on('data', function (chunk) {
    //     console.log(chunk);
    //     if (chunk !== null) {
    //       input += chunk;
    //     }
    //   });
    //   process.stdin.on('end', function() {
    //     // nothing todo here?
    //     if (input)
    //       selectors = input.split("\n");
    //     // see what we have so far
    //     console.error(selectors);
    //   });

    // process.exit(0);
});

