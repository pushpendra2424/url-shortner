const urlModel = require("../models/urlModel")
const shortid = require('shortid')
const redis = require('redis')

const { promisify } = require("util");
//Connect to redis
const redisClient = redis.createClient(
    17771,
    "redis-17771.c80.us-east-1-2.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("79iWX2VpuIPI1vpT8AehEwKcxb4UTPHW", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});

//1. connect to the server
//2. use the commands :
//Connection setup for redis
const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);
// Validation Starts here...
const isValid = (value) => {
    if (typeof value === "undefined" || value === null) return false
    if (typeof value === "string" && value.trim().length === 0) false
    else {
        return true
    }
}

//======================================= < Shorten Url > ===========================================

const createShortUrl = async function (req, res) {
    try {

        const baseUrl = 'http://localhost:3000';
        if (!(/^https?:\/\/\w/).test(baseUrl)) {
            return res.status(400).send({ status: false, msg: "Please check your Base Url, Provide a valid One." })
        }

        const requestBody = req.body

        if (Object.keys(requestBody).length == 0) {
            return res.status(400).send({ status: false, message: "Bad Request, No Input provided" })
        }

        const longUrl = req.body.longUrl

        if (!isValid(longUrl)) {
            return res.status(400).send({ status: false, message: "Long Url is required" })
        }

        let validLongUrl = (/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%\+.~#?&//=]*)/.test(longUrl.trim()))
        if (!validLongUrl) {
            return res.status(400).send({ status: false, msg: "Please provide a valid longUrl" })
        }

        let cachedUrl = await GET_ASYNC(`${longUrl}`)
        if (cachedUrl) {
            let url = JSON.parse(cachedUrl)
            return res.status(200).send({ status: true, redisData: url })
        }

        let dbCallUrl = await urlModel.findOne({ longUrl }).select({  _id: 0, __v: 0});
        if (dbCallUrl) {
            await SET_ASYNC(`${longUrl}`, JSON.stringify(dbCallUrl))
            return res.status(200).send({ status: true, data: dbCallUrl })
        }
        
        const urlCode = shortid.generate().toLowerCase()

        const shortUrl = baseUrl.trim() + '/' + urlCode

        let urlBody = {
            longUrl,
            shortUrl,
            urlCode
        }
        let savedData = await urlModel.create(urlBody)

        let urlDetails = {
            longUrl: savedData.longUrl,
            shortUrl: savedData.shortUrl,
            urlCode: savedData.urlCode
        }
        return res.status(201).send({ status: true, data: urlDetails })

    } catch (error) {
        return res.status(500).send({ status: false, message: "error.message" })
    }
}


//=====================< Redirect to the original URL >====================================

const getUrl = async function (req, res) {
    try {
        let urlCode = req.params.urlCode

        if (!isValid(urlCode)) {
            return res.status(400).send({ status: false, message: "Urlcode is not present" })
        }

        //checking url in cache server memory
        const isUrlCached = await GET_ASYNC(`${urlCode}`)
        if (isUrlCached) return res.status(302).redirect(JSON.parse(isUrlCached).longUrl)

        //saving Url in cache server memory
        const isAlreadyUrlInDb = await urlModel.findOne({ urlCode: urlCode })
        if (!isAlreadyUrlInDb) return res.status(404).send({ status: false, message: "Unable to find URL to redirect to....." })

        await SET_ASYNC(`${urlCode}`, JSON.stringify(isAlreadyUrlInDb))
        return res.status(302).redirect(isAlreadyUrlInDb.longUrl);
    }
    catch (err) {
        return res.status(500).send({ status: false, error: err.message })
    }
}

module.exports = { createShortUrl, getUrl }


