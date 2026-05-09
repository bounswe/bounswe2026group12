import re
import secrets
import time

from django.core.validators import RegexValidator


ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
ULID_REGEX = re.compile(r'^[0-9A-HJKMNP-TV-Z]{26}$')

validate_ulid = RegexValidator(
    regex=ULID_REGEX.pattern,
    message='Enter a valid ULID.',
)


def generate_ulid(timestamp_ms=None):
    """Generate a 26-character ULID using timestamp + random bits."""
    if timestamp_ms is None:
        timestamp_ms = int(time.time() * 1000)

    if timestamp_ms < 0 or timestamp_ms >= 2**48:
        raise ValueError('ULID timestamp must fit in 48 bits.')

    value = (timestamp_ms << 80) | secrets.randbits(80)
    chars = []
    for shift in range(125, -1, -5):
        chars.append(ULID_ALPHABET[(value >> shift) & 0x1F])
    return ''.join(chars)


def is_ulid(value):
    return isinstance(value, str) and ULID_REGEX.fullmatch(value) is not None
