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

        return request(requestOptions);
    }

    createTicket(data) {
        return this.request('POST', '/Ticket', null, data);
    }

    searchTickets(filters) {
        return this.request('POST', '/Tickets', null, filters).then(res => res.TicketID);
    }

    getTickets(ids) {
        return this.request('GET', ['Ticket', ids.join(',')], {AllArticles: 1}).then(res => res.Ticket);
    }
}

module.exports = OtrsConnector;
