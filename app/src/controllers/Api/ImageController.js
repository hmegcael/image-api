const fs = require("fs");
const path = require('path');
const randomFile = require('select-random-file');
const fetch = require('node-fetch');

const config = require("../../config");
const log = require("../../modules/logger");
const baseController = require('./BaseController');
const {checkStatus, getFileData, toBase64} = require('../../utils/Image');

/**
 * Check if we are using the dev version
 */
const dev = process.env.NODE_ENV !== 'production';

class ImageController extends baseController {
    constructor() {
        super();
    }

    /**
     * Saves images from a URL
     *
     * @param req
     * @param res
     */
    urlAction(req, res) {
        if (!config.endpoints.url) {
            this.jsonResponse(res, 423, {'message': 'Endpoint closed!'});
            return;
        }

        if (req.query.location) {
            fetch(req.query.location)
                .then(response => checkStatus(response, req.query.location) && response.arrayBuffer())
                .then(buffer => getFileData(req.query.location, buffer))
                .then(toBase64)
                .then(async ({ base64String, name, extension }) => {
                    const base64Data = base64String.replace(/^data:image\/jpeg;base64,/, "").replace(/^data:image\/png;base64,/, "").replace(/^data:image\/gif;base64,/, "");
                    const date = new Date();

                    fs.writeFile(`${dev ? __dirname : process.cwd()}/${config.application.uploads}/${name}-${date.getTime()}.${extension}`, base64Data, 'base64', (err) => {
                        if (err) {
                            log.error(`[API][IMAGE] Error: ${err}`);
                            this.jsonResponse(res, 423, {'message': 'Error saving image!'});
                            return;
                        }

                        log.info(`[API][IMAGE] Saved! ${name}-${date.getTime()}.${extension}`);
                        this.jsonResponse(res, 200, {'message': 'Image saved!'});
                    });
                })
                .catch(e => {});
            return;
        }

        this.jsonResponse(res, 406, {
            message: 'Field error!'
        });
    }

    /**
     * Saves a new image to disk
     *
     * @param req
     * @param res
     */
    saveAction(req, res) {
        if (!config.endpoints.save) {
            this.jsonResponse(res, 423, {'message': 'Endpoint closed!'});
            return;
        }

        if (req.body.image && req.body.extension && req.body.name) {
            const base64Data = req.body.image.replace(/^data:image\/jpeg;base64,/, "").replace(/^data:image\/png;base64,/, "").replace(/^data:image\/gif;base64,/, "");

            fs.writeFile(`${dev ? __dirname : process.cwd()}/${config.application.uploads}/${req.body.name}.${req.body.extension}`, base64Data, 'base64', (err) => {
                if (err) {
                    log.error(`[API][IMAGE] Error: ${err}`);
                    this.jsonResponse(res, 423, {'message': 'Error saving image!'});
                    return;
                }

                log.info(`[API][IMAGE] Saved! ${req.body.name}.${req.body.extension}`);
                this.jsonResponse(res, 200, {'message': 'Image saved!'});
            });

            return;
        }

        this.jsonResponse(res, 406, {
            message: 'Field error!'
        });
    }

    /**
     * Returns a random image from the filesystem
     *
     * @param req
     * @param res
     */
    randomAction(req, res) {
        if (!config.endpoints.random) {
            this.jsonResponse(res, 423, {'message': 'Endpoint closed!'});
            return;
        }

        randomFile(`${dev ? __dirname : process.cwd()}/${config.application.uploads}`, (err, file) => {
            if (err) {
                log.error(`[API][IMAGE] Error: ${err}`);
                this.jsonResponse(res, 423, {'message': 'Error loading an image!'});
                return;
            }

            // read binary data
            const bitmap = fs.readFileSync(`${dev ? __dirname : process.cwd()}/${config.application.uploads}/${file}`);
            // convert binary data to base64 encoded string
            const image = new Buffer(bitmap).toString('base64');

            log.info(`[API][IMAGE] Random file: ${file}`);
            this.jsonResponse(res, 200, {
                extension: path.extname(file).split(".")[1],
                name: file.split(".")[0],
                image
            });
        });
    }

    /**
     * Retrieve an image by type
     *
     * @param req
     * @param res
     */
    getRandomByTypeAction(req, res) {
        const {type} = req.params;
        const allowedTypes = ['jpg', 'png', 'gif'];

        if (allowedTypes.includes(type) === false) {
            return this.jsonResponse(res, 415, {message: `Type: ${type} not allowed`});
        }

        // Create regex for given type
        const regex = new RegExp(type, 'ig');

        // Get images from directory
        const images = fs.readdirSync(`${dev ? __dirname : process.cwd()}/${config.application.uploads}`);

        // Get files with given type
        const files = images.filter(file => file.match(regex));

        // If no types are found, respond with a message
        if (files.length === 0) {
            return this.jsonResponse(res, 404, {message: `No files available with type: ${type}`});
        }

        // Get random image key
        const randomIndex = Math.floor(Math.random() * files.length);
        const file = files[randomIndex];

        // read binary data
        const bitmap = fs.readFileSync(`${dev ? __dirname : process.cwd()}/${config.application.uploads}/${file}`);

        // convert binary data to base64 encoded string
        const image = new Buffer(bitmap).toString('base64');

        // Return a random image
        this.jsonResponse(res, 200, {
            extension: type,
            name: file,
            image
        });
    }
}

module.exports = new ImageController();
