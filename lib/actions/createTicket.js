"use strict";
const messages      = require('elasticio-node').messages;
const OtrsConnector = require('../services/OtrsConnector');

exports.process = processAction;

/**
 * Executes the action's logic by sending a request to the Petstore API and emitting response to the platform.
 * The function returns a Promise sending a request and resolving the response as platform message.
 *
 * @param msg incoming messages which is empty for triggers
 * @param cfg object to retrieve triggers configuration values, such as apiKey and pet status
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

	// if(!apiKey) {
	// 	throw new Error('You must specify a project');
	// }

	const otrs = new OtrsConnector(cfg.baseUrl, {user, password});

	// updateIssueWithLabels(issue);

	console.log(msg, 'adsasasdasdasdasdasdasasdasdas')
    otrs.createTicket(ticket)
	    .then((response) => {
	    	console.log(response)
	        //NO idea how to emmit this;

	        // this.emit(...)

	    })
        .catch((error) => {
        	console.log(error)
            this.emit('error', error);
        })

}

const updateIssueWithLabels = (issue) => {
	const originNameLabel = `from ${issue.connector.origin.name}`;
	const originIdLabel   = `OTRS-ID: ${issue.connector.origin.id}`;

	issue.labels = [...issue.labels, originIdLabel, originNameLabel];
};