const express = require('express')
require('./db/connect')

const app = express()
const router = express.Router()
const port = process.env.PORT
const tasks = require('./routes/taskRoute')
app.use(express.json())

app.use(express.static('./public'))
app.use(tasks)

app.listen(port , ()=>{
    console.log(`Sevrer connected to ${port}!`)
})