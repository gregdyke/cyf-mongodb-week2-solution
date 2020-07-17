const mongodb = require("mongodb");

//Require the dev-dependencies
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const should = chai.should();
const expect = chai.expect;

process.env["NODE_CONFIG_DIR"] = __dirname + "../config/";
const config = require("config");

const uri = config.dbhost;

chai.use(chaiHttp);
//Our parent block

function dbConnectCollection(callback) {
  const client = new mongodb.MongoClient(uri, { useUnifiedTopology: true });
  client.connect(() => {
    callback(client.db("cinema").collection("films"), client);
  });
}

function getFilmById(id, callback) {
  dbConnectCollection((films, client) => {
    films.findOne({_id:mongodb.ObjectId(id)}, (err, res) => {
      client.close()
      callback(err, res)
    })
  })
}

function insertFilm(film, callback) {
  dbConnectCollection((films, client) => {
    films.insertOne(film, (err, res) => {
      client.close()
      callback(err, res.ops[0])
    })
  })
}

function deleteFilmById(id, callback) {
  dbConnectCollection((films, client) => {
   films.deleteOne({_id:mongodb.ObjectId(id)}, (err) => {
      client.close()
      callback(err)
    })
  })
}

function verifyFilm(expected, actual) {
  actual.title.should.equal(expected.title)
  actual.year.should.equal(actual.year)
  actual.actors.should.have.members(expected.actors)
  Object.keys(actual).should.have.members(Object.keys(expected))
  Object.keys(expected).should.have.members(Object.keys(actual))
}

