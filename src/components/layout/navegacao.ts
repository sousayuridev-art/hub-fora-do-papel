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
  Megaphone,
  MessageSquarePlus,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ItemMenu = { rotulo: string; para: string; icone: LucideIcon; exato?: boolean };
export type GrupoMenu = { titulo: string | null; itens: ItemMenu[] };

/** Menu do operador, agrupado exatamente como no protótipo aprovado. */
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
      { rotulo: "Propostas", para: "/app/propostas", icone: FileText },
      { rotulo: "Tráfego pago", para: "/app/trafego", icone: Megaphone },
    ],
  },
  {
    titulo: "Entregar",
    itens: [
      { rotulo: "Projetos", para: "/app/projetos", icone: FolderKanban },
      { rotulo: "Pedidos", para: "/app/pedidos", icone: Inbox },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { rotulo: "Financeiro", para: "/app/financeiro", icone: Wallet },
      { rotulo: "Relatórios", para: "/app/relatorios", icone: BarChart3 },
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
