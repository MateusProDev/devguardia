import React from 'react';

export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-3xl font-mono">
      <h1 className="text-sm font-bold mb-6 text-green-400 uppercase tracking-wider">[TERMS_OF_SERVICE]</h1>
      <p className="mb-4 text-xs text-gray-400">Estes Termos de Uso regem o acesso e uso da plataforma DevGuard AI, um serviço de análise de segurança para aplicações web.</p>
      <h2 className="text-xs font-semibold mt-8 mb-2 text-green-400">// 1. Aceitação dos Termos</h2>
      <p className="mb-4 text-xs text-gray-500">Ao utilizar a DevGuard AI, você concorda com estes termos e com a Política de Privacidade.</p>
      <h2 className="text-xs font-semibold mt-8 mb-2 text-green-400">// 2. Cadastro e Acesso</h2>
      <ul className="list-none ml-0 mb-4 space-y-1">
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> O acesso é realizado via autenticação Google/Firebase.</li>
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> Você deve fornecer informações verdadeiras e manter seus dados atualizados.</li>
      </ul>
      <h2 className="text-xs font-semibold mt-8 mb-2 text-green-400">// 3. Uso da Plataforma</h2>
      <ul className="list-none ml-0 mb-4 space-y-1">
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> O serviço destina-se à análise de segurança de aplicações web de sua propriedade ou com autorização.</li>
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> É proibido utilizar a plataforma para fins ilícitos ou sem consentimento do proprietário do alvo analisado.</li>
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> O usuário é responsável pelo uso correto das funcionalidades.</li>
      </ul>
      <h2 className="text-xs font-semibold mt-8 mb-2 text-green-400">// 4. Pagamentos e Assinaturas</h2>
      <ul className="list-none ml-0 mb-4 space-y-1">
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> Os pagamentos são processados via Mercado Pago.</li>
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> Planos, valores e condições estão disponíveis na área de assinaturas.</li>
      </ul>
      <h2 className="text-xs font-semibold mt-8 mb-2 text-green-400">// 5. Limitações e Responsabilidades</h2>
      <ul className="list-none ml-0 mb-4 space-y-1">
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> A DevGuard AI não garante que todos os riscos de segurança serão identificados.</li>
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> Não nos responsabilizamos por danos decorrentes do uso inadequado da plataforma.</li>
      </ul>
      <h2 className="text-xs font-semibold mt-8 mb-2 text-green-400">// 6. Propriedade Intelectual</h2>
      <ul className="list-none ml-0 mb-4 space-y-1">
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> O código, marca e conteúdos da DevGuard AI são protegidos por direitos autorais.</li>
      </ul>
      <h2 className="text-xs font-semibold mt-8 mb-2 text-green-400">// 7. Alterações nos Termos</h2>
      <p className="mb-4 text-xs text-gray-500">Podemos atualizar estes termos periodicamente. Mudanças relevantes serão comunicadas aos usuários.</p>
      <p className="text-[10px] text-gray-700 mt-8">// last_updated: 2026-04-19</p>
    </main>
  );
}
