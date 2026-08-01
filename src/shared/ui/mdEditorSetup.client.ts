import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import { config, en_US, XSSPlugin } from 'md-editor-v3'
import 'highlight.js/styles/github-dark.css'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)

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

/** Shared init promise — concurrent callers must await the same config() completion. */
let ready: Promise<void> | null = null

/**
 * Idempotent md-editor-v3 config; call before first MdEditor/MdPreview mount.
 *
 * CRITICAL: always pass local npm `instance`s for every extension md-editor knows
 * about (highlight, screenfull, katex, mermaid, echarts, prettier). If `instance`
 * is missing, md-editor-v3 loads scripts from unpkg.com — blocked by CSP.
 */
export function ensureMdEditorConfigured(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const [
        { default: screenfull },
        { default: katex },
        { default: mermaid },
        echarts,
        prettier,
        prettierMarkdown,
      ] = await Promise.all([
        import('screenfull'),
        import('katex'),
        import('mermaid'),
        import('echarts'),
        import('prettier/standalone'),
        import('prettier/plugins/markdown'),
      ])
      await import('katex/dist/katex.min.css')

      config({
        editorConfig: {
          languageUserDefined: { ru },
          zIndex: 40000,
        },
        editorExtensions: {
          highlight: {
            instance: hljs,
            // Empty hrefs: keep codeTheme switching from injecting unpkg stylesheets.
            // Styles come from the static import of highlight.js/styles/github-dark.css above.
            css: {
              github: { light: '', dark: '' },
              'atom-one-dark': { light: '', dark: '' },
            },
          },
          screenfull: { instance: screenfull },
          katex: { instance: katex },
          mermaid: { instance: mermaid },
          echarts: { instance: echarts },
          prettier: {
            prettierInstance: prettier,
            parserMarkdownInstance: prettierMarkdown,
          },
        },
        markdownItPlugins(plugins) {
          return [
            ...plugins,
            {
              type: 'xss',
              plugin: XSSPlugin,
              options: {
                stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
              },
            },
          ]
        },
      })
    })().catch((err) => {
      ready = null
      throw err
    })
  }
  return ready
}
