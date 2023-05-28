const express = require("express");
const http = require("http");
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const port = 3000;

const con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "API",
  multipleStatements: true,
});

function verifyToken(req, res) {
  const authHeader = req.headers["authorization"];
  if (authHeader === undefined) {
    res.sendStatus(400);
    return false;
  }
  const token = authHeader.slice(7);
  console.log(token);

  try {
    jwt.verify(token, "EnHemlighetSomIngenKanGissaXyz123%&/");
    return true;
  } catch (err) {
    console.log(err);
    res.status(401).send("Invalid auth token");
    return false;
  }
}

function hash(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}

function sendNotFound(res) {
  res.sendStatus(404);
}

app.use(express.json());

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/dokumentation.html");
});

app.get("/users/:id", function (req, res) {
  if (!verifyToken(req, res)) return;

  const sql = `SELECT * FROM users WHERE id=${req.params.id}`;
  console.log(sql);

  con.query(sql, function (err, result, fields) {
    if (result.length > 0) {
      res.send(result);
    } else {
      sendNotFound(res);
    }
  });
});

app.post("/users", function (req, res) {
  if (!verifyToken(req, res)) return;

  if (!req.body.userId) {
    res.status(400).send("userId required!");
    return;
  }

  const fields = ["firstname", "lastname", "userId", "passwd"];
  for (const key in req.body) {
    if (!fields.includes(key)) {
      res.status(400).send("Unknown field: " + key);
      return;
    }
  }

  const hashedPasswd = hash(req.body.passwd);
  const sql = `INSERT INTO users (firstname, lastname, userId, passwd)
    VALUES ('${req.body.firstname}', 
    '${req.body.lastname}',
    '${req.body.userId}',
    '${hashedPasswd}');
    SELECT LAST_INSERT_ID();`;
  console.log(sql);

  con.query(sql, function (err, result, fields) {
    if (err) throw err;

    console.log(result);
    const output = {
      id: result[0].insertId,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      userId: req.body.userId,
      passwd: req.body.passwd,
    };
    res.send(output);
  });
});

app.get("/me", function (req, res) {
    if (!verifyToken(req, res)) return;
    let token = req.headers["authorization"].slice(7);
    let decoded = jwt.verify(token, "EnHemlighetSomIngenKanGissaXyz123%&/");
    let sql = `SELECT firstname, lastname, userId FROM users WHERE userId='${decoded.sub}'`;
    console.log(sql);
    con.query(sql, function (err, result, fields) {
      if (result.length > 0) {
        let me = result[0];
        res.send(me);
      } else {
        res.sendStatus(404);
      }
    });
  });

app.post("/login", function (req, res) {
  console.log(req.body);
  const sql = `SELECT * FROM users WHERE userId='${req.body.userId}'`;
  con.query(sql, function (err, result, fields) {
    if (err) throw err;
    const passwordHash = hash(req.body.passwd);
    if (result[0].passwd == passwordHash) {
      const payload = {
        sub: result[0].userId,
        name: result[0].firstname,
        lastname: result[0].lastname,
      };
      const token = jwt.sign(payload, "EnHemlighetSomIngenKanGissaXyz123%&/", {
        expiresIn: "2h",
      });
      res.json(token);
    } else {
      res.sendStatus(401);
    }
  });
});

app.get("/users", function (req, res) {
  if (!verifyToken(req, res)) return;

  const sql = "SELECT * FROM users";
  console.log(sql);

  con.query(sql, function (err, result, fields) {
    res.send(result);
  });
});

server.listen(port, function () {
  console.log("Server started. Listening on localhost:" + port);
});
