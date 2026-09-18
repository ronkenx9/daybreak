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
    'language.label': 'Idioma', 'nav.discover': 'Descubrir', 'nav.circles': 'Círculos', 'nav.conviction': 'Convicción', 'nav.holdings': 'Activos', 'nav.stats': 'Datos', 'nav.profile': 'Tú',
    'page.discover': 'Encuentra tu próxima acción.', 'page.groups': 'Encuentra a tu gente.', 'page.conviction': 'Ideas que vale la pena respaldar.', 'page.create': 'Crea un meme.', 'page.holdings': 'Lo que tienes.', 'page.stats': 'En números.', 'page.profile': 'Hazlo tuyo.',
    'action.signin': 'Iniciar sesión', 'action.openApp': 'Abrir app', 'action.exploreStocks': 'Explorar acciones', 'action.findCircle': 'Encuentra tu círculo',
    'landing.tokenized': 'Acciones en Base y Solana', 'landing.hero1': 'Tu mundo.', 'landing.hero2': 'Tus acciones.', 'landing.heroBody': 'Descubre empresas, compara sus instrumentos onchain compatibles y únete a los círculos de lo que tienes.', 'landing.walletNote': 'Explora sin cartera. Las cotizaciones nunca crean una transacción.',
    'landing.everyStock1': 'Empieza por la empresa.', 'landing.everyStock2': 'Elige el instrumento.', 'landing.everyStockBody': 'Daybreak separa el contexto de la empresa del producto que puedes tener. Compara emisor, red, identidad exacta y cotizaciones antes de elegir una ruta.',
    'landing.interests1': 'Una empresa.', 'landing.interests2': 'Un círculo compartido.', 'landing.interestsBody': 'Una tenencia compatible en Base o Solana puede abrir el mismo círculo. Daybreak guarda una prueba temporal de elegibilidad, nunca tu saldo ni el tamaño de tu posición.',
    'chat.translate': 'Traducir', 'chat.original': 'Ver original', 'chat.translating': 'Traduciendo…', 'chat.failed': 'No se pudo traducir.', 'chat.loading': 'Cargando mensajes…', 'chat.empty': 'Aún no hay mensajes — sé el primero.', 'chat.unavailable': 'Los mensajes no están disponibles ahora.', 'chat.placeholder': 'Escribe al círculo…', 'chat.send': 'Enviar',
  },
  fr: {
    'language.label': 'Langue', 'nav.discover': 'Découvrir', 'nav.circles': 'Cercles', 'nav.conviction': 'Conviction', 'nav.holdings': 'Actifs', 'nav.stats': 'Données', 'nav.profile': 'Vous',
    'page.discover': 'Trouvez votre prochaine action.', 'page.groups': 'Trouvez votre communauté.', 'page.conviction': 'Des idées qui méritent votre soutien.', 'page.create': 'Créez un mème.', 'page.holdings': 'Ce que vous détenez.', 'page.stats': 'En chiffres.', 'page.profile': 'Faites-en votre espace.',
    'action.signin': 'Se connecter', 'action.openApp': 'Ouvrir l’app', 'action.exploreStocks': 'Explorer les actions', 'action.findCircle': 'Trouver votre cercle',
    'landing.tokenized': 'Actions sur Base et Solana', 'landing.hero1': 'Votre monde.', 'landing.hero2': 'Vos actions.', 'landing.heroBody': 'Découvrez des entreprises, comparez leurs instruments onchain pris en charge et rejoignez les cercles liés à vos avoirs.', 'landing.walletNote': 'Explorez sans portefeuille. Une cotation ne crée jamais de transaction.',
    'landing.everyStock1': 'Commencez par l’entreprise.', 'landing.everyStock2': 'Choisissez l’instrument.', 'landing.everyStockBody': 'Daybreak sépare le contexte de l’entreprise du produit détenu. Comparez émetteur, réseau, identité exacte et cotation avant de choisir une route.',
    'landing.interests1': 'Une entreprise.', 'landing.interests2': 'Un cercle partagé.', 'landing.interestsBody': 'Un avoir pris en charge sur Base ou Solana peut ouvrir le même cercle. Daybreak conserve une preuve temporaire d’éligibilité, jamais votre solde ni la taille de votre position.',
    'chat.translate': 'Traduire', 'chat.original': 'Voir l’original', 'chat.translating': 'Traduction…', 'chat.failed': 'Traduction impossible.', 'chat.loading': 'Chargement des messages…', 'chat.empty': 'Aucun message — soyez le premier.', 'chat.unavailable': 'Les messages sont indisponibles.', 'chat.placeholder': 'Écrire au cercle…', 'chat.send': 'Envoyer',
  },
  pt: {
    'language.label': 'Idioma', 'nav.discover': 'Descobrir', 'nav.circles': 'Círculos', 'nav.conviction': 'Convicção', 'nav.holdings': 'Ativos', 'nav.stats': 'Dados', 'nav.profile': 'Você',
    'page.discover': 'Encontre sua próxima ação.', 'page.groups': 'Encontre sua comunidade.', 'page.conviction': 'Ideias que merecem apoio.', 'page.create': 'Crie um meme.', 'page.holdings': 'O que você possui.', 'page.stats': 'Em números.', 'page.profile': 'Deixe com a sua cara.',
    'action.signin': 'Entrar', 'action.openApp': 'Abrir app', 'action.exploreStocks': 'Explorar ações', 'action.findCircle': 'Encontrar seu círculo',
    'landing.tokenized': 'Ações na Base e Solana', 'landing.hero1': 'Seu mundo.', 'landing.hero2': 'Suas ações.', 'landing.heroBody': 'Descubra empresas, compare os instrumentos onchain compatíveis e participe dos círculos do que você possui.', 'landing.walletNote': 'Explore sem carteira. A revisão de cotação nunca cria uma transação.',
    'landing.everyStock1': 'Comece pela empresa.', 'landing.everyStock2': 'Escolha o instrumento.', 'landing.everyStockBody': 'A Daybreak separa o contexto da empresa do produto que você pode possuir. Compare emissor, rede, identidade exata e cotações antes de escolher uma rota.',
    'landing.interests1': 'Uma empresa.', 'landing.interests2': 'Um círculo compartilhado.', 'landing.interestsBody': 'Uma posição compatível na Base ou Solana pode abrir o mesmo círculo. A Daybreak guarda uma prova temporária de elegibilidade, nunca seu saldo ou o tamanho da posição.',
    'chat.translate': 'Traduzir', 'chat.original': 'Ver original', 'chat.translating': 'Traduzindo…', 'chat.failed': 'Não foi possível traduzir.', 'chat.loading': 'Carregando mensagens…', 'chat.empty': 'Ainda não há mensagens — seja o primeiro.', 'chat.unavailable': 'As mensagens estão indisponíveis.', 'chat.placeholder': 'Mensagem para o círculo…', 'chat.send': 'Enviar',
  },
  zh: {
    'language.label': '语言', 'nav.discover': '发现', 'nav.circles': '圈子', 'nav.conviction': '观点市场', 'nav.holdings': '持仓', 'nav.stats': '数据', 'nav.profile': '我的',
    'page.discover': '发现你的下一只股票。', 'page.groups': '找到同路人。', 'page.conviction': '值得支持的观点。', 'page.create': '创作一个梗图。', 'page.holdings': '你的持仓。', 'page.stats': '数据一览。', 'page.profile': '打造你的空间。',
    'action.signin': '登录', 'action.openApp': '打开应用', 'action.exploreStocks': '探索股票', 'action.findCircle': '寻找圈子',
    'landing.tokenized': 'Base 与 Solana 上的股票', 'landing.hero1': '你的世界。', 'landing.hero2': '你的股票。', 'landing.heroBody': '发现公司，比较其支持的链上产品，并加入与你持仓相关的圈子。', 'landing.walletNote': '无需钱包即可探索。报价预览不会创建交易。',
    'landing.everyStock1': '从公司开始。', 'landing.everyStock2': '再选择产品。', 'landing.everyStockBody': 'Daybreak 将公司信息与你可持有的产品明确区分。选择路径前，可比较发行方、网络、准确资产标识和报价。',
    'landing.interests1': '同一家公司。', 'landing.interests2': '同一个圈子。', 'landing.interestsBody': 'Base 或 Solana 上受支持的持仓都可解锁同一公司圈子。Daybreak 只保存短期资格证明，不保存余额或持仓规模。',
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
