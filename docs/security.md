# Security Notes

Security is enforced on the backend. Frontend checks are convenience only.

## Required Controls

- API keys and credentials must never be returned to the frontend.
- Stored secrets must be encrypted before persistence.
- Passwords must be hashed.
- Input from the frontend must be validated by backend controllers or DTOs.
- Dangerous tool permissions require explicit approval:
  - `shell:execute`
  - `docker:execute`
  - `filesystem:delete`
  - `git:push`

## Current Baseline

The scaffold includes the approval boundary in `ToolEngineService`. Secret encryption, authentication, persistence repositories, and DTO validation should be completed before production use.
