const messages: Record<string, string> = {
  created: "Empresa cadastrada.",
  linked: "Usuário vinculado como CLIENTE.",
  removed: "Vínculo removido. O usuário Auth e os demais vínculos foram preservados.",
  "invalid-name": "Informe um nome de empresa entre 1 e 160 caracteres após remover espaços nas extremidades.",
  "invalid-id": "Informe um UUID válido.",
  duplicate: "Este usuário já está vinculado à empresa.",
  "not-found": "Usuário ou empresa não encontrado. Confira o UUID informado.",
  "confirmation-required": "Confirme a remoção do vínculo antes de continuar.",
  unavailable: "Registro indisponível ou sem acesso. Atualize a página.",
  failed: "Não foi possível concluir a operação. Tente novamente.",
};

export function AdminFeedback({ status }: { status?: string }) {
  if (!status || !Object.hasOwn(messages, status)) return null;
  const success = ["created", "linked", "removed"].includes(status);
  return <p role={success ? "status" : "alert"} className={`mb-6 rounded-lg border bg-white p-4 text-sm ${success ? "border-teal-200 text-teal-900" : "border-red-200 text-red-800"}`}>{messages[status]}</p>;
}
