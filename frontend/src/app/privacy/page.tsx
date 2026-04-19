import React from 'react';

export default function PrivacyPage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
      <p className="mb-4">Esta Política de Privacidade descreve como a DevGuard AI coleta, utiliza, armazena e protege as informações dos usuários em nossa plataforma de análise de segurança para aplicações web.</p>
      <h2 className="text-xl font-semibold mt-8 mb-2">1. Informações Coletadas</h2>
      <ul className="list-disc ml-6 mb-4">
        <li><b>Dados de autenticação:</b> Utilizamos o login via Google/Firebase para autenticação. Apenas informações essenciais (nome, e-mail, foto) são armazenadas.</li>
        <li><b>Dados de uso:</b> Coletamos logs de uso, resultados de scans, relatórios e interações para melhorar o serviço.</li>
        <li><b>Pagamentos:</b> Dados de pagamento são processados via Mercado Pago. Não armazenamos dados sensíveis de cartão.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">2. Uso das Informações</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>Fornecer e aprimorar os serviços de análise de segurança.</li>
        <li>Gerar relatórios automáticos e históricos de scans.</li>
        <li>Gerenciar assinaturas e pagamentos.</li>
        <li>Garantir a segurança e integridade da plataforma.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">3. Compartilhamento</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>Não compartilhamos dados pessoais com terceiros, exceto quando exigido por lei ou para processar pagamentos.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">4. Segurança</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>Utilizamos criptografia, autenticação forte e práticas modernas para proteger seus dados.</li>
        <li>O acesso aos dados é restrito à equipe autorizada.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">5. Direitos do Usuário</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>Você pode solicitar a exclusão ou atualização de seus dados a qualquer momento.</li>
        <li>Entre em contato pelo suporte para exercer seus direitos.</li>
      </ul>
      <h2 className="text-xl font-semibold mt-8 mb-2">6. Alterações</h2>
      <p className="mb-4">Esta política pode ser atualizada periodicamente. Notificaremos os usuários sobre mudanças relevantes.</p>
      <p className="text-sm text-gray-500 mt-8">Última atualização: 19 de abril de 2026</p>
    </main>
  );
}
