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
    const allVolunteerRequest = client
      .db("volunteerDB")
      .collection("allVolunteerRequest");

    // get all need volunteer posts
    app.get("/all-need-volunteer", async (req, res) => {
      const search = req.query.search;
      let query = {};
      if (search) {
        query = {
          postTitle: { $regex: search, $options: "i" },
        };
      }
      const result = await allNeedVolunteer.find(query).toArray();
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

    // insert a new request to be a volunteer data to db & decrement no. of needed volunteer
    app.post("/volunteer-request", async (req, res) => {
      const volunteerRequest = req.body;

      // check if it is a duplicate request
      const query = {
        "volunteer.email": volunteerRequest.volunteer.email,
        postId: volunteerRequest.postId,
      };

      const alreadyApplied = await allVolunteerRequest.findOne(query);
      if (alreadyApplied) {
        return res.status(400).send("You have already requested on this post.");
      }

      const result = await allVolunteerRequest.insertOne(volunteerRequest);

      // decrement no. of needed volunteer by 1 in allNeedVolunteer
      const updateDoc = {
        $inc: { volunteersNeeded: -1 },
      };

      const needVolunteerQuery = { _id: new ObjectId(volunteerRequest.postId) };
      const updateVolunteersNeeded = await allNeedVolunteer.updateOne(
        needVolunteerQuery,
        updateDoc
      );
      console.log(updateVolunteersNeeded);

      res.send(result);
    });

    // get all need volunteer posts posted by a specific user
    app.get("/all-need-volunteers/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "organizer.email": email };
      const result = await allNeedVolunteer.find(query).toArray();
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
