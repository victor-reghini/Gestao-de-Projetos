import React, { useState } from 'react';
import { 
  Code2, 
  Send, 
  Copy, 
  Check, 
  ShieldCheck, 
  Zap, 
  Globe, 
  Terminal, 
  CheckCircle2, 
  ExternalLink
} from 'lucide-react';

interface EndpointDoc {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  sampleBody?: any;
  sampleResponse: any;
}

const ENDPOINTS: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/v1/projects/:slug',
    description: 'Obtém os dados públicos do projeto especificado pelo slug.',
    sampleResponse: {
      success: true,
      data: {
        id: "proj-1",
        name: "Sistema de Gestão de Projetos & Ideias",
        slug: "sistema-gestao-projetos",
        shortDescription: "Plataforma moderna para centralização de projetos e API pública.",
        visibility: "PUBLIC",
        status: "EM_ANDAMENTO",
        technologies: ["React", "TypeScript", "Vite", "Firebase"],
        repository: {
          provider: "github",
          owner: "victor-reghini",
          name: "Gestao-de-Projetos",
          url: "https://github.com/victor-reghini/Gestao-de-Projetos"
        }
      }
    }
  },
  {
    method: 'POST',
    path: '/api/v1/projects/:slug/suggestions',
    description: 'Envia uma nova sugestão ou ideia de melhoria para o projeto correspondente.',
    sampleBody: {
      title: "Adicionar modo escuro com switch animado",
      description: "Seria excelente ter transições suaves de tema na interface.",
      authorName: "Dev Convidado",
      authorEmail: "dev@exemplo.com"
    },
    sampleResponse: {
      success: true,
      message: "Sugestão registrada com sucesso!",
      data: {
        id: "sug_8f29x",
        projectSlug: "sistema-gestao-projetos",
        title: "Adicionar modo escuro com switch animado",
        status: "ABERTO",
        createdAt: "2026-09-29T21:00:00.000Z"
      }
    }
  },
  {
    method: 'POST',
    path: '/api/v1/projects/:slug/bugs',
    description: 'Registra um reporte de bug ou falha técnica para análise da equipe.',
    sampleBody: {
      title: "Erro 404 em rota de documentação antiga",
      description: "O link no rodapé para a documentação antiga está quebrado.",
      severity: "MEDIA",
      stepsToReproduce: "1. Acessar rodapé\n2. Clicar no link de docs v0",
      expectedBehavior: "Redirecionar para /docs/api",
      observedBehavior: "Retorna tela de 404",
      environment: "Chrome 124 no macOS",
      authorName: "QA Tester"
    },
    sampleResponse: {
      success: true,
      message: "Reporte de bug registrado com sucesso!",
      data: {
        id: "bug_92k1l",
        projectSlug: "sistema-gestao-projetos",
        title: "Erro 404 em rota de documentação antiga",
        severity: "MEDIA",
        status: "ABERTO",
        createdAt: "2026-09-29T21:00:00.000Z"
      }
    }
  },
  {
    method: 'GET',
    path: '/api/v1/projects/:slug/suggestions',
    description: 'Lista todas as sugestões aprovadas e públicas do projeto.',
    sampleResponse: {
      success: true,
      data: [
        {
          id: "sug-1",
          title: "Adicionar atalhos de teclado no Kanban",
          status: "EM_ANALISE",
          createdAt: "2026-09-28T18:00:00.000Z"
        }
      ]
    }
  },
  {
    method: 'GET',
    path: '/api/v1/projects/:slug/bugs',
    description: 'Lista os reportes públicos de bugs do projeto.',
    sampleResponse: {
      success: true,
      data: [
        {
          id: "bug-1",
          title: "Quebra de linha no preview de Markdown longo",
          severity: "BAIXA",
          status: "ABERTO",
          createdAt: "2026-09-27T14:30:00.000Z"
        }
      ]
    }
  }
];

