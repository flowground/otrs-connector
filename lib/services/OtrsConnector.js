const util = require('./util');
const request = require('request-promise');
const _ = require('lodash');
const moment = require('moment');

class OtrsConnector {

    /**
     * OtrsConnector constructor.
     * @param {object} credentials
     * @param {string} credentials.baseUrl
     * @param {string} credentials.user
     * @param {string} credentials.password
     */
    constructor(credentials) {
        if(!credentials.baseUrl) {
            throw new Error('Credentials must contain the OTRS webservice base url.');
        }

        if(!credentials.user) {
            throw new Error('Credentials must contain the OTRS account username.');
        }

        if(!credentials.password) {
            throw new Error('Credentials must contain the OTRS account password');
        }

        this.baseUrl = credentials.baseUrl;
        this.user = credentials.user;
        this.password = credentials.password;
        this.numRequests = 0;
    }

    /**
     * Generic authenticated request to OTRS.
     * @param {string} method - HTTP verb (GET, POST, etc.)
     * @param {string|string[]} path - the url path (string) or an array of path components to be escaped and joined with slash
     * @param {object} [options] - request options, see https://www.npmjs.com/package/request#requestoptions-callback
     * @param {object} [options.qs] - url search parameters (used to produce the query string)
     * @param {object} [options.body] - data to be sent as json in the request body
     * @param {object} [options.formData] - form data to upload
     * @param {boolean} [options.json=true] - serialize options.body (if provided) as json AND parse response as json
     * @returns {Promise}
     */
    request(method, path, options = {}) {
        options = Object.assign({qs: {}}, options);
        options.qs = _.mapValues(options.qs, value => Array.isArray(value) ? value.join(',') : value);

        let req = request.defaults({
            method: method,
            baseUrl: this.baseUrl,
            uri: Array.isArray(path) ? path.map(encodeURIComponent).join('/') : path,
            qs: {UserLogin: this.user, Password: this.password},
            json: true,
        })(options);

        console.log('---OTRS REQUEST-%d: %s %s %s', ++this.numRequests, req.method, req.uri.href, JSON.stringify(options.body));

        return req;
    }

    /**
     * Creates a OTRS ticket
     * @param {object} ticket - the ticket
     * @returns {Promise}
     */
    async createTicket(ticket) {
        ticket = this.mapInputToTicket(ticket);
        ticket = await this.downloadAttachmentsFromPlatform(ticket);
        return this.request('POST', 'Ticket', {body: ticket});
    }

    /**
     * Update a OTRS ticket
     * @param {string} ticketId - the ticket id
     * @param {object} ticket - the updated ticket data
     * @param {object} [ticket.Ticket] - ticket specific data
     * @param {object} [ticket.Article] - article to add
     * @param {object|object[]} [ticket.DynamicField] - dynamic fields
     * @param {object|object[]} [ticket.Attachment] - attachment(s)
     * @returns {Promise}
     */
    async updateTicket(ticketId, ticket) {
        ticket = this.mapInputToTicket(ticket);
        ticket = await this.downloadAttachmentsFromPlatform(ticket);
        return this.request('PATCH', ['Tickets', ticketId], {body: ticket});
    }

    /**
     * Adds a new article to an existing OTRS ticket
     * @param {string} ticketId - the ticket id
     * @param {object} article - the article data
     * @param {object|object[]} [article.Attachment] - the article's attachment(s)
     * @returns {Promise}
     */
    addArticle(ticketId, article) {
        let {Attachment, ...Article} = article;
        return this.updateTicket(ticketId, {
            Article: Article,
            Attachment: Attachment
        });
    }

    /**
     * Search for OTRS ticket ids
     * @param {object} params - filter params for tickets
     * @returns {Promise}
     */
    searchTickets(params) {
        return this.request('POST', 'Tickets', {body: params}).then(res => res.TicketID || []);
    }

    /**
     * Get OTRS tickets
     * @param {string[]} ids - the ticket ids
     * @param {object} params - filter params for tickets
     * @returns {Promise}
     */
    getTickets(ids, params) {
        return this.request('GET', ['Tickets', ids.join(',')], {qs: params}).then(res => res.Ticket);
    }

    getTicket(id, params) {
        return this.request('GET', ['Tickets', id], {qs: params}).then(res => res.Ticket[0]);
    }

    /**
     * Adds a second to a given date.
     *
     * @param {string} dateString - input date (YYYY-MM-DD HH:MM:SS)
     * @returns {string} - The new date with one second added to the original (YYYY-MM-DD HH:MM:SS)
     */
    add1Second(dateString) {
        return moment(dateString).add(1, 'seconds').format('YYYY-MM-DD HH:mm:ss');
    }

    /**
     * Validates a date for usage in query.
     * @param {string} date - 'yyyy-mm-dd hh:mm:ss'
     * @returns {boolean}
     */
    isValidDate(date) {
        return !!date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/);
    }

    /**
     * Convert input object received from mapper to a OTRS ticket representation (object)
     * @param {object} input - object received from elastic.io mapper
     * @param {object} input.Ticket - OTRS fields for the ticket
     * @param {object} input.Ticket.OTHER - other fields
     * @param {object} input.Article - OTRS fields for the ticket article
     * @param {object} input.Article.OTHER - other fields
     * @param {object|object[]} input.DynamicField - OTRS fields for one of ticket's dynamic fields
     * @returns {object} - OTRS ticket object
     */
    mapInputToTicket(input) {
        let ticket = JSON.parse(JSON.stringify(input));

        if(ticket.Ticket && 'OTHER' in ticket.Ticket) {
            Object.assign(ticket.Ticket, ticket.Ticket.OTHER);
            delete ticket.Ticket.OTHER;
        }

        if(ticket.Article && 'OTHER' in ticket.Article) {
            Object.assign(ticket.Article, ticket.Article.OTHER);
            delete ticket.Article.OTHER;
        }

        if(_.isPlainObject(ticket.DynamicField)) {
            let dynamicField = [];

            if(ticket.DynamicField.Name) {
                dynamicField.push({
                    Name: ticket.DynamicField.Name,
                    Value: ticket.DynamicField.Value
                })
            }

            if('OTHER' in ticket.DynamicField) {
                dynamicField = dynamicField.concat(_.map(ticket.DynamicField.OTHER, (value, key) => ({
                    Name: key,
                    Value: value
                })));
            }

            ticket.DynamicField = dynamicField;
        }

        return ticket;
    }

    /**
     * Downloads attachments from platform (base64 encoded) and stores them into the ticket attachments
     * @param {object} ticket - The ticket to update
     * @returns {Promise<*>} - the ticket with attachments' content filled in
     */
    async downloadAttachmentsFromPlatform(ticket) {
        await Promise.all(util.arrayize(ticket.Attachment).map(attach => {
            return util.downloadAttachment(attach.Content, 'base64').then(content => attach.Content = content);
        }));

        return ticket;
    }

    /**
     * Uploads all attachments from a ticket to the platform and stores the urls inside the ticket
     * @param {object} ticket - otrs ticket
     * @returns {Promise} - resolves when all attachments have been uploaded
     */
    async uploadAttachmentsToPlatform(ticket) {
        for (const article of ticket.Article || []) {
            for (const attachment of article.Attachment || []) {
                const attach = await util.createAttachment();
                await attach.upload(attachment.Content);
                attachment.Content = attach.getDownloadUrl();
            }
        }
    }
}

module.exports = OtrsConnector;
