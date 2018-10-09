const request = require('request-promise');

module.exports = class OtrsConnector {

    constructor(baseUrl, auth) {
        this.baseUrl = baseUrl;
        this.auth = auth;
    }

    request(method, url, params, data) {
        url = this.baseUrl + url;

        const {user, password} = this.auth;

        params = Object.assign({
            UserLogin: user,
            Password: password
        }, params);

        if (params) {
            url += '?';
            url += Object.entries(params).map(pair => (pair[0]) + '=' + (pair[1])).join('&');
        }

        console.log('url', "--------", data);

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

    getTickets(filters) {
        return this.request('POST', '/Tickets', null, filters);
    }

};
