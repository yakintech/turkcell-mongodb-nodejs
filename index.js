const { ObjectId } = require("mongodb");
const { connect } = require("./db/connect");
const express = require("express");
const app = express();

app.use(express.json())


let db;
connect()
    .then((result) => {
        db = result
    })
    .catch((error) => {
        console.error('Error connecting to mongodb', error)
    })



app.get("/api/users", async (req, res) => {
    const users = await db.collection("users").find().toArray()
    return res.json(users)
})

app.get("/api/users/:id", async (req, res) => {
    try {
        const id = new ObjectId(req.params.id)
        const user = await db.collection("users").findOne({ _id: id })

        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        return res.json(user)
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }

})

app.delete("/api/users/:id", async (req, res) => {
    try {
        const id = new ObjectId(req.params.id)
        const result = await db.collection("users").deleteOne({ _id: id })
        return res.json(result)
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
})

app.post("/api/users", async (req, res) => {
    const { name, email } = req.body

    const newUser = {
        name,
        email
    }

    try {
        const result = await db.collection("users").insertOne(newUser)
        return res.json(result)
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
})

app.put("/api/users/:id", async (req, res) => {
    const { name, email } = req.body

    const id = new ObjectId(req.params.id)
    const updatedUser = {
        name,
        email,
    }

    console.log(updatedUser)

    try {
        const result = await db.collection("users").updateOne(
            { _id: id },
            { $set: updatedUser }
        )
        return res.json(result)
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
})



app.get("/api/movies", async (req, res) => {

    let limit = 20
    let fields = {}
    let sort = { }
    

    if (req.query.limit) {
        limit = Number(req.query.limit)
    }
    if (req.query.fields) {
        fields = req.query.fields.split(',').reduce((acc, field) => {
            acc[field] = 1
            return acc
        }, {})
    }
    if (req.query.sort) {
        const parts = req.query.sort.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    const movies = await db.collection("movies").find()
        .project(fields) // project ile sadece belirli alanları getirebiliriz
        .sort(sort) // sort ile sıralama yapabiliriz
        .limit(limit).toArray() // limit ile kaç tane getireceğimizi belirleyebiliriz

    return res.json(movies)
})


//belirli bir kullanıcı tarafından yapılan yorumlar. hangi filme ne yorum yapmış
app.get("/api/users/:name/reviews", async (req, res) => {
   
    let name = req.params.name
    name = name.trim()

    //lookup ile comment collection ile movie collection arasında join işlemi yapıyorum
    const reviews = await db.collection("comments").aggregate([
        {
            $match:
              /**
               * query: The query in MQL.
               */
              {
                name: name,
              }
          },
          {
            $lookup:
              /**
               * from: The target collection.
               * localField: The local join field.
               * foreignField: The target join field.
               * as: The name for the results.
               * pipeline: Optional pipeline to run on the foreign collection.
               * let: Optional variables to use in the pipeline field stages.
               */
              {
                from: "movies",
                localField: "movie_id",
                foreignField: "_id",
                as: "movie_info"
              }
          },
          {
            $project:
              /**
               * specifications: The fields to
               *   include or exclude.
               */
              {
                "movie_info.title": 1,
                text: 1
              }
          }
    ])
    .toArray()

    return res.json(reviews)
})










app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000')
})




