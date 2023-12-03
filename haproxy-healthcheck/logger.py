import logging
import os
import sys

loglevel = os.getenv("APP_LOGLEVEL", "INFO")


def _init_logger(level: str) -> logging.Logger:
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    root_logger.addHandler(handler)
    return root_logger


log = _init_logger(loglevel)
