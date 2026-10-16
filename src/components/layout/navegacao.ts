import {
  BarChart3,
  CheckSquare,
  CreditCard,
  FileText,
  Folder,
  FolderKanban,
  Home,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Library,
  Megaphone,
  MessageSquarePlus,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ItemMenu = {
  rotulo: string;
  para: string;
  icone: LucideIcon;
  exato?: boolean;
  /** Tela ainda não construída: o menu mostra "Em breve". */
  emBreve?: boolean;
};
export type GrupoMenu = { titulo: string | null; itens: ItemMenu[] };

/** Menu do operador, agrupado como na proposta 2 (16/10). */
export const menuOperador: GrupoMenu[] = [
  {
    titulo: null,
    itens: [{ rotulo: "Painel", para: "/app", icone: LayoutDashboard, exato: true }],
  },
  {
    titulo: "Vender",
    itens: [
      { rotulo: "Pipeline", para: "/app/pipeline", icone: KanbanSquare },
      { rotulo: "Clientes", para: "/app/clientes", icone: Users },
      { rotulo: "Propostas", para: "/app/propostas", icone: FileText, emBreve: true },
      { rotulo: "Tráfego pago", para: "/app/trafego", icone: Megaphone, emBreve: true },
    ],
  },
  {
    titulo: "Entregar",
    itens: [
      { rotulo: "Projetos", para: "/app/projetos", icone: FolderKanban, emBreve: true },
      { rotulo: "Pedidos", para: "/app/pedidos", icone: Inbox, emBreve: true },
    ],
  },
  {
    titulo: "Biblioteca",
    itens: [{ rotulo: "Materiais", para: "/app/materiais", icone: Library, emBreve: true }],
  },
  {
    titulo: "Gestão",
    itens: [
      { rotulo: "Financeiro", para: "/app/financeiro", icone: Wallet, emBreve: true },
      { rotulo: "Relatórios", para: "/app/relatorios", icone: BarChart3, emBreve: true },
    ],
  },
];

export const itemConfiguracoes: ItemMenu = {
  rotulo: "Configurações",
  para: "/app/configuracoes",
  icone: Settings,
};

/** Seções do portal do cliente (menu de cima no computador, abas embaixo no celular). */
export type SecaoPortal = ItemMenu & { selo?: "aprovacoes" | "arquivos" };

export const menuPortal: SecaoPortal[] = [
  { rotulo: "Início", para: "/portal", icone: Home, exato: true },
  { rotulo: "Aprovações", para: "/portal/aprovacoes", icone: CheckSquare, selo: "aprovacoes" },
  { rotulo: "Pedidos", para: "/portal/pedidos", icone: MessageSquarePlus },
  { rotulo: "Pagamentos", para: "/portal/pagamentos", icone: CreditCard },
  { rotulo: "Arquivos", para: "/portal/arquivos", icone: Folder, selo: "arquivos" },
];
