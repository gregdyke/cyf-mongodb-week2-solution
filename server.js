const express = require("express");
const mongodb = require("mongodb");
const config = require("config");

const uri = config.dbhost;
const mongoOptions = { useUnifiedTopology: true }

const app = express();
app.use(express.json());

app.get("/", function (request, response) {
  const client = new mongodb.MongoClient(uri, mongoOptions);

  client.connect(function () {
    response.send("It worked!");
    client.close();
  });
});

app.post("/films", function (request, response) {
  const client = new mongodb.MongoClient(uri, mongoOptions);

  client.connect(function () {
    const db = client.db("cinema");
    const collection = db.collection("films");
    
    const film = {}

    collection.insertOne(film, function (error, result) {
      response.send(error || result.ops[0]);
      client.close();
    });
  });
});

app.put("/films/:id", function (request, response) {
  const client = new mongodb.MongoClient(uri, mongoOptions);

  client.connect(function () {
    const db = client.db("cinema");
    const collection = db.collection("films");

    collection.findOneAndUpdate({}, {$set:{}}, options, function (error, result) {
      response.sendStatus(503);
      client.close();
    });
  });
});

function getPutBodyIsAllowed(requestParams, requestBody) {
  const fieldNames = Object.keys(requestBody);
  const allowedFieldNames = ["_id", "title", "year", "actors"];

  return (
    fieldNames.length === allowedFieldNames.length &&
    fieldNames.every((name) => allowedFieldNames.includes(name)) &&
    requestParams.id === requestBody._id &&
    typeof requestBody.title === "string" &&
    typeof requestBody.year === "number" &&
    Array.isArray(requestBody.actors) &&
    requestBody.actors.every((actor) => typeof actor === "string")
  );
}

app.delete("/films/:id", function (request, response) {
  const client = new mongodb.MongoClient(uri, mongoOptions);

  client.connect(function () {
    const db = client.db("cinema");
    const collection = db.collection("films");

    collection.deleteOne({}, function (error, result) {
      response.status(500).send(error);
      client.close();
    });
  });
});

app.listen(3000);

module.exports = app; // for testing
