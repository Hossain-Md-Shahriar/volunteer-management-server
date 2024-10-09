const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  optionSuccessStatus: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.feddd13.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const allNeedVolunteer = client
      .db("volunteerDB")
      .collection("allNeedVolunteer");

    // get all need volunteer posts
    app.get("/all-need-volunteer", async (req, res) => {
      const result = await allNeedVolunteer.find().toArray();
      res.send(result);
    });

    // get a single post of need volunteer from db
    app.get("/all-need-volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const result = await allNeedVolunteer.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // insert a need volunteer post to the database
    app.post("/need-volunteer", async (req, res) => {
      const needVolunteer = req.body;
      const result = await allNeedVolunteer.insertOne(needVolunteer);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from volunteer management server...");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
