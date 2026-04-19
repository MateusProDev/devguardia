import React from 'react';

export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Termos de Uso</h1>
      <p className="mb-4">Estes Termos de Uso regem o acesso e uso da plataforma DevGuard AI, um serviço SaaS de análise de segurança para aplicações web.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">1. Aceitação dos Termos</h2>
      <p className="mb-4">Ao utilizar a DevGuard AI, você concorda com estes termos e com a Política de Privacidade.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">2. Cadastro e Acesso</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>O acesso é realizado via autenticação Google/Firebase.</li>
        <li>Você deve fornecer informações verdadeiras e manter seus dados atualizados.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">3. Uso da Plataforma</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>O serviço destina-se à análise de segurança de aplicações web de sua propriedade ou com autorização.</li>
        <li>É proibido utilizar a plataforma para fins ilícitos ou sem consentimento do proprietário do alvo analisado.</li>
        <li>O usuário é responsável pelo uso correto das funcionalidades.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">4. Pagamentos e Assinaturas</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>Os pagamentos são processados via Mercado Pago.</li>
        <li>Planos, valores e condições estão disponíveis na área de assinaturas.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">5. Limitações e Responsabilidades</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>A DevGuard AI não garante que todos os riscos de segurança serão identificados.</li>
        <li>Não nos responsabilizamos por danos decorrentes do uso inadequado da plataforma.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">6. Propriedade Intelectual</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>O código, marca e conteúdos da DevGuard AI são protegidos por direitos autorais.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">7. Alterações nos Termos</h2>
      <p className="mb-4">Podemos atualizar estes termos periodicamente. Mudanças relevantes serão comunicadas aos usuários.</p>
      <p className="text-sm text-gray-500 mt-8">Última atualização: 19 de abril de 2026</p>
    </main>
  );
}
