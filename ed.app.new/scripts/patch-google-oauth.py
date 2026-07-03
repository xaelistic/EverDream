#!/usr/bin/env python3
"""Enable Google OAuth on self-hosted Supabase GoTrue (Coolify)."""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

SERVICE_DIR = Path(os.environ.get('SUPABASE_SERVICE_DIR', '/data/coolify/services/w9b3r7ces8npevhqcjwn4lzk'))
ENV_PATH = SERVICE_DIR / '.env'
COMPOSE_PATH = SERVICE_DIR / 'docker-compose.yml'

CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '').strip()
CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '').strip()
REDIRECT_URI = os.environ.get(
    'GOOGLE_REDIRECT_URI',
    'https://supabase.n1g3.com/auth/v1/callback',
).strip()

if not CLIENT_ID or not CLIENT_SECRET:
    print('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET', file=sys.stderr)
    sys.exit(1)


def upsert_env_line(text: str, key: str, value: str) -> str:
    line = f'{key}={value}'
    if re.search(rf'^{re.escape(key)}=', text, re.M):
        return re.sub(rf'^{re.escape(key)}=.*$', line, text, flags=re.M)
    return text.rstrip() + f'\n{line}\n'


def main() -> None:
    env = ENV_PATH.read_text()
    env = upsert_env_line(env, 'GOTRUE_EXTERNAL_GOOGLE_ENABLED', 'true')
    env = upsert_env_line(env, 'GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID', CLIENT_ID)
    env = upsert_env_line(env, 'GOTRUE_EXTERNAL_GOOGLE_SECRET', CLIENT_SECRET)
    env = upsert_env_line(env, 'GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI', REDIRECT_URI)
    ENV_PATH.write_text(env)
    print('Updated .env Google OAuth keys')

    compose = COMPOSE_PATH.read_text()
    compose = compose.replace(
        "API_EXTERNAL_URL: 'http://supabase-kong:8000'",
        "API_EXTERNAL_URL: '${SERVICE_URL_SUPABASEKONG:-https://supabase.n1g3.com}'",
    )

    google_block = """      GOTRUE_EXTERNAL_GOOGLE_ENABLED: '${GOTRUE_EXTERNAL_GOOGLE_ENABLED:-false}'
      GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: '${GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID}'
      GOTRUE_EXTERNAL_GOOGLE_SECRET: '${GOTRUE_EXTERNAL_GOOGLE_SECRET}'
      GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: '${GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI}'"""

    if 'GOTRUE_EXTERNAL_GOOGLE_ENABLED' not in compose:
        compose = compose.replace(
            "      GOTRUE_EXTERNAL_PHONE_ENABLED: '${ENABLE_PHONE_SIGNUP:-true}'",
            "      GOTRUE_EXTERNAL_PHONE_ENABLED: '${ENABLE_PHONE_SIGNUP:-true}'\n"
            + google_block,
        )
        print('Added Google OAuth to docker-compose.yml')
    else:
        print('docker-compose.yml already has Google OAuth block')

    COMPOSE_PATH.write_text(compose)
    print('Done — restart supabase-auth to apply')


if __name__ == '__main__':
    main()