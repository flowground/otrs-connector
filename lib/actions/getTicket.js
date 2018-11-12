"use strict";
const util = require('../services/util');
const OtrsConnector = require('../services/OtrsConnector');
const moment = require('moment');

module.exports = util.eioModule(processAction);

/**
 * Get ticket based on ticket id.
 *
 * @param {object} msg
 * @param {string} msg.body.ticketId - ticket id
 * @param {string} msg.body.articlesCreatedAfter - articles crated after date
 * @param {object} cfg - credentials + action configuration
 * @param {string} cfg.includeArticles - 'none', 'first', 'rest' or 'all'
 * @param {boolean} cfg.includeAttachments - get ticket articles with attachments
 * @param {boolean} cfg.includeDynamicFields - get ticket with dynamic fields
 * @returns {Promise}
 */
function processAction(msg, cfg) {
    const otrs = new OtrsConnector(cfg);
    const ticketId = msg.body.ticketId;

    if(!ticketId) {
        throw new Error('Ticket ID is required');
    }

    if(cfg.includeArticles === 'none' && cfg.includeAttachments) {
        throw new Error('In order to include attachments, articles need to be included, too.');
    }

    let filters = {};

    if(cfg.includeDynamicFields) {
        filters.DynamicFields = 1;
    }

    if(cfg.includeArticles === 'all' || cfg.includeArticles === 'rest') {
        filters.AllArticles = 1;
    }

    if(cfg.includeArticles === 'first') {
        filters.AllArticles = 1;
        filters.ArticleLimit = 1;
    }

    if(cfg.includeAttachments) {
        filters.Attachments = 1;
    }

    return otrs.getTicket(ticketId, filters).then(async ticket => {
        if(cfg.includeArticles === 'rest') {
            ticket.Article.shift();
        }

        if(msg.body.articlesCreatedAfter) {
            const date = moment(msg.body.articlesCreatedAfter);
            ticket.Article = ticket.Article.filter(article => date.isBefore(article.CreateTime));
        }

        await otrs.uploadAttachmentsToPlatform(ticket);

        this.emitData(ticket);
    });
}