describe('Films', () => {
  beforeEach((done) => { //Before each test we empty the database
    dbConnectCollection((films, client) => {
      films.deleteMany({title: /^TEST/}, () => {
	client.close()
	done()
      })
    });             
  });

  describe('POST /films', () => {
    it('POST should return a document that is persisted to mongodb', (done) => {
      chai.request(server)
        .post('/films?title=TEST Ex Machina&year=2014&actors=Domhnall Gleeson,Oscar Isaac,Alicia Vikander')
        .end((err, res) => {
	  try {
            res.should.have.status(200)
            res.body.should.be.a('object')
            verifyFilm({
	      _id : "some id",
	      title: "TEST Ex Machina",
	      year: 2014,
	      actors : ["Domhnall Gleeson", "Oscar Isaac", "Alicia Vikander"]
	    }, res.body)
	    getFilmById(res.body._id, (err, film) => {
	      try {
		expect(film, "film should be found on db with id:" + res.body._id).to.exist
		done()
	      } catch (e) {
		done(e)
	      }
	    })
	  } catch (e) {
	    done(e)
	  }
        });
    });

    it('POST should not use additional uri parameters', (done) => {
      chai.request(server)
        .post('/films?title=TEST Ex Machina&year=2014&actors=Domhnall Gleeson,Oscar Isaac,Alicia Vikander&extra=foo')
        .end((err, res) => {
	  try {
            res.should.have.status(200)
            res.body.should.be.a('object')
            res.body.should.not.have.property("extra")
            done();
	  } catch (e) {
	    done(e)
	  }
        });
    });

    it('POST should return status 400 with missing parameters', (done) => {
      chai.request(server)
        .post('/films?title=TEST Ex Machina&year=2014')
        .end((err, res) => {
	  try {
            res.should.have.status(400)
            done();
	  } catch (e) {
	    done(e)
	  }
        });
    });

    it('POST should accept empty actor list', (done) => {
      chai.request(server)
        .post('/films?title=TEST Ex Machina&year=2014&actors=%02%03')
        .end((err, res) => {
	  try {
            res.should.have.status(200)
            done();
	  } catch (e) {
	    done(e)
	  }
        });
    });

    it('POST should not accept non numeric year', (done) => {
      chai.request(server)
        .post('/films?title=TEST Ex Machina&year=twothousand&actors=Domhnall Gleeson,Oscar Isaac,Alicia Vikander')
        .end((err, res) => {
	  try {
            res.should.have.status(400)
            done();
	  } catch (e) {
	    done(e)
	  }
        });
    });
  });

  describe('PUT /films', () => {
    it('PUT should return an updated document that is persisted to mongodb', (done) => {
      insertFilm({
	title: "TEST before update Ex Machina",
	year: 2014,
	actors : ["Domhnall Gleeson", "Oscar Isaac", "Alicia Vikander"]
      }, (err, film) => {
	film.title = "TEST after update Ex Machina"
	film.year = 2015
	film.actors = ["Domhnall Gleeson", "Oscar Isaac"]
	chai.request(server)
          .put('/films/'+ film._id)
	  .send(film)
          .end((err, res) => {
	    try {
              res.should.have.status(200)
              res.body.should.be.a('object')
              verifyFilm(film, res.body)
	      getFilmById(res.body._id, (err, film) => {
		try {
		  expect(film, "film should be found on db with id:" + res.body._id).to.exist
		  done()
		} catch (e) {
		done(e)
		}
	      })
	    } catch (e) {
	      done(e)
	    }
          });
      })
    });

    it('PUT should return 404 on a non existent document id', (done) => {
      insertFilm({
	title: "TEST before update Ex Machina",
	year: 2014,
	actors : ["Domhnall Gleeson", "Oscar Isaac", "Alicia Vikander"]
      }, (err, film) => {
	deleteFilmById(film._id, () => {
	  chai.request(server)
            .put('/films/'+ film._id)
	    .send(film)
            .end((err, res) => {
	      try {
		res.should.have.status(404)
		done()
	      } catch (e) {
		done(e)
	      }
            });
	})
      })
    });

    it('PUT should return status 400 if the root param is not a valid object id', (done) => {
      insertFilm({
	title: "TEST before update Ex Machina",
	year: 2014,
	actors : ["Domhnall Gleeson", "Oscar Isaac", "Alicia Vikander"]
      }, (err, film) => {
	film._id = "foo"
	chai.request(server)
          .put('/films/foo')
	  .send(film)
          .end((err, res) => {
	    try {
              res.should.have.status(400)
              done()
	    } catch (e) {
	      done(e)
	    }
          });
      })
    });

    it('PUT should return status 422 if the id in the body does not match the root param', (done) => {
      insertFilm({
	title: "TEST before update Ex Machina",
	year: 2014,
	actors : ["Domhnall Gleeson", "Oscar Isaac", "Alicia Vikander"]
      }, (err, film) => {
	const id = film._id
	film._id = "foo"
	chai.request(server)
          .put('/films/' + id)
	  .send(film)
          .end((err, res) => {
	    try {
              res.should.have.status(422)
              done()
	    } catch (e) {
	      done(e)
	    }
          });
      })
    });

    it('PUT should return status 422 if the year in the body is not a number', (done) => {
      testFilmBodyVariant((film) => {
	film.year = "2000"
      }, done)
    });

    it('PUT should return status 422 if there are missing properties in the body', (done) => {
      testFilmBodyVariant((film) => {
	delete film.year
      }, done)
    });

    it('PUT should return status 422 if there are extra properties in the body', (done) => {
      testFilmBodyVariant((film) => {
	film.extra = "foo"
      }, done)
    });

    it('PUT should return status 422 if the actors property is not an array', (done) => {
      testFilmBodyVariant((film) => {
	film.actors = "foo"
      }, done)
    });

    it('PUT should return status 422 if the actors are not all strings', (done) => {
      testFilmBodyVariant((film) => {
	film.actors = ["foo",1]
      }, done)
    });

    function testFilmBodyVariant(modify, done) {
      insertFilm({
	title: "TEST before update Ex Machina",
	year: 2014,
	actors : ["Domhnall Gleeson", "Oscar Isaac", "Alicia Vikander"]
      }, (err, film) => {
	modify(film)
	chai.request(server)
	  .put('/films/' + film._id)
	  .send(film)
	  .end((err, res) => {
	    try {
              res.should.have.status(422)
              done()
	    } catch (e) {
	      done(e)
	    }
	  });
      })
    }

  });

 describe('DELETE /films', () => {
    it('DELETE should return 204 on a successful delete', (done) => {
      insertFilm({
	title: "TEST before update Ex Machina",
	year: 2014,
	actors : ["Domhnall Gleeson", "Oscar Isaac", "Alicia Vikander"]
      }, (err, film) => {
	chai.request(server)
          .delete('/films/'+ film._id)
          .end((err, res) => {
	    try {
              res.should.have.status(204)
	      done()
	    } catch (e) {
	      done(e)
	    }
          });
      })
    });

    it('DELETE should return 404 when trying to delete a non existent document', (done) => {
      insertFilm({
	title: "TEST before update Ex Machina",
	year: 2014,
	actors : ["Domhnall Gleeson", "Oscar Isaac", "Alicia Vikander"]
      }, (err, film) => {
	deleteFilmById(film._id, () => {
	  chai.request(server)
            .delete('/films/'+ film._id)
            .end((err, res) => {
	      try {
		res.should.have.status(404)
		done()
	      } catch (e) {
		done(e)
	      }
            });
	})
      })
    });

 })

});



