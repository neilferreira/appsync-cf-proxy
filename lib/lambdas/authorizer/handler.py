import logging

logger = logging.getLogger(__name__)

def handler(event, context):
    response = {
        "isAuthorized": True,
        "resolverContext": {
            "hello": "world",
        },
        "deniedFields": [],
    }

    logger.info(f"Responding with {response}")

    return response
