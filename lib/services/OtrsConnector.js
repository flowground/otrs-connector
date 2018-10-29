const util = require('./util');
const request = require('request-promise');
const _ = require('lodash');
const moment = require('moment');

class OtrsConnector {

    constructor(credentials) {
        const {baseUrl, user, password} = credentials;

        if(!baseUrl) {
            throw new Error('You must specify a host');
        }

        if(!user) {
            throw new Error('You must specify a user');
        }

        if(!password) {
            throw new Error('You must specify a password for the user');
        }

        this.baseUrl = baseUrl;
        this.user = user;
        this.password = password;
    }

    request(method, path, params, data) {

        if(Array.isArray(path)) {
            path = '/' + path.map(encodeURIComponent).join('/');
        }

        let url = this.baseUrl + path;

        params = Object.assign({
            UserLogin: this.user,
            Password: this.password
        }, params);

        url += '?' + Object.entries(params).map(pair => encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1])).join('&');

        const requestOptions = {
            method: method,
            uri: url,
            headers: {},
            body: data,
            json: true
        };

        console.log('---REQUEST: %s %s', method, url);
        console.log('---REQUEST BODY: %j', data);

        return request(requestOptions);
    }

    createTicket(data) {
        return this.request('POST', '/Ticket', null, data);
    }

    updateTicket(ticketId, ticket) {
        return this.request('PATCH', ['Tickets', ticketId], null, ticket);
    }

    searchTickets(filters) {
        return this.request('POST', '/Tickets', null, filters).then(res => res.TicketID || []);
    }

    getTickets(ids, filters) {
        return this.request('GET', ['Tickets', ids.join(',')], filters).then(res => res.Ticket);
    }

    getTicket(id) {
        return this.request('GET', ['Tickets', id], {AllArticles: 1, DynamicFields: 1}).then(res => res.Ticket[0]);
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
     * Process all attachments for ticket
     *
     * @param ticket - otrs ticket data
     * @returns {undefined}
     */
    async processAttachment(ticket) {
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
