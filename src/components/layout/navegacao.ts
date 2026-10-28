import {
  BarChart3,
  Briefcase,
  Clock,
  ImagePlus,
  PackagePlus,
  PenLine,
  Image,
  LineChart,
  MessagesSquare,
  Newspaper,
  Package,
  ShoppingBag,
  Ticket,
  CheckSquare,
  CreditCard,
  FileText,
  Folder,
  FolderKanban,
  Globe,
  Home,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Library,
  ListChecks,
  Megaphone,
  MessageSquarePlus,
  Settings,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { ModuloSite } from "@/lib/sitesCliente";

export type ItemMenu = {
  rotulo: string;
  para: string;
  icone: LucideIcon;
  exato?: boolean;
  /** Tela ainda não construída: o menu mostra "Em breve". */
  emBreve?: boolean;
  /** Número ao lado do nome (contas do banco). */
  contador?: "tarefas_atrasadas";
};
export type GrupoMenu = { titulo: string | null; itens: ItemMenu[] };

/** Menu do operador, agrupado como na proposta 2 (16/10). */
export const menuOperador: GrupoMenu[] = [
  {
    titulo: null,
    itens: [
      { rotulo: "Painel", para: "/app", icone: LayoutDashboard, exato: true },
      // Central de Tarefas (TA-3): logo abaixo do Painel, fora de "Entregar" (há tarefas internas).
      { rotulo: "Tarefas", para: "/app/tarefas", icone: ListChecks, contador: "tarefas_atrasadas" },
    ],
  },
  {
    titulo: "Vender",
    itens: [
      { rotulo: "Funil de vendas", para: "/app/pipeline", icone: KanbanSquare },
      { rotulo: "Clientes", para: "/app/clientes", icone: Users },
      { rotulo: "Reuniões", para: "/app/reunioes", icone: Video },
      { rotulo: "Propostas", para: "/app/propostas", icone: FileText },
      { rotulo: "Tráfego pago", para: "/app/trafego", icone: Megaphone },
      // CMS-2: artigos e imagens do site (só o dono; a área /app já exige o papel)
      { rotulo: "Conteúdo do site", para: "/app/site", icone: Globe },
    ],
  },
  {
    titulo: "Entregar",
    itens: [
      { rotulo: "Projetos", para: "/app/projetos", icone: FolderKanban },
      { rotulo: "Pedidos de ajuste", para: "/app/pedidos", icone: Inbox },
    ],
  },
  {
    titulo: "Biblioteca",
    itens: [{ rotulo: "Materiais", para: "/app/materiais", icone: Library }],
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
export type SecaoPortal = ItemMenu & {
  selo?: "inicio" | "aprovacoes" | "pagamentos" | "arquivos" | "contatos";
  /** Nome por extenso no menu do computador (o celular usa o rótulo curto). */
  rotuloLongo?: string;
  /** Só para o responsável pelo contrato (CX-0). A equipe vê 4 abas. */
  soResponsavel?: true;
};

export const menuPortal: SecaoPortal[] = [
  { rotulo: "Início", para: "/portal", icone: Home, exato: true, selo: "inicio" },
  { rotulo: "Aprovações", para: "/portal/aprovacoes", icone: CheckSquare, selo: "aprovacoes" },
  {
    rotulo: "Pedidos",
    rotuloLongo: "Pedidos de ajuste",
    para: "/portal/pedidos",
    icone: MessageSquarePlus,
  },
  {
    rotulo: "Pagamentos",
    para: "/portal/pagamentos",
    icone: CreditCard,
    selo: "pagamentos",
    soResponsavel: true,
  },
  { rotulo: "Arquivos", para: "/portal/arquivos", icone: Folder, selo: "arquivos" },
];

/** Abas que este perfil vê. Sem perfil ainda (carregando), Pagamentos fica de fora. */
export function secoesDoPortal(perfil: "responsavel" | "equipe" | null): SecaoPortal[] {
  return menuPortal.filter((s) => !s.soResponsavel || perfil === "responsavel");
}

export type GrupoPortal = { titulo: string | null; itens: SecaoPortal[] };

const foraDoPapel: SecaoPortal[] = [
  { rotulo: "Aprovações", para: "/portal/aprovacoes", icone: CheckSquare, selo: "aprovacoes" },
  { rotulo: "Pedidos de ajuste", para: "/portal/pedidos", icone: MessageSquarePlus },
  {
    rotulo: "Pagamentos",
    para: "/portal/pagamentos",
    icone: CreditCard,
    selo: "pagamentos",
    soResponsavel: true,
  },
  { rotulo: "Arquivos", para: "/portal/arquivos", icone: Folder, selo: "arquivos" },
];

/**
 * Menu do painel do cliente (card PC-1): um menu por tarefa, montado pelos módulos do site.
 * Sem site ligado (ou se a leitura falhar): só Início, Fora do Papel e Ajustes.
 * Telas dos cards PC-3 a PC-6 aparecem com "Em breve" até existirem.
 */
export function gruposDoPortal(
  perfil: "responsavel" | "equipe" | null,
  modulos: ModuloSite[] | null,
): GrupoPortal[] {
  const tem = (m: ModuloSite) => modulos?.includes(m) ?? false;
  const grupos: GrupoPortal[] = [
    {
      titulo: null,
      itens: [{ rotulo: "Início", para: "/portal", icone: Home, exato: true, selo: "inicio" }],
    },
  ];
  if (modulos) {
    const site: SecaoPortal[] = [];
    if (tem("paginas"))
      site.push({
        rotulo: "Páginas",
        para: "/portal/site/paginas",
        icone: FileText,
      });
    if (tem("artigos"))
      site.push({
        rotulo: "Artigos",
        para: "/portal/site/artigos",
        icone: Newspaper,
      });
    if (tem("portfolio"))
      site.push({
        rotulo: "Portfólio",
        para: "/portal/site/portfolio",
        icone: Briefcase,
        emBreve: true,
      });
    site.push({
      rotulo: "Fotos e arquivos",
      para: "/portal/site/fotos",
      icone: Image,
    });
    grupos.push({ titulo: "Meu site", itens: site });
    if (tem("loja"))
      grupos.push({
        titulo: "Loja",
        itens: [
          { rotulo: "Produtos", para: "/portal/loja/produtos", icone: Package, emBreve: true },
          { rotulo: "Vendas", para: "/portal/loja/vendas", icone: ShoppingBag, emBreve: true },
          { rotulo: "Cupons", para: "/portal/loja/cupons", icone: Ticket, emBreve: true },
        ],
      });
    const clientes: SecaoPortal[] = [];
    if (tem("contatos"))
      clientes.push({
        rotulo: "Contatos",
        para: "/portal/clientes/contatos",
        icone: MessagesSquare,
        selo: "contatos",
      });
    clientes.push({
      rotulo: "Desempenho",
      para: "/portal/desempenho",
      icone: LineChart,
      emBreve: true,
    });
    grupos.push({ titulo: "Clientes", itens: clientes });
  }
  grupos.push({
    titulo: "Fora do Papel",
    itens: foraDoPapel.filter((s) => !s.soResponsavel || perfil === "responsavel"),
  });
  grupos.push({
    titulo: null,
    itens: [{ rotulo: "Ajustes", para: "/portal/ajustes", icone: Settings, emBreve: true }],
  });
  return grupos;
}

export type AcaoRapida = {
  id: "capa" | "produto" | "artigo" | "horario" | "pedido";
  rotulo: string;
  icone: LucideIcon;
  emBreve?: true;
};

/**
 * Ações rápidas do Início e do botão "Criar" (card PC-1), pelos módulos do site.
 * "Pedir um ajuste" vem primeiro; "Escrever artigo" (PC-3) e "Trocar foto da capa" (PC-4) já funcionam.
 */
export function acoesRapidas(modulos: ModuloSite[] | null): AcaoRapida[] {
  const acoes: AcaoRapida[] = [
    { id: "pedido", rotulo: "Pedir um ajuste", icone: MessageSquarePlus },
  ];
  if (modulos?.includes("paginas"))
    acoes.push({ id: "capa", rotulo: "Trocar foto da capa", icone: ImagePlus });
  if (modulos?.includes("loja"))
    acoes.push({ id: "produto", rotulo: "Novo produto", icone: PackagePlus, emBreve: true });
  if (modulos?.includes("artigos"))
    acoes.push({ id: "artigo", rotulo: "Escrever artigo", icone: PenLine });
  if (modulos)
    acoes.push({
      id: "horario",
      rotulo: "Mudar horário de atendimento",
      icone: Clock,
      emBreve: true,
    });
  return acoes;
}