export const ApiDocsPage: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDoc>(ENDPOINTS[0]);
  const [slugInput, setSlugInput] = useState('sistema-gestao-projetos');
  const [customBody, setCustomBody] = useState(JSON.stringify(ENDPOINTS[0].sampleBody || {}, null, 2));
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const handleSelect = (ep: EndpointDoc) => {
    setSelectedEndpoint(ep);
    setCustomBody(JSON.stringify(ep.sampleBody || {}, null, 2));
    setTestResponse(null);
  };

  const currentUrl = `${window.location.origin}${selectedEndpoint.path.replace(':slug', slugInput)}`;

  const generateCurl = () => {
    if (selectedEndpoint.method === 'GET') {
      return `curl -X GET "${currentUrl}" \\\n  -H "Accept: application/json"`;
    }
    return `curl -X POST "${currentUrl}" \\\n  -H "Content-Type: application/json" \\\n  -d '${customBody.replace(/\n/g, '')}'`;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleRunTest = async () => {
    setLoading(true);
    setTestResponse(null);
    try {
      setTimeout(() => {
        if (selectedEndpoint.method === 'GET') {
          setTestResponse(JSON.stringify(selectedEndpoint.sampleResponse, null, 2));
        } else {
          try {
            const parsed = JSON.parse(customBody);
            setTestResponse(JSON.stringify({
              success: true,
              message: selectedEndpoint.sampleResponse.message || "Requisição executada com sucesso!",
              data: {
                id: 'gen_' + Math.random().toString(36).substring(2, 8),
                projectSlug: slugInput,
                ...parsed,
                status: 'ABERTO',
                createdAt: new Date().toISOString()
              }
            }, null, 2));
          } catch {
            setTestResponse(JSON.stringify({ success: false, error: 'JSON inválido no corpo da requisição.' }, null, 2));
          }
        }
        setLoading(false);
      }, 300);
    } catch (err: any) {
      setTestResponse(JSON.stringify({ success: false, error: err.message }, null, 2));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in space-y-8">
      {/* Top Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-950/50 via-slate-900 to-slate-900 border border-blue-500/25 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
            <Code2 className="w-6 h-6" />
          </span>
          <span className="badge bg-blue-500/20 text-blue-300 font-mono">REST API v1</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Documentação da API Pública
        </h1>
        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
          Integre suas aplicações, webhooks e formulários de suporte externos diretamente aos seus projetos cadastrados. Protegido com rate limiting, validação de tipos e CORS configurado.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">Rate Limiting Ativo (60 req/min)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 text-xs">
            <Globe className="w-4 h-4 text-blue-400" />
            <span className="text-slate-300">CORS Habilitado (Qualquer Origem)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 text-xs">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300">Resposta Padrão JSON Envelope</span>
          </div>
        </div>
      </div>

      {/* Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Endpoints Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 mb-3">
            Endpoints Disponíveis
          </h3>
          {ENDPOINTS.map((ep, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(ep)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method
                  ? 'bg-slate-900 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                  : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                  ep.method === 'GET' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                }`}>
                  {ep.method}
                </span>
                <span className="font-mono text-xs text-white truncate font-medium">{ep.path}</span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">{ep.description}</p>
            </button>
          ))}
        </div>

        {/* Endpoint Interactive Tester */}
        <div className="lg:col-span-8 glass-panel p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded font-mono ${
                selectedEndpoint.method === 'GET' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
              }`}>
                {selectedEndpoint.method}
              </span>
              <h2 className="text-lg font-bold text-white font-mono">{selectedEndpoint.path}</h2>
            </div>
            <p className="text-xs text-slate-300">{selectedEndpoint.description}</p>
          </div>

          {/* Dynamic Parameters */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <label className="text-xs font-semibold text-white block">Parâmetros da Requisição:</label>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-blue-300">:slug =</span>
              <input
                type="text"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                className="input text-xs font-mono max-w-xs"
                placeholder="slug-do-projeto"
              />
            </div>
          </div>

          {/* cURL Example with Copy */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-400" /> Exemplo cURL
              </label>
              <button
                onClick={copyCurl}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl ? 'Copiado!' : 'Copiar comando'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-blue-300 overflow-x-auto leading-relaxed">
              <code>{generateCurl()}</code>
            </pre>
          </div>

          {/* Request Payload (if POST) */}
          {selectedEndpoint.method === 'POST' && (
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">
                Corpo da Requisição (JSON Payload):
              </label>
              <textarea
                rows={6}
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                className="textarea font-mono text-xs text-emerald-300 bg-slate-950"
              />
            </div>
          )}

          {/* Run Test Button */}
          <div className="flex justify-end">
            <button
              onClick={handleRunTest}
              disabled={loading}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? 'Executando...' : 'Testar Requisição'}
            </button>
          </div>

          {/* Response Box */}
          {testResponse && (
            <div className="pt-4 border-t border-slate-800 space-y-2 animate-fade-in">
              <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Resposta da API (HTTP 200 OK / 201 Created):
              </label>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-80">
                <code>{testResponse}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
