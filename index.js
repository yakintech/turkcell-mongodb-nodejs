const { ObjectId } = require("mongodb");
const { connect } = require("./db/connect");
const express = require("express");
const cors = require("cors");
const app = express();

app.use(express.json())
app.use(cors())




let db;
let client;
let session;
connect()
    .then((result) => {
        db = result.db;
        client = result.client;
        session = client.startSession();
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

//bulk user insert
app.post("/api/users/bulk", async (req, res) => {
    session.startTransaction()
    const users = req.body;
    console.log("users", users)

    try {
        const result = await db.collection("users").insertMany(users, { session })
        await session.commitTransaction()
        return res.json(result)

    } catch (error) {
        await session.abortTransaction()
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
    let sort = {}
    let search = req.query.search || ''


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

    const movies = await db.collection("movies").aggregate([
        { $match: { title: { $regex: search, $options: 'i' } } },
        { $project: fields }, // project ile sadece belirli alanları getirebiliriz
        { $sort: sort }, // sort ile sıralama yapabiliriz
        { $limit: limit } // limit ile kaç tane getireceğimizi belirleyebiliriz
    ]).toArray();

    // const movies = await db.collection("movies").find()
    // .project(fields) // project ile sadece belirli alanları getirebiliriz
    // .sort(sort) // sort ile sıralama yapabiliriz
    // .limit(limit).toArray() // limit ile kaç tane getireceğimizi belirleyebiliriz



    return res.json(movies)
})

//get movies by Country
app.get("/api/movies/country/:country", async (req, res) => {
    let country = req.params.country
    console.log(country)
    country = country.trim()

    const movies = await db.collection("movies").aggregate([
        {
            $match:
            {
                countries: country
            }
        },
        {
            $project:
            {
                title: 1,
                countries: 1,
                year:1,
                genres:1,
                poster:1,
                directors:1
            }
        }
    ])
    .toArray()
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
            {
                name: name,
            }
        },
        {
            $lookup:
            {
                from: "movies",
                localField: "movie_id",
                foreignField: "_id",
                as: "movie_info"
            }
        },
        {
            $project:
            {
                "movie_info.title": 1,
                text: 1
            }
        }
    ])
        .toArray()

    return res.json(reviews)
})

//get movies by Cast
app.get("/api/movies/cast/:cast", async (req, res) => {
    let cast = req.params.cast
    console.log(cast)
    cast = cast.trim()

    const movies = await db.collection("movies").aggregate([
        {
            $match:
            {
                cast: cast
            }
        },
        {
            $project:
            {
                title: 1,
                cast: 1,
                year:1,
                genres:1,
                poster:1,
                directors:1
            }
        }
    ])
    .toArray()
    return res.json(movies)
})


// belirli bir film için yapılan yorumlar
app.get("/api/movies/:id/reviews", async (req, res) => {
    let id = new ObjectId(req.params.id)

    const reviews = await db.collection("comments").aggregate([
        {
            $match:
            {
                movie_id: id
            }
        },
        {
            $project:
            {
                name: 1,
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




