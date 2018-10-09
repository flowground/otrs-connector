"use strict";
const messages = require('elasticio-node').messages;
const OtrsConnector = require('../services/OtrsConnector');

exports.process = processAction;

/**
 * Executes the action's logic by sending a request to the OTRS Web Service API.
 * The function returns a Promise sending a request.
 *
 * @param msg incoming messages which contains the ticket in the body property
 * @param cfg object that contains the baseUrl, the OTRS projects and the user / password for authentication
 * @returns promise resolving a message to be emitted to the platform
 */
function processAction(msg, cfg) {

    const ticket = msg.body;

    const {baseUrl, projects, user, password} = cfg;

	if(!baseUrl) {
		throw new Error('You must specify a host');
	}

	if(!projects) {
		throw new Error('You must specify a project');
	}

	if(!user) {
		throw new Error('You must specify a user');
	}

	if(!password) {
		throw new Error('You must specify a password for the user');
	}

	new OtrsConnector(cfg.baseUrl, {user, password}).createTicket(ticket)
	    .then(response => {
		    this.emit('data', messages.newMessageWithBody(response));
	    })
        .catch(error => {
            this.emit('error', error);
        })
	    .finally(() => this.emit('end'))

}

// const updateIssueWithLabels = (issue) => {
// 	const originNameLabel = `from ${issue.connector.origin.name}`;
// 	const originIdLabel   = `OTRS-ID: ${issue.connector.origin.id}`;
//
// 	issue.labels = [...issue.labels, originIdLabel, originNameLabel];
// };