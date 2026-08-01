import highlight from 'highlight.js'
import { config, en_US, XSSPlugin } from 'md-editor-v3'
import screenfull from 'screenfull'
import 'highlight.js/styles/github-dark.css'

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

config({
  editorConfig: {
    languageUserDefined: { ru },
    zIndex: 40000,
  },
  editorExtensions: {
    highlight: { instance: highlight },
    screenfull: { instance: screenfull },
  },
  markdownItPlugins(plugins) {
    return [
      ...plugins,
      {
        type: 'xss',
        plugin: XSSPlugin,
        options: {},
      },
    ]
  },
})
