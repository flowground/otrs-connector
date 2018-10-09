const request = require('request-promise');

module.exports = class OtrsConnector {

    constructor(baseUrl, user, password) {
        this.baseUrl = baseUrl;
        this.user = user;
        this.password = password
    }

    request(method, url, params, data) {
        url = this.baseUrl + url;

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

    getTickets(filters) {
        return this.request('POST', '/Tickets', null, filters);
    }

};
