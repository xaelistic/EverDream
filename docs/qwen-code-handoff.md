# Hermes and Qwen Code

Hermes does not call the Qwen API. Qwen stays in Qwen Code on the Pro plan. Hermes stays on this machine.

The handoff is a markdown file in the GitHub repo the work belongs to. Hermes writes it, commits it, and pushes it. Qwen Code reads that file from GitHub and does the work. Hermes then checks the result on this machine.

A local-only file, an unpushed commit, a note in the OPS vault, or a note in the DEV vault is invisible to Qwen Code.

## What Hermes writes

One `.md` in the repo being worked on. Not a copy in another repo.

The file states:

- the task
- the files to touch
- what done looks like
- what not to change

Hermes does not put API keys, tokens, or `.env` contents in the file.

## What Qwen Code does

Qwen Code reads the pushed `.md` and actions it in that same GitHub repo. It does not read the OPS vault. It does not read a folder that has not been pushed.

## What Hermes does after

Hermes pulls the result and checks it locally. Hermes does not re-plan the task inside the brief.

## Repos this handoff requires

One repo per task: the GitHub repo the work is in. The brief is committed and pushed to that repo. Qwen Code has to be opened on that same repo.

Today that repo is:

- https://github.com/xaelistic/EverDream

Qwen Code's only saved project on this PC is the local clone at `C:\Users\xaeli\Documents\GitHub\EDI\EverDream`, which is that same remote. That clone is 42 commits behind `origin/main` and has local edits. Do not use it as the place Hermes pushes from. Hermes pushes from `C:\Users\xaeli\Documents\GitHub\EverDream`, whose git root is that folder and whose `main` matches `origin/main`.

No second repo is required for the handoff. There is no briefs repo, no comms repo, and no need to put the brief in the Qwen Code or Hermes tool forks.

## Other GitHub repos

These are separate projects. A task in one of them needs its own brief in that repo. A brief in EverDream does not reach them.

Project repos:

- https://github.com/xaelistic/everdream_website
- https://github.com/xaelistic/everdream-mobile
- https://github.com/xaelistic/mobile-app-v2
- https://github.com/xaelistic/everdream-contracts
- https://github.com/xaelistic/everdream-bot
- https://github.com/xaelistic/deam-journal
- https://github.com/xaelistic/realize-imagination (private)
- https://github.com/xaelistic/game-tycoon (private)
- https://github.com/xaelistic/agentic-ebay (private)
- https://github.com/xaelistic/sleep-whispers-flow (private)
- https://github.com/xaelistic/ED.App (private)
- https://github.com/xaelistic/xaeli_main (private)
- https://github.com/xaelistic/Docker (private)

Not part of this handoff. Tool forks and unrelated clones. Do not put briefs here:

- https://github.com/xaelistic/qwen-code
- https://github.com/xaelistic/hermes-agent
- https://github.com/xaelistic/yagpdb
- https://github.com/xaelistic/line-bot-sdk-python
- https://github.com/xaelistic/bittensor-tao
- https://github.com/xaelistic/clickup
- https://github.com/xaelistic/DYNA_OS
- https://github.com/xaelistic/multi-container-app

## Do not commit from C:\

`C:\` is a git repo whose origin is `https://github.com/xaelistic/EverDream.git`. The OPS vault and `Documents\GitHub\DEV\DEV` resolve to that root. A commit from either of those folders can stage the drive. Briefs are written only inside a repo whose git root is that repo's own folder.
