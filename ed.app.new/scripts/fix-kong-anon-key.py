#!/usr/bin/env python3
"""Point Kong's key-auth consumer at the self-hosted ANON_KEY.

Coolify Kong interpolates $SUPABASE_ANON_KEY into kong.yml. If that value is a
leftover Supabase Cloud JWT, /auth/v1/authorize still works (public route) but
PKCE /auth/v1/token returns 401 and Google login never completes.

Run on the Coolify host, then recreate only Kong:

  python3 scripts/fix-kong-anon-key.py
  cd /data/coolify/services/w9b3r7ces8npevhqcjwn4lzk
  docker compose up -d --force-recreate --no-deps supabase-kong
"""
from __future__ import annotations

import os
from pathlib import Path

DIR = Path(os.environ.get("SUPABASE_SERVICE_DIR", "/data/coolify/services/w9b3r7ces8npevhqcjwn4lzk"))
COMPOSE = DIR / "docker-compose.yml"
ENV_PATH = DIR / ".env"
CLOUD_REF = "olwviffbwcjbcyyleorp"


def parse_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key] = value.strip().strip("'\"")
    return values


def resolve_anon(values: dict[str, str]) -> str:
    for key in ("SERVICE_SUPABASEANON_KEY", "ANON_KEY"):
        raw = values.get(key, "")
        if raw.startswith("eyJ") and CLOUD_REF not in raw and len(raw) > 80:
            return raw
    raise SystemExit("no self-hosted ANON JWT found in SERVICE_SUPABASEANON_KEY / ANON_KEY")


def main() -> None:
    values = parse_env(ENV_PATH)
    anon = resolve_anon(values)

    env_lines = []
    seen = False
    for line in ENV_PATH.read_text().splitlines():
        if line.startswith("SUPABASE_ANON_KEY="):
            env_lines.append(f"SUPABASE_ANON_KEY={anon}")
            seen = True
        else:
            env_lines.append(line)
    if not seen:
        env_lines.append(f"SUPABASE_ANON_KEY={anon}")
    ENV_PATH.write_text("\n".join(env_lines) + "\n")

    lines = COMPOSE.read_text().splitlines()
    in_kong = False
    replaced = False
    out: list[str] = []
    for line in lines:
        if line.startswith("  supabase-kong:"):
            in_kong = True
        elif in_kong and line.startswith("  ") and not line.startswith("    "):
            in_kong = False
        if in_kong and line.strip().startswith("SUPABASE_ANON_KEY:"):
            out.append("      SUPABASE_ANON_KEY: '${SERVICE_SUPABASEANON_KEY}'")
            replaced = True
            in_kong = False
        else:
            out.append(line)
    if not replaced:
        raise SystemExit("could not find Kong SUPABASE_ANON_KEY in docker-compose.yml")
    COMPOSE.write_text("\n".join(out) + "\n")
    print(f"Kong SUPABASE_ANON_KEY now interpolates SERVICE_SUPABASEANON_KEY (jwt len={len(anon)})")


if __name__ == "__main__":
    main()
