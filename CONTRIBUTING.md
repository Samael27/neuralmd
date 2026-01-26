# Contributing to NeuralMD

First off, thanks for taking the time to contribute! 🎉

## How Can I Contribute?

### Reporting Bugs

- Check if the bug has already been reported in [Issues](https://github.com/Samael27/neuralmd/issues)
- If not, create a new issue with:
  - Clear title and description
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment details (OS, Docker version, etc.)

### Suggesting Features

- Open an issue with the `enhancement` label
- Describe the use case and why it would be useful
- Be open to discussion about implementation approaches

### Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test locally with `docker compose up`
5. Commit with clear messages (`git commit -m 'feat: add amazing feature'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/neuralmd.git
cd neuralmd

# Copy environment file
cp .env.example .env

# Start development environment
docker compose up -d

# Or run locally (requires Node.js 20+)
npm install --legacy-peer-deps
npm run dev
```

## Code Style

- TypeScript for all new code
- Use existing patterns in the codebase
- Keep components small and focused
- Add types for all function parameters and returns

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `style:` formatting, no code change
- `refactor:` code change that neither fixes a bug nor adds a feature
- `test:` adding or updating tests
- `chore:` maintenance tasks

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── api/          # API routes
│   ├── notes/        # Notes UI pages
│   └── graph/        # Graph visualization
├── components/       # React components
├── lib/              # Utilities and helpers
│   └── embeddings/   # Embedding providers (Ollama, OpenAI)
└── mcp/              # MCP server implementation
```

## Need Help?

- Open an issue with your question
- Check existing issues and discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
