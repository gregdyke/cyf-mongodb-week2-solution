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
  
  const missingParams = ["title", "year", "actors"].filter(key => !(key in request.query));
  if (missingParams.length>0) {
    response.status(400).send("Uri params missing:" + missingParams.join(", "));
    return;
  }

  if (isNaN(request.query.year)) {
    response.status(400).send("Year must be a number");
    return;
  }
				    
  const film = {
    title: request.query.title,
    year: Number(request.query.year),
    actors: request.query.actors.split(",")
  };

  client.connect(function () {
    const db = client.db("cinema");
    const collection = db.collection("films");

    collection.insertOne(film, function (error, result) {
      response.send(error || result.ops[0]);
      client.close();
    });
  });
});

app.put("/films/:id", function (request, response) {
  const client = new mongodb.MongoClient(uri, mongoOptions);

  if (!mongodb.ObjectId.isValid(request.params.id)) {
    response.sendStatus(400);
    return
  }

  if (!getPutBodyIsAllowed(request.params, request.body)) {
    response.sendStatus(422);
    return
  }

  client.connect(function () {
    const db = client.db("cinema");
    const collection = db.collection("films");

    const searchObject = { _id: mongodb.ObjectId(request.params.id) };

    const updateObject = {
      $set: { // or we should convert the _id in request.body to ObjectId, but trying to change it would be an error anyway
	title: request.body.title,
	year: request.body.year,
	actors: request.body.actors
      }
    };

    const options = { returnOriginal: false };

    collection.findOneAndUpdate(searchObject, updateObject, options, function (error, result) {
      if (result.value) {
	response.send(result.value)
      } else if (error) {
	response.status(503).send(error);
      } else {
	response.sendStatus(404);
      } 
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

  if (!mongodb.ObjectId.isValid(request.params.id)) {
    response.sendStatus(400);
    return
  }

  client.connect(function () {
    const db = client.db("cinema");
    const collection = db.collection("films");

    const searchObject = { _id: mongodb.ObjectId(request.params.id) };

    collection.deleteOne(searchObject, function (error, result) {
      if (error) {
        response.status(500).send(error);
      } else if (result.deletedCount) {
        response.sendStatus(204);
      } else {
        response.sendStatus(404);
      }

      client.close();
    });
  });
});

app.listen(3000);

module.exports = app; // for testing
