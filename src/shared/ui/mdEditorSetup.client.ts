import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import { config, en_US, XSSPlugin } from 'md-editor-v3'
import screenfull from 'screenfull'
import 'highlight.js/styles/github-dark.css'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('xml', xml)

const ru = {
  ...en_US,
  toolbarTips: {
    bold: 'Жирный',
    underline: 'Подчёркнутый',
    italic: 'Курсив',
    strikeThrough: 'Зачёркнутый',
    title: 'Заголовок',
    sub: 'Подстрочный',
    sup: 'Надстрочный',
    quote: 'Цитата',
    unorderedList: 'Маркированный список',
    orderedList: 'Нумерованный список',
    task: 'Список задач',
    codeRow: 'Строчный код',
    code: 'Блок кода',
    link: 'Ссылка',
    image: 'Изображение',
    table: 'Таблица',
    mermaid: 'Mermaid',
    katex: 'Формула',
    revoke: 'Отменить',
    next: 'Повторить',
    save: 'Сохранить',
    prettier: 'Форматировать',
    pageFullscreen: 'На всю страницу',
    fullscreen: 'Полный экран',
    preview: 'Превью',
    previewOnly: 'Только превью',
    htmlPreview: 'HTML-превью',
    catalog: 'Оглавление',
    github: 'Исходный код',
  },
  titleItem: {
    h1: 'Заголовок 1',
    h2: 'Заголовок 2',
    h3: 'Заголовок 3',
    h4: 'Заголовок 4',
    h5: 'Заголовок 5',
    h6: 'Заголовок 6',
  },
  linkModalTips: {
    linkTitle: 'Добавить ссылку',
    imageTitle: 'Добавить изображение',
    descLabel: 'Описание:',
    descLabelPlaceHolder: 'Введите описание…',
    urlLabel: 'Ссылка:',
    urlLabelPlaceHolder: 'Введите URL…',
    buttonOK: 'ОК',
  },
  copyCode: {
    text: 'Копировать',
    successTips: 'Скопировано',
    failTips: 'Не удалось скопировать',
  },
  footer: {
    markdownTotal: 'Символов',
    scrollAuto: 'Синхр. прокрутка',
  },
}

/** Tight XSS whitelist for guild guide prose (no scriptable embeds). */
const XSS_OPTIONS = {
  whiteList: {
    h1: ['id'],
    h2: ['id'],
    h3: ['id'],
    h4: ['id'],
    h5: ['id'],
    h6: ['id'],
    p: [],
    br: [],
    hr: [],
    strong: [],
    b: [],
    em: [],
    i: [],
    u: [],
    s: [],
    del: [],
    blockquote: [],
    ul: [],
    ol: [],
    li: [],
    code: ['class'],
    pre: ['class'],
    a: ['href', 'title', 'target', 'rel'],
    table: [],
    thead: [],
    tbody: [],
    tr: [],
    th: [],
    td: [],
    input: ['type', 'disabled', 'checked'],
    span: ['class'],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math'],
  css: false,
}

let configured = false

/** Read-only markdown preview — no mermaid/katex/echarts (XSS surface). */
export async function ensureMdEditorConfigured() {
  if (configured) return
  configured = true

  const [prettier, prettierMarkdown] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/markdown'),
  ])

  config({
    editorConfig: {
      languageUserDefined: { ru },
      zIndex: 40000,
    },
    editorExtensions: {
      highlight: { instance: hljs },
      screenfull: { instance: screenfull },
      prettier: {
        prettierInstance: prettier,
        parserMarkdownInstance: prettierMarkdown,
      },
    },
    markdownItPlugins(plugins) {
      // Drop mermaid / katex / echarts markdown-it plugins if present.
      const safe = plugins.filter((p) => {
        const t = String((p as { type?: string }).type || '').toLowerCase()
        return !t.includes('mermaid') && !t.includes('katex') && !t.includes('echarts')
      })
      return [
        ...safe,
        {
          type: 'xss',
          plugin: XSSPlugin,
          options: XSS_OPTIONS,
        },
      ]
    },
  })
}
