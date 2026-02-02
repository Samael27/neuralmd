import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.png" alt="NeuralMD" className="w-16 h-16 rounded-full" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
              NeuralMD
            </h1>
          </div>
          <p className="text-xl text-gray-400 mb-6">
            AI-Native Knowledge Base with Semantic Connections
          </p>
          <Link
            href="/notes"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            📝 Accéder aux notes
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-lg font-semibold mb-2">Markdown First</h3>
            <p className="text-gray-400 text-sm">
              Write in plain markdown. Simple, portable, AI-friendly.
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold mb-2">Semantic Search</h3>
            <p className="text-gray-400 text-sm">
              Find notes by meaning, not just keywords. Powered by embeddings.
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-lg font-semibold mb-2">MCP Ready</h3>
            <p className="text-gray-400 text-sm">
              Connect your AI assistant directly via Model Context Protocol.
            </p>
          </div>
        </div>

        {/* API Info */}
        <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">🚀 Quick Start</h2>
          <div className="space-y-4 font-mono text-sm">
            <div>
              <span className="text-gray-500"># Create a note</span>
              <pre className="bg-gray-900 p-3 rounded mt-1 overflow-x-auto">
{`curl -X POST http://localhost:3000/api/notes \\
  -H "Content-Type: application/json" \\
  -d '{"title": "My First Note", "content": "Hello NeuralMD!"}'`}
              </pre>
            </div>
            <div>
              <span className="text-gray-500"># Semantic search</span>
              <pre className="bg-gray-900 p-3 rounded mt-1 overflow-x-auto">
{`curl -X POST http://localhost:3000/api/search \\
  -H "Content-Type: application/json" \\
  -d '{"query": "what did I learn about AI?"}'`}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Open Source • Self-Hosted • AI-Native</p>
          <p className="mt-2">
            <a href="https://github.com/Samael27/neuralmd" className="text-blue-400 hover:underline">
              GitHub
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
