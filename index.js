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

// verify jwt middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ message: "unauthorized access" });
      }
      console.log(decoded);

      req.user = decoded;
      next();
    });
  }
};

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

    // jwt generate
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // clear token on logout
    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

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
    app.get("/all-need-volunteer/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const result = await allNeedVolunteer.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // insert a need volunteer post to the database
    app.post("/need-volunteer", verifyToken, async (req, res) => {
      const needVolunteer = req.body;
      const result = await allNeedVolunteer.insertOne(needVolunteer);
      res.send(result);
    });

    // update a need volunteer post
    app.put("/all-need-volunteer/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const NeedVolunteerData = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...NeedVolunteerData,
        },
      };
      const result = await allNeedVolunteer.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // delete a need volunteer post
    app.delete("/need-volunteer/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allNeedVolunteer.deleteOne(query);
      res.send(result);
    });

    // cancel a volunteer request & increment no. of needed volunteer
    app.delete("/volunteer-request", async (req, res) => {
      const id = req.query.id;
      const postId = req.query.postId;
      const query = { _id: new ObjectId(id) };
      const result = await allVolunteerRequest.deleteOne(query);

      // increment no. of needed volunteer by 1 in a document of allNeedVolunteer
      const updateDoc = {
        $inc: { volunteersNeeded: 1 },
      };

      const needVolunteerQuery = { _id: new ObjectId(postId) };
      const updateVolunteersNeeded = await allNeedVolunteer.updateOne(
        needVolunteerQuery,
        updateDoc
      );
      console.log(updateVolunteersNeeded);

      res.send(result);
    });

    // insert a new request to be a volunteer data to db & decrement no. of needed volunteer
    app.post("/volunteer-request", verifyToken, async (req, res) => {
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

      // decrement no. of needed volunteer by 1 in a document of allNeedVolunteer
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
    app.get("/all-need-volunteers/:email", verifyToken, async (req, res) => {
      const tokenEmail = req?.user?.email;
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { "organizer.email": email };
      const result = await allNeedVolunteer.find(query).toArray();
      res.send(result);
    });

    // get all volunteer requests requested by a specific user
    app.get("/volunteer-requests/:email", verifyToken, async (req, res) => {
      const tokenEmail = req?.user?.email;
      const email = req.params.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { "volunteer.email": email };
      const result = await allVolunteerRequest.find(query).toArray();
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
