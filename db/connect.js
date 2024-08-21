const { MongoClient } = require('mongodb')


let client;


const connect = async () => {

    let db;
    if (!client) {
        const uri = "mongodb+srv://user_turkcell:kVICxra2OoSXm9y5@cluster0.jcus0vv.mongodb.net/sample_mflix"
        client = new MongoClient(uri)
        try {
            await client.connect()
            db = client.db('sample_mflix')


        } catch (error) {
            console.error('Error connecting to mongodb', error)
        }
        return {db, client};
    }
}


module.exports = {
    connect
}