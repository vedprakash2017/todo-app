const mongoose =require('mongoose')
const uri = process.env.URI
mongoose.connect(uri).then(()=>{
    console.log("connected to the database!")
})