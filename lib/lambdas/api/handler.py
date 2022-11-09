import logging

logger = logging.getLogger(__name__)


def handler(event, context=None):
    logger.info(event)

    return [{"id": "foo", "version": "bar"}]

