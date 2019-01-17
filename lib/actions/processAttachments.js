"use strict";
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');

module.exports = util.eioModule(processAction);

/**
 * Loads ticket attachments from OTRS and uploads them to the elastic.io platform.
 *
 * @alias processAttachments
 * @param {object} msg
 * @param {object} msg.body.ticket - ticket
 * @param {string} msg.body.ticket.TicketID
 * @param {object|object[]} [msg.body.ticket.Article] - only load attachments for these articles
 * @param {object} cfg - credentials
 * @returns {Promise} - resolves to the same ticket, but populated with attachments
 */
async function processAction(msg, cfg) {
    const otrs = new OtrsConnector(cfg);
    const ticket = msg.body.ticket;
    const ticketId = msg.body.ticket.TicketID;

    if(!ticketId) {
        throw new Error('Ticket ID is required');
    }

    // load all articles with all attachments for this ticket
    let ticketWithAtt = await otrs.getTicket(ticketId, {AllArticles: 1, Attachments: 1});

    let attachmentsByArticleId = {};
    ticketWithAtt.Article.forEach(a => attachmentsByArticleId[a.ArticleID] = a.Attachment);

    // populate ticket articles with attachments loaded above
    ticket.Article = util.arrayize(ticket.Article);
    ticket.Article.forEach(a => a.Attachment = attachmentsByArticleId[a.ArticleID]);

    await otrs.uploadAttachmentsToPlatform(ticket);

    return ticket;
}
