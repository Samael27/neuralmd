# Changelog

All notable changes to NeuralMD will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Virtual folders via tag naming convention (`parent/child`)
- Markdown editor with toolbar and preview toggle
- Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+K, etc.)
- Markdown rendering with GFM support
- API key management via admin endpoint
- UI Basic Auth (optional)
- MCP protocol support for AI assistants
- Semantic search powered by pgvector
- Auto-connection discovery between notes

### Changed
- Improved Docker Compose setup for Coolify deployment
- Better healthchecks for production

### Fixed
- Server Actions for UI mutations (401 errors)
- Docker build context size (added .dockerignore)

## [0.1.0] - 2026-01-26

### Added
- Initial release
- Note CRUD operations
- Tag-based organization
- Semantic embeddings via Ollama (nomic-embed-text)
- PostgreSQL + pgvector storage
- REST API with authentication
- Docker Compose deployment
- Self-hosted, privacy-first design

---

[Unreleased]: https://github.com/Samael27/neuralmd/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Samael27/neuralmd/releases/tag/v0.1.0
