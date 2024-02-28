import logging
import os
import sys

loglevel = os.getenv("HEALTHCHECK_LOG_LEVEL", "WARNING")


def _init_logger(level: str, name=__name__) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger


log = _init_logger(loglevel, "healthcheck")
