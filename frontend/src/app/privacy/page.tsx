import React from 'react';

export default function PrivacyPage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-3xl font-mono">
      <h1 className="text-sm font-bold mb-6 text-green-400 uppercase tracking-wider">[PRIVACY_POLICY]</h1>
      <p className="mb-4 text-xs text-gray-400">Esta Política de Privacidade descreve como a DevGuard AI coleta, utiliza, armazena e protege as informações dos usuários em nossa plataforma de análise de segurança para aplicações web.</p>
      <h2 className="text-xs font-semibold mt-8 mb-2 text-green-400">// 1. Informações Coletadas</h2>
      <ul className="list-none ml-0 mb-4 space-y-1">
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> <b className="text-gray-400">Dados de autenticação:</b> Utilizamos o login via Google/Firebase para autenticação. Apenas informações essenciais (nome, e-mail, foto) são armazenadas.</li>
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> <b className="text-gray-400">Dados de uso:</b> Coletamos logs de uso, resultados de scans, relatórios e interações para melhorar o serviço.</li>
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> <b className="text-gray-400">Pagamentos:</b> Dados de pagamento são processados via Mercado Pago. Não armazenamos dados sensíveis de cartão.</li>
      </ul>
      <h2 className="text-xs font-semibold mt-8 mb-2 text-green-400">// 2. Uso das Informações</h2>
      <ul className="list-none ml-0 mb-4 space-y-1">
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> Fornecer e aprimorar os serviços de análise de segurança.</li>
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> Gerar relatórios automáticos e históricos de scans.</li>
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> Gerenciar assinaturas e pagamentos.</li>
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> Garantir a segurança e integridade da plataforma.</li>
      </ul>
      <h2 className="text-xs font-semibold mt-8 mb-2 text-green-400">// 3. Compartilhamento</h2>
      <ul className="list-none ml-0 mb-4 space-y-1">
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> Não compartilhamos dados pessoais com terceiros, exceto quando exigido por lei ou para processar pagamentos.</li>
      </ul>
      <h2 className="text-xs font-semibold mt-8 mb-2 text-green-400">// 4. Segurança</h2>
      <ul className="list-none ml-0 mb-4 space-y-1">
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> Utilizamos criptografia, autenticação forte e práticas modernas para proteger seus dados.</li>
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> O acesso aos dados é restrito à equipe autorizada.</li>
      </ul>
      <h2 className="text-xs font-semibold mt-8 mb-2 text-green-400">// 5. Direitos do Usuário</h2>
      <ul className="list-none ml-0 mb-4 space-y-1">
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> Você pode solicitar a exclusão ou atualização de seus dados a qualquer momento.</li>
        <li className="text-xs text-gray-500"><span className="text-green-500">[+]</span> Entre em contato pelo suporte para exercer seus direitos.</li>
      </ul>
      <h2 className="text-xs font-semibold mt-8 mb-2 text-green-400">// 6. Alterações</h2>
      <p className="mb-4 text-xs text-gray-500">Esta política pode ser atualizada periodicamente. Notificaremos os usuários sobre mudanças relevantes.</p>
      <p className="text-[10px] text-gray-700 mt-8">// last_updated: 2026-04-19</p>
    </main>
  );
}
