'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Languages } from 'lucide-react';

export const LOCALES = ['en', 'es', 'fr', 'pt', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];

const NAMES: Record<Locale, string> = {
  en: 'English', es: 'Español', fr: 'Français', pt: 'Português', zh: '简体中文',
};

const copy: Record<Locale, Record<string, string>> = {
  en: {},
  es: {
    'language.label': 'Idioma', 'nav.discover': 'Descubrir', 'nav.circles': 'Círculos', 'nav.launch': 'Lanzar', 'nav.holdings': 'Activos', 'nav.stats': 'Datos', 'nav.profile': 'Tú',
    'page.discover': 'Encuentra tu próxima acción.', 'page.groups': 'Encuentra a tu gente.', 'page.launch': 'Llévalo al mercado.', 'page.create': 'Crea un meme.', 'page.holdings': 'Lo que tienes.', 'page.stats': 'En números.', 'page.profile': 'Hazlo tuyo.',
    'action.signin': 'Iniciar sesión', 'action.openApp': 'Abrir app', 'action.exploreStocks': 'Explorar acciones', 'action.findCircle': 'Encuentra tu círculo',
    'landing.tokenized': 'Acciones tokenizadas en Base', 'landing.hero1': 'Tu mundo.', 'landing.hero2': 'Tus acciones.', 'landing.heroBody': 'Descubre acciones tokenizadas en Base a través de los intereses, creadores y comunidades que sigues.', 'landing.walletNote': 'Explora primero. Conecta una cartera solo cuando vayas a operar.',
    'landing.everyStock1': 'Cada acción,', 'landing.everyStock2': 'un token en Base.', 'landing.everyStockBody': 'Explora acciones tokenizadas como AAPL y NVDA con precios onchain en vivo, memecoins comunitarias emparejadas y pools donde puedes aportar liquidez.',
    'landing.interests1': 'Intereses distintos.', 'landing.interests2': 'Curiosidad compartida.', 'landing.interestsBody': 'Encuentra a tu gente alrededor de lo que te gusta. Explora acciones, hallazgos compartidos y personalidad, siempre bajo tus términos.',
    'chat.translate': 'Traducir', 'chat.original': 'Ver original', 'chat.translating': 'Traduciendo…', 'chat.failed': 'No se pudo traducir.', 'chat.loading': 'Cargando mensajes…', 'chat.empty': 'Aún no hay mensajes — sé el primero.', 'chat.unavailable': 'Los mensajes no están disponibles ahora.', 'chat.placeholder': 'Escribe al círculo…', 'chat.send': 'Enviar',
  },
  fr: {
    'language.label': 'Langue', 'nav.discover': 'Découvrir', 'nav.circles': 'Cercles', 'nav.launch': 'Lancer', 'nav.holdings': 'Actifs', 'nav.stats': 'Données', 'nav.profile': 'Vous',
    'page.discover': 'Trouvez votre prochaine action.', 'page.groups': 'Trouvez votre communauté.', 'page.launch': 'Mettez-la sur le marché.', 'page.create': 'Créez un mème.', 'page.holdings': 'Ce que vous détenez.', 'page.stats': 'En chiffres.', 'page.profile': 'Faites-en votre espace.',
    'action.signin': 'Se connecter', 'action.openApp': 'Ouvrir l’app', 'action.exploreStocks': 'Explorer les actions', 'action.findCircle': 'Trouver votre cercle',
    'landing.tokenized': 'Actions tokenisées sur Base', 'landing.hero1': 'Votre monde.', 'landing.hero2': 'Vos actions.', 'landing.heroBody': 'Découvrez les actions tokenisées sur Base à travers les centres d’intérêt, créateurs et communautés que vous suivez.', 'landing.walletNote': 'Explorez d’abord. Connectez un portefeuille uniquement pour trader.',
    'landing.everyStock1': 'Chaque action,', 'landing.everyStock2': 'un token sur Base.', 'landing.everyStockBody': 'Explorez AAPL, NVDA et d’autres actions tokenisées avec leurs prix onchain, leurs memecoins communautaires et leurs pools de liquidité.',
    'landing.interests1': 'Des intérêts différents.', 'landing.interests2': 'Une curiosité partagée.', 'landing.interestsBody': 'Retrouvez les personnes qui partagent vos passions. Explorez actions, découvertes et communautés, toujours selon vos choix.',
    'chat.translate': 'Traduire', 'chat.original': 'Voir l’original', 'chat.translating': 'Traduction…', 'chat.failed': 'Traduction impossible.', 'chat.loading': 'Chargement des messages…', 'chat.empty': 'Aucun message — soyez le premier.', 'chat.unavailable': 'Les messages sont indisponibles.', 'chat.placeholder': 'Écrire au cercle…', 'chat.send': 'Envoyer',
  },
  pt: {
    'language.label': 'Idioma', 'nav.discover': 'Descobrir', 'nav.circles': 'Círculos', 'nav.launch': 'Lançar', 'nav.holdings': 'Ativos', 'nav.stats': 'Dados', 'nav.profile': 'Você',
    'page.discover': 'Encontre sua próxima ação.', 'page.groups': 'Encontre sua comunidade.', 'page.launch': 'Leve ao mercado.', 'page.create': 'Crie um meme.', 'page.holdings': 'O que você possui.', 'page.stats': 'Em números.', 'page.profile': 'Deixe com a sua cara.',
    'action.signin': 'Entrar', 'action.openApp': 'Abrir app', 'action.exploreStocks': 'Explorar ações', 'action.findCircle': 'Encontrar seu círculo',
    'landing.tokenized': 'Ações tokenizadas na Base', 'landing.hero1': 'Seu mundo.', 'landing.hero2': 'Suas ações.', 'landing.heroBody': 'Descubra ações tokenizadas na Base pelos interesses, criadores e comunidades que você acompanha.', 'landing.walletNote': 'Explore primeiro. Conecte uma carteira somente quando for negociar.',
    'landing.everyStock1': 'Cada ação,', 'landing.everyStock2': 'um token na Base.', 'landing.everyStockBody': 'Explore ações tokenizadas como AAPL e NVDA com preços onchain, memecoins da comunidade e pools para prover liquidez.',
    'landing.interests1': 'Interesses diferentes.', 'landing.interests2': 'Curiosidade compartilhada.', 'landing.interestsBody': 'Encontre pessoas em torno do que você gosta. Explore ações, descobertas e comunidades, sempre nos seus termos.',
    'chat.translate': 'Traduzir', 'chat.original': 'Ver original', 'chat.translating': 'Traduzindo…', 'chat.failed': 'Não foi possível traduzir.', 'chat.loading': 'Carregando mensagens…', 'chat.empty': 'Ainda não há mensagens — seja o primeiro.', 'chat.unavailable': 'As mensagens estão indisponíveis.', 'chat.placeholder': 'Mensagem para o círculo…', 'chat.send': 'Enviar',
  },
  zh: {
    'language.label': '语言', 'nav.discover': '发现', 'nav.circles': '圈子', 'nav.launch': '发行', 'nav.holdings': '持仓', 'nav.stats': '数据', 'nav.profile': '我的',
    'page.discover': '发现你的下一只股票。', 'page.groups': '找到同路人。', 'page.launch': '把它带到市场。', 'page.create': '创作一个梗图。', 'page.holdings': '你的持仓。', 'page.stats': '数据一览。', 'page.profile': '打造你的空间。',
    'action.signin': '登录', 'action.openApp': '打开应用', 'action.exploreStocks': '探索股票', 'action.findCircle': '寻找圈子',
    'landing.tokenized': 'Base 上的代币化股票', 'landing.hero1': '你的世界。', 'landing.hero2': '你的股票。', 'landing.heroBody': '通过你关注的兴趣、创作者和社区，发现 Base 上的代币化股票。', 'landing.walletNote': '先自由探索，只在交易时连接钱包。',
    'landing.everyStock1': '每只股票，', 'landing.everyStock2': '都是 Base 上的代币。', 'landing.everyStockBody': '探索 AAPL、NVDA 等代币化股票的实时链上价格、社区配对代币和流动性池。',
    'landing.interests1': '兴趣各异。', 'landing.interests2': '好奇心相通。', 'landing.interestsBody': '围绕你喜爱的事物找到同路人，自主选择分享股票、发现与社区身份。',
    'chat.translate': '翻译', 'chat.original': '查看原文', 'chat.translating': '翻译中…', 'chat.failed': '暂时无法翻译。', 'chat.loading': '正在加载消息…', 'chat.empty': '还没有消息——来发第一条吧。', 'chat.unavailable': '消息暂时不可用。', 'chat.placeholder': '发消息到圈子…', 'chat.send': '发送',
  },
};

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: string, fallback?: string) => string };
const LocaleContext = createContext<LocaleContextValue>({ locale: 'en', setLocale: () => {}, t: (_key, fallback = '') => fallback });

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  useEffect(() => {
    const saved = localStorage.getItem('daybreak_locale');
    const browser = navigator.language.toLowerCase().split('-')[0];
    const next = LOCALES.includes(saved as Locale) ? saved as Locale : LOCALES.includes(browser as Locale) ? browser as Locale : 'en';
    setLocaleState(next);
  }, []);
  const setLocale = (next: Locale) => { setLocaleState(next); try { localStorage.setItem('daybreak_locale', next); } catch {} };
  useEffect(() => { document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale; }, [locale]);
  const value = useMemo(() => ({ locale, setLocale, t: (key: string, fallback = key) => copy[locale][key] ?? copy.en[key] ?? fallback }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLocale();
  return <label className={`db-language-picker${compact ? ' is-compact' : ''}`} title={t('language.label', 'Language')}>
    <Languages size={16} aria-hidden="true" />
    <span className="sr-only">{t('language.label', 'Language')}</span>
    <select aria-label={t('language.label', 'Language')} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
      {LOCALES.map((id) => <option value={id} key={id}>{compact ? (id === 'zh' ? '中文' : id.toUpperCase()) : NAMES[id]}</option>)}
    </select>
  </label>;
}
