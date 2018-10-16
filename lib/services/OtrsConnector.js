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

    searchTickets(filters) {
        return this.request('POST', '/Tickets', null, filters).then(res => res.TicketID || []);
    }

    getTickets(ids) {
        return this.request('GET', ['Ticket', ids.join(',')], {AllArticles: 1}).then(res => res.Ticket);
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
}

module.exports = OtrsConnector;
