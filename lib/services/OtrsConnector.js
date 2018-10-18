const request = require('request-promise');

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

        if (params) {
            url += '?';
            url += Object.entries(params).map(pair => encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1])).join('&');
        }

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

    getTickets(ids) {
        return this.request('GET', ['Tickets', ids.join(',')], {AllArticles: 1, DynamicFields: 1}).then(res => res.Ticket);
    }

    /**
     * Adds a second to a given date.
     *
     * @param {string} dateString - input date (YYYY-MM-DD HH:MM:SS)
     * @returns {string} - The new date with one second added to the original (YYYY-MM-DD HH:MM:SS)
     */
    add1Second(dateString) {
        const date = new Date(dateString);
        date.setSeconds(date.getSeconds() + 1);

        const isoDate = date.toISOString();
        return isoDate.slice(0, 10) + ' ' + isoDate.slice(11, 19);
    }

    /**
     * Validates a date for usage in query.
     * @param {string} date - 'yyyy-mm-dd hh:mm:ss'
     * @returns {boolean}
     */
    isValidDate(date) {
        return !!date.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}(?: [0-9]{2}:[0-9]{2}:[0-9]{2})?$/);
    }

    /**
     * Convert input object received from mapper to a OTRS ticket representation (object)
     * @param {object} input - object received from elastic.io mapper
     * @param {object} input.Ticket - OTRS fields for the ticket
     * @param {object} input.Ticket.other - other OTRS field for ticket property
     * @param {object} input.Article - OTRS fields for the ticket article
     * @param {object} input.Article.other - other OTRS field for article property
     * @param {object} input.DynamicField - OTRS fields for one of ticket's dynamic fields
     * @param {object[]} input.OtherArticles - array of other OTRS articles as objects
     * @param {object[]} input.OtherDynamicFields - array of other OTRS dynamic fields as objects
     * @returns {object} - OTRS ticket object
     */
    mapInputToTicket(input) {
        let ticketData = JSON.parse(JSON.stringify(input));

        if('other' in ticketData.Ticket) {
            Object.assign(ticketData.Ticket, ticketData.Ticket.other);
            delete ticketData.Ticket.other;
        }

        if('other' in ticketData.Article) {
            Object.assign(ticketData.Article, ticketData.Article.other);
            delete ticketData.Article.other;
        }

        if(ticketData.OtherDynamicFields) {
            const firstDynamicField = ticketData.DynamicField;
            ticketData.DynamicField = firstDynamicField ? [firstDynamicField, ...ticketData.OtherDynamicFields] : ticketData.OtherDynamicFields;

            delete ticketData.OtherDynamicFields;
        }

        //add functionality for articles whom can not be created multiple just updated after

        return ticketData;
    }

}

module.exports = OtrsConnector;
