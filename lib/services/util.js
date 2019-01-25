const messages = require('elasticio-node').messages;
const request = require('request-promise');

let numRequests = 0;
const authHeader = 'Basic ' + new Buffer(process.env.ELASTICIO_API_USERNAME + ':' + process.env.ELASTICIO_API_KEY).toString('base64');

module.exports = {
    eioModule: eioModule,
    createAttachment: createAttachment,
    downloadAttachment: downloadAttachment,
    arrayize: arrayize,
};

/**
 * Returns an object of hooks to be exported from an elastic.io trigger/action module.
 * Provides default empty implementations for all optional hooks to prevent log warnings from the platform (e.g. "invokeModuleFunction – init is not found")
 * To learn more about the hooks below, please see https://github.com/elasticio/sailor-nodejs
 *
 * Usage:
 * module.exports = util.eioModule(processTriggerOrAction); // simple case, just the process function
 * module.exports = util.eioModule({init: initFn, process: processFn}); // multiple hooks specified
 *
 * @param {object|function} mod - The module hooks or just the process function
 * @param {function} mod.process - The process function, will be further wrapped by eioProcess (see below)
 * @param {function} [mod.init] - init hook
 * @param {function} [mod.startup] - startup hook
 * @param {function} [mod.shutdown] - shutdown hook
 * @returns {{init, startup, shutdown, process}} - the object to be exported
 */
function eioModule(mod) {
    if(typeof mod === 'function') {
        mod = {process: mod}; // simple case
    }

    const defaultFn = function(/*cfg*/) { return Promise.resolve(); };

    mod = Object.assign({
        init: defaultFn,
        startup: defaultFn,
        shutdown: defaultFn
    }, mod);

    mod.process = eioProcess(mod.process);

    return mod;
}

/**
 * Adds additional functionality to an elastic.io trigger/action:
 * - this.emitData(data) // data will automatically be wrapped in a message
 * - this.emitSnapshot(snapshot)
 * - this.parseCsvInput
 * If the process function performs async tasks, it should return a promise that resolves when all tasks have been completed.
 * An error in the process function is handled like a promise fail (an 'error' event is sent).
 * No need to explicitly emit an 'end' event in the process function.
 *
 * If the returned promise resolves to a truthy value, that value is emitted as data, no need to emitData() explicitly.
 *
 * @param {function} processFn - the trigger/action
 * @returns {Function}
 */
function eioProcess(processFn) {
    return function(msg, cfg, snapshot) {
        console.log('---PROCESS body: %j', msg.body);
        console.log('---PROCESS config: %j', cfg);
        console.log('---PROCESS snapshot: %j', snapshot);
        assignAndBind(this, messages, {
            parseCsvInput,
        });

        let finalSnapshot = null; // will be emitted when the process function has finished
        let emitSerial = 0; // to show the serial number of each emit call

        // wrapper for emit() so we can log what's emitted
        let emit = this.emit;
        this.emit = (event, data) => {
            console.log('---EMIT-%d %s %j', ++emitSerial, event, data);
            if(event === 'snapshot') {
                finalSnapshot = data; // don't emit it just yet, keep it until the end of the execution
            } else {
                return emit.call(this, event, data);
            }
        };

        let emitFinalSnapshot = () => {
            if(finalSnapshot) {
                console.log('---EMIT FINAL SNAPSHOT %j', finalSnapshot);
                emit.call(this, 'snapshot', finalSnapshot); // emit the last recorded snapshot
            }
        };

        return Promise.resolve(processFn.call(this, msg, cfg, snapshot)).then(data => {
            if(data !== undefined) {
                this.emitData(data); // promise returned data, wrap it in a message and emit it
            }
            emitFinalSnapshot();
            // eslint-disable-next-line no-useless-return
            return undefined; // return nothing so that sailor won't emit data
        }).catch(err => {
            emitFinalSnapshot();
            return Promise.reject(err);
        });
    };
}

/**
 * Parses a string containing multiple values separated by commas into an array of strings.
 * Spaces around the commas and at the beginning/end of the whole string are stripped.
 * Returns an empty array if the input is an empty string or a non-string.
 *
 * @param {string} input - The input string containing multiple values separated by comma
 * @returns {string[]} - The output array
 */
function parseCsvInput(input) {
    if(typeof input !== 'string') return [];
    input = input.trim();
    if(!input) return [];
    return input.split(/ *, */).filter(e => e !== '');
}

/**
 * Like Object.assign(), but binds function values to the first argument (object)
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
 *
 * Sources that are not objects are ignored.
 *
 * @param {object} dest - The recipient of all properties, and the thisArg of the function values
 * @param {object[]} [sources] - The source object(s)
 * @returns {*}
 */
function assignAndBind(dest, ...sources) {
    sources.forEach(source => {
        if(typeof source === 'object' && source) {
            for (const [key, value] of Object.entries(source)) {
                dest[key] = typeof value === 'function' ? value.bind(dest) : value;
            }
        }
    });

    return dest;
}

/**
 * Generic function that makes requests to the elastic.io platform API.
 * @param {string} method - HTTP verb (GET, POST, etc.)
 * @param {string|string[]} path - the url path (string) or an array of path components to be escaped and joined with slash
 * @param {object} [options] - request options, see https://www.npmjs.com/package/request#requestoptions-callback
 * @param {string|null} [options.baseUrl] - the base url for the request
 * @param {object} [options.qs] - url search parameters (used to produce the query string)
 * @param {object} [options.body] - data to be sent as json in the request body
 * @param {object} [options.formData] - form data to upload
 * @param {boolean} [options.json=true] - serialize options.body (if provided) as json AND parse response as json
 * @param {string|null} [options.encoding] - type of encoding for the data that will be received default is utf8
 * @returns {Promise}
 */
function eioRequest(method, path, options = {}) {
    let req = request.defaults({
        method: method,
        baseUrl: process.env.ELASTICIO_API_URI,
        uri: Array.isArray(path) ? path.map(encodeURIComponent).join('/') : path,
        headers: {
            Authorization: authHeader,
        },
        json: true,
    })(options);

    console.log('---EIO REQUEST-%d: %s %s %s', ++numRequests, req.method, req.uri.href, JSON.stringify(options.body));

    return req;
}

/**
 * Get the urls for the api required for storing and retrieving attachments
 * @returns {Promise}
 */
async function createAttachment() {
    const urls = await eioRequest('POST', 'v2/resources/storage/signed-url');

    return {
        upload: (base64Content) => {
            const attachBuffer = new Buffer(base64Content, 'base64');
            return eioRequest('PUT', urls.put_url, {body: attachBuffer, baseUrl: null, json: false});
        },
        getDownloadUrl: () => urls.get_url
    };
}

/**
 * Gets the stored attachments
 *
 * @param {string} url - the platform url to download from
 * @param {string} [encoding=null] - see https://nodejs.org/api/buffer.html#buffer_buf_tostring_encoding_start_end
 * @returns {Promise} - resolves to the content of the downloaded file
 */
function downloadAttachment(url, encoding=null) {
    return eioRequest('GET', url, {baseUrl: null, json: false, encoding: encoding});
}

/**
 * Transforms input into an array:
 * - an input array is returned as is
 * - undefined or null are returned as an empty array
 * - any other value is returned as an array with that value as the single item
 * @param {*} value - input value: array, undefined, null, or anything else
 * @returns {array}
 */
function arrayize(value) {
    if(value === undefined || value === null) {
        return [];
    }

    if(Array.isArray(value)) {
        return value;
    }

    return [value];
}