const { EventEmitter } = require('events');
const { publishSystemEvent } = require('../services/liveEventsService');

const eventBus = new EventEmitter();
eventBus.setMaxListeners(200);

let initialized = false;

function initializeEventBus() {
  if (initialized) {
    return eventBus;
  }

  initialized = true;

  return eventBus;
}

async function emitDomainEvent(eventName, payload = {}, options = {}) {
  initializeEventBus();
  if (options.userId) {
    await publishSystemEvent({
      userId: options.userId,
      type: eventName,
      queueName: options.queueName || null,
      priority: options.priority || 'normal',
      payload,
    }).catch(() => null);
  }

  eventBus.emit(eventName, payload);
}

module.exports = {
  emitDomainEvent,
  eventBus,
  initializeEventBus,
};
