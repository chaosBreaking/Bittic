const KEY_SETTING_STORAGE = 'KEY_SETTING_STORAGE'

const retrieveSettings = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY_SETTING_STORAGE)) || {}
  } catch (e) {
    return {}
  }
}
const restoreSettings =
  settings => sessionStorage.setItem(KEY_SETTING_STORAGE, JSON.stringify(settings))

const supportLangs = [
  {
    code: 'en',
    label: 'English',
  },
  {
    code: 'zh-CN',
    label: '简体中文',
  },
]

export default {
  get currentLanguage() {
    const settings = retrieveSettings()
    let { lang } = settings
    if (!lang) {
      settings.lang = navigator.language
      lang = settings.lang
    }
    return lang
  },
  set currentLanguage(lang) {
    const settings = retrieveSettings()
    settings.lang = lang
    restoreSettings(settings)
  },
  supportLangs,
}
