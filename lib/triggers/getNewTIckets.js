"use strict";
const messages = require('elasticio-node').messages;
const OtrsConnector = require('../services/OtrsConnector');

exports.process = processAction;

/**
 * Executes the triggers's logic by sending a request to the OTRS Web Service API for the ticket ids,
 * and then executing cascading calls to get the data for each ticket.
 *
 * @param msg - an empty object
 * @param cfg - object that contains the baseUrl, the OTRS project and the user / password for authentication
 *        and the startDateTime
 * @param snp - object that contains lasProcessedTicketId
 * @returns promise resolving a message to be emitted to the platform
 */
async function processAction(msg, cfg, snp) {

    const {baseUrl, project, user, password, startDateTime} = cfg;

    if(!baseUrl) {
        throw new Error('You must specify a host');
    }

    if(!project) {
        throw new Error('You must specify a project');
    }

    if(!user) {
        throw new Error('You must specify a user');
    }

    if(!password) {
        throw new Error('You must specify a password for the user');
    }

    if(!startDateTime) {
        throw new Error('You must specify a start date')
    }

    const otrs = new OtrsConnector(cfg.baseUrl, user, password);

    let lasProcessedTicketId = snp.lastProcessedTicketId || 0;

    let newTicketsIds = [];

    await otrs.searchTickets({
        ArticleCreateTimeNewerDate: startDateTime,
    }).then(res => {
        newTicketsIds = res.TicketID.filter(ticketId => Number(ticketId) > lasProcessedTicketId);
    }).catch(error => {
        this.emit('error', error);
    });

    newTicketsIds.forEach(ticketId => {
        otrs.getTicket(ticketId).then(res => {
            if(res.Ticket && Array.isArray(res.Ticket[0])) {
                this.emit('data', messages.newMessageWithBody(res.Ticket[0]));
                this.emit('snapshot', {lastProcessedTicketId: Number(ticketId)});
            }
        }).catch(error => {
            this.emit('error', error);
        })
    });
}