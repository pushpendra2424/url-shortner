const shortId = require("shortid");
const urlModel = require("../models/urlModel");


const isValid = function (value) {
    if (typeof value === "undefined" || value === null) return false;
    if (typeof value === "string" && value.trim().length === 0) return false;
    return true;
};

const isvalidurl = /^(ftp|http|https):\/\/[^ "]+$/;

//===========================================Create Url==========================================================

const creatUrl = async function (req, res) {
    const { longUrl } = req.body;

    const baseUrl = 'https://localhost:3000'

    if (!isValid(longUrl)) {
        return res.status(400).send({ status: false, message: "please enter a longUrl" })
    }

    // check base url
    if (!isvalidurl.test(baseUrl)) {
        return res.status(400).send({ status: false, message: "Invalid base url" });
    }

    // check long url
    if (isvalidurl.test(longUrl)) {
        try {
            let url = await urlModel.findOne({ longUrl });
            if (url) {
                return res.status(400).send({ status: false, message: "already used" });
            } else {
                // create url code
                let urlCode = shortId.generate();
                let shortUrl = baseUrl + "/" + urlCode;

                url = new urlModel({
                    longUrl,
                    shortUrl,
                    urlCode,
                });
                await url.save();
                return res.status(201).send({ status: true, message:"success",data: url });
            }
        } catch (error) {
            console.error(error);
            return res.status(500).send({ status: false, error: error.message });
        }
    }
    else {
        return res.status(400).send({ status: false, message: "Invalid long url" });
    }
}
//===========================================Get Url==========================================================

const getUrl = async (req, res) => {
    try {
        let url1 = req.params.urlcode
        let url = await urlModel.findOne({ urlCode: url1 });

        if (url) {
            return res.status(302).redirect(url.longUrl);
        } else {
            return res.status(404).send({ status: false, message: "No url found" });
        }
    } catch (error) {
       
        return res.status(500).send({ status: false, error: error.message });
    }
}

module.exports.creatUrl = creatUrl
module.exports.getUrl = getUrl




