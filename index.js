const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USSER}:${process.env.DB_PASS}@cluster0.qlvqjvw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollection = client.db("bistroBossDb").collection("menu");
    const cartsCollection = client.db("bistroBossDb").collection("carts");
    const userCollection = client.db("bistroBossDb").collection("users");

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // token releted api

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_ACCESTOKEN, {
        expiresIn: "1hr",
      });
      res.send({ token });
    });

    // Verify the token

    const veryfyToken = (req, res, next) => {
      // console.log("inside veryfied token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send("sorry you are not  authorizaed");
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.SECRET_ACCESTOKEN, (err, decoded) => {
        if (err) {
          return res.status(403).send("Invalid or expired token");
        }
        req.decoded = decoded;
        next();
      });
    };

    // veyfy admin

    const veryfyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/", async (req, res) => {
      res.send("resturant-running");
    });
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      // console.log("id", id);
      const query = { _id: id };
      // console.log("query", query);
      const result = await menuCollection.findOne(query);
      // console.log("result", result);
      res.send(result);
    });

    app.patch("/menu/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: id };
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image,
        },
      };

      const result = await menuCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.post("/menu", veryfyToken, veryfyAdmin, async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });
    app.delete("/menu/:id", veryfyToken, veryfyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const cartItems = req.body;
      const result = await cartsCollection.insertOne(cartItems);
      res.send(result);
    });

    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    // user related api

    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist" });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", veryfyToken, veryfyAdmin, async (req, res) => {
      // const user = req.body;
      // console.log("headerd", req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.delete("/users/:id", veryfyToken, veryfyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      veryfyToken,
      veryfyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    app.get("/users/admin/:email", veryfyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send("unauthorized access");
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.listen(port, () => {
      console.log(`bistro-boss-running ${port}`);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    //     await client.close();
  }
}
run().catch(console.dir);
